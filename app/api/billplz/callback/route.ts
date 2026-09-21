import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PaymentResult = {
  success?: boolean;
  already_completed?: boolean;
  used_reservation?: boolean;
  recovered_stock?: boolean;
  requires_manual_review?: boolean;
  reason?: string;
};

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

    IMPORTANT:
    This signature logic is already tested
    and must not be changed.
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
      Never log x_signature or secrets.
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
          stock_reserved_at,
          stock_released_at,
          stock_deducted_at,
          payment_exception,
          payment_exception_at
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
        paymentException:
          order.payment_exception ??
          null,
      });
    }

    // ========================================
    // 6. Normalize Billplz payment time
    // ========================================

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

    // ========================================
    // 7. ATOMIC PAYMENT PROCESSING
    //
    // PostgreSQL handles:
    //
    // - order row locking
    // - normal reserved payment
    // - duplicate callback protection
    // - legacy stock deduction
    // - paid-after-release recovery
    // - inventory re-acquisition
    // - manual review exception
    //
    // All critical database changes happen
    // inside complete_paid_order().
    // ========================================

    const {
      data: rawPaymentResult,
      error: paymentError,
    } =
      await supabaseAdmin.rpc(
        "complete_paid_order",
        {
          p_order_id:
            order.id,
          p_paid_at:
            paymentDate,
        }
      );

    if (paymentError) {
      console.error(
        "Atomic Payment Processing Error:",
        {
          orderId:
            order.id,
          billId,
          message:
            paymentError.message,
          code:
            paymentError.code,
          details:
            paymentError.details,
          hint:
            paymentError.hint,
        }
      );

      /*
        An unexpected database / processing
        failure occurred.

        Return HTTP 500 so Billplz may retry.

        complete_paid_order() is designed
        to be transactional and idempotent.
      */

      return NextResponse.json(
        {
          error:
            "Payment received but order processing failed",
        },
        {
          status: 500,
        }
      );
    }

    const paymentResult =
      (rawPaymentResult ??
        {}) as PaymentResult;

    // ========================================
    // 8. Manual review case
    //
    // Payment is real, but inventory could
    // not safely be completed automatically.
    //
    // IMPORTANT:
    // Return HTTP 200.
    //
    // Retrying the Billplz callback will not
    // magically restore inventory and could
    // create unnecessary repeated callbacks.
    // ========================================

    if (
      paymentResult
        .requires_manual_review
    ) {
      console.error(
        "PAYMENT REQUIRES MANUAL REVIEW:",
        {
          orderId:
            order.id,
          billId,
          reason:
            paymentResult.reason ??
            "UNKNOWN_PAYMENT_EXCEPTION",
        }
      );

      return NextResponse.json(
        {
          success: true,
          processed: false,
          requiresManualReview:
            true,
          orderId:
            order.id,
          billId,
          paymentReceived:
            true,
          paymentStatus:
            "exception",
          stockDeducted:
            false,
          paymentException:
            paymentResult.reason ??
            "UNKNOWN_PAYMENT_EXCEPTION",
        },
        {
          status: 200,
        }
      );
    }

    // ========================================
    // 9. RPC returned an unexpected result
    // ========================================

    if (
      paymentResult.success !==
      true
    ) {
      console.error(
        "Unexpected Atomic Payment Result:",
        {
          orderId:
            order.id,
          billId,
          paymentResult,
        }
      );

      return NextResponse.json(
        {
          error:
            "Payment received but order processing returned an unexpected result",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================
    // 10. Payment successfully completed
    // ========================================

    console.log(
      "Atomic payment processing completed:",
      {
        orderId:
          order.id,
        billId,
        alreadyCompleted:
          paymentResult
            .already_completed ??
          false,
        usedReservation:
          paymentResult
            .used_reservation ??
          false,
        recoveredStock:
          paymentResult
            .recovered_stock ??
          false,
      }
    );

    // ========================================
    // 11. Callback completed successfully
    // ========================================

    return NextResponse.json({
      success: true,
      processed: true,
      orderId:
        order.id,
      billId,
      paymentStatus:
        "paid",
      stockDeducted:
        true,
      alreadyCompleted:
        paymentResult
          .already_completed ??
        false,
      usedReservation:
        paymentResult
          .used_reservation ??
        false,
      recoveredStock:
        paymentResult
          .recovered_stock ??
        false,
      requiresManualReview:
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