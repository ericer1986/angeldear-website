import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function verifyBillplzSignature(
  params: Record<string, string>,
  receivedSignature: string,
  xSignatureKey: string
) {
  /*
    Billplz X Signature:

    1. Remove x_signature
    2. Construct key + value strings
    3. Sort the constructed strings ascending,
       case-insensitive
    4. Join using |
    5. HMAC-SHA256 with X Signature Key
  */

  const sourceString = Object.entries(params)
    .filter(
      ([key]) =>
        key.toLowerCase() !== "x_signature"
    )
    .map(
      ([key, value]) =>
        `${key}${value}`
    )
    .sort((a, b) => {
      const lowerA =
        a.toLowerCase();

      const lowerB =
        b.toLowerCase();

      if (lowerA < lowerB) {
        return -1;
      }

      if (lowerA > lowerB) {
        return 1;
      }

      return 0;
    })
    .join("|");

  const generatedSignature = crypto
    .createHmac(
      "sha256",
      xSignatureKey
    )
    .update(sourceString)
    .digest("hex");

  const receivedBuffer =
    Buffer.from(
      receivedSignature.toLowerCase(),
      "utf8"
    );

  const generatedBuffer =
    Buffer.from(
      generatedSignature.toLowerCase(),
      "utf8"
    );

  if (
    receivedBuffer.length !==
    generatedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    generatedBuffer
  );
}

export async function POST(
  request: Request
) {
  try {
    // ========================================
    // 1. Read Billplz callback
    // ========================================

    const formData =
      await request.formData();

    const params:
      Record<string, string> = {};

    for (
      const [key, value]
      of formData.entries()
    ) {
      params[key] =
        String(value);
    }

    /*
      Do not log x_signature or secrets.
    */
    console.log(
      "Billplz callback received:",
      {
        id: params.id,
        paid: params.paid,
        state: params.state,
        paid_at:
          params.paid_at,
      }
    );

    // ========================================
    // 2. Verify Billplz X Signature
    // ========================================

    const receivedSignature =
      params.x_signature;

    const xSignatureKey =
      process.env
        .BILLPLZ_X_SIGNATURE_KEY;

    if (!xSignatureKey) {
      console.error(
        "BILLPLZ_X_SIGNATURE_KEY is missing"
      );

      return NextResponse.json(
        {
          error:
            "X Signature configuration missing",
        },
        {
          status: 500,
        }
      );
    }

    if (!receivedSignature) {
      console.error(
        "Billplz callback has no x_signature"
      );

      return NextResponse.json(
        {
          error:
            "Missing X Signature",
        },
        {
          status: 400,
        }
      );
    }

    const isValidSignature =
      verifyBillplzSignature(
        params,
        receivedSignature,
        xSignatureKey
      );

    if (!isValidSignature) {
      console.error(
        "Invalid Billplz X Signature"
      );

      return NextResponse.json(
        {
          error:
            "Invalid X Signature",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "Billplz X Signature verified"
    );

    // ========================================
    // 3. Read payment information
    // ========================================

    const billId =
      params.id;

    const paid =
      params.paid;

    const state =
      params.state;

    const paidAt =
      params.paid_at;

    if (!billId) {
      return NextResponse.json(
        {
          error:
            "Missing Bill ID",
        },
        {
          status: 400,
        }
      );
    }

    const isPaid =
      paid === "true" &&
      state === "paid";

    // ========================================
    // 4. Find Angel Dear order
    // ========================================

    const {
      data: order,
      error: orderError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(`
          id,
          payment_status,
          billplz_bill_id,
          stock_deducted_at
        `)
        .eq(
          "billplz_bill_id",
          billId
        )
        .maybeSingle();

    if (orderError) {
      console.error(
        "Order Lookup Error:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Unable to find order",
        },
        {
          status: 500,
        }
      );
    }

    if (!order) {
      console.error(
        "No order found for Billplz Bill:",
        billId
      );

      return NextResponse.json(
        {
          error:
            "Order not found",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================
    // 5. Ignore unpaid callbacks
    // ========================================

    if (!isPaid) {
      console.log(
        `Bill ${billId} is not paid. paid=${paid}, state=${state}`
      );

      return NextResponse.json({
        success: true,
        orderId:
          order.id,
        billId,
        paymentStatus:
          order.payment_status,
        stockDeducted:
          Boolean(
            order.stock_deducted_at
          ),
      });
    }

    // ========================================
    // 6. Mark payment as PAID
    // ========================================

    if (
      order.payment_status !==
      "paid"
    ) {
      let paymentDate =
        new Date().toISOString();

      if (paidAt) {
        const parsedDate =
          new Date(paidAt);

        if (
          !Number.isNaN(
            parsedDate.getTime()
          )
        ) {
          paymentDate =
            parsedDate.toISOString();
        }
      }

      const {
        error:
          paymentUpdateError,
      } =
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status:
              "paid",
            paid_at:
              paymentDate,
          })
          .eq(
            "id",
            order.id
          );

      if (
        paymentUpdateError
      ) {
        console.error(
          "Payment Update Error:",
          paymentUpdateError
        );

        return NextResponse.json(
          {
            error:
              "Unable to update payment status",
          },
          {
            status: 500,
          }
        );
      }

      console.log(
        `Order ${order.id} marked as PAID`
      );
    } else {
      console.log(
        `Order ${order.id} was already PAID`
      );
    }

    // ========================================
    // 7. Atomic stock deduction
    //
    // PostgreSQL function handles:
    //
    // - order locking
    // - duplicate callback protection
    // - product locking
    // - stock validation
    // - multi-product deduction
    // - transaction rollback
    // - stock_deducted_at
    // ========================================

    const {
      data: stockResult,
      error: stockError,
    } =
      await supabaseAdmin.rpc(
        "deduct_order_stock",
        {
          p_order_id:
            order.id,
        }
      );

    if (stockError) {
      console.error(
        "Atomic Stock Deduction Error:",
        {
          orderId:
            order.id,
          message:
            stockError.message,
          code:
            stockError.code,
          details:
            stockError.details,
          hint:
            stockError.hint,
        }
      );

      /*
        Payment has already succeeded.

        Return HTTP 500 so Billplz can retry
        the callback. Because the RPC is
        transactional and idempotent, retrying
        will not double-deduct completed stock.
      */
      return NextResponse.json(
        {
          error:
            "Payment recorded but stock processing failed",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "Atomic stock processing completed:",
      {
        orderId:
          order.id,
        alreadyDeducted:
          stockResult
            ?.already_deducted ??
          false,
      }
    );

    // ========================================
    // 8. Callback completed successfully
    // ========================================

    return NextResponse.json({
      success: true,
      orderId:
        order.id,
      billId,
      paymentStatus:
        "paid",
      stockDeducted:
        true,
      alreadyDeducted:
        stockResult
          ?.already_deducted ??
        false,
    });
  } catch (error) {
    console.error(
      "Billplz Callback Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Callback processing failed",
      },
      {
        status: 500,
      }
    );
  }
}