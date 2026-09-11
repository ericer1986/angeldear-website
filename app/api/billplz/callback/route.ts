import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function verifyBillplzSignature(
  params: Record<string, string>,
  receivedSignature: string,
  xSignatureKey: string
) {
  /*
    Billplz X Signature format:

    1. Remove x_signature
    2. Sort keys ascending, case-insensitive
    3. Join key + value
    4. Separate each pair using |
    5. HMAC-SHA256
  */

  const sourceString = Object.entries(params)
    .filter(([key]) => key !== "x_signature")
    .sort(([a], [b]) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )
    .map(([key, value]) => `${key}${value}`)
    .join("|");

  const generatedSignature = crypto
    .createHmac("sha256", xSignatureKey)
    .update(sourceString)
    .digest("hex");

  /*
    timingSafeEqual avoids timing attacks
  */
  const receivedBuffer = Buffer.from(
    receivedSignature,
    "utf8"
  );

  const generatedBuffer = Buffer.from(
    generatedSignature,
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
    /*
      1. Read Billplz callback body
    */
    const formData =
      await request.formData();

    const params: Record<
      string,
      string
    > = {};

    for (
      const [key, value]
      of formData.entries()
    ) {
      params[key] =
        String(value);
    }

    console.log(
      "Billplz Callback:",
      params
    );

    /*
      2. Get X Signature
    */
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

    /*
      3. Verify signature
    */
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

    /*
      4. Read payment information
    */
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

    /*
      Billplz sends paid=true
      when payment is successful
    */
    const isPaid =
      paid === "true" &&
      state === "paid";

    /*
      5. Find matching Supabase order
    */
    const {
      data: order,
      error: orderError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(
          "id, payment_status, billplz_bill_id"
        )
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

    /*
      6. Update order if payment succeeded
    */
    if (isPaid) {
      /*
        Prevent unnecessary repeated update
      */
      if (
        order.payment_status !==
        "paid"
      ) {
        const {
          error: updateError,
        } =
          await supabaseAdmin
            .from("orders")
            .update({
              payment_status:
                "paid",

              paid_at:
                paidAt ||
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              order.id
            );

        if (updateError) {
          console.error(
            "Payment Update Error:",
            updateError
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
      }

      console.log(
        `Order ${order.id} marked as PAID`
      );
    } else {
      console.log(
        `Bill ${billId} is not paid. State: ${state}`
      );
    }

    /*
      7. Return HTTP 200

      Billplz expects a successful
      response so it does not retry.
    */
    return NextResponse.json({
      success:
        true,

      orderId:
        order.id,

      billId,

      paymentStatus:
        isPaid
          ? "paid"
          : "pending",
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