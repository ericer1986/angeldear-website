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
    .filter(([key]) => key.toLowerCase() !== "x_signature")
    .map(([key, value]) => `${key}${value}`)
    .sort((a, b) => {
      const lowerA = a.toLowerCase();
      const lowerB = b.toLowerCase();

      if (lowerA < lowerB) return -1;
      if (lowerA > lowerB) return 1;

      return 0;
    })
    .join("|");

  const generatedSignature = crypto
    .createHmac("sha256", xSignatureKey)
    .update(sourceString)
    .digest("hex");

  const receivedBuffer = Buffer.from(
    receivedSignature.toLowerCase(),
    "utf8"
  );

  const generatedBuffer = Buffer.from(
    generatedSignature.toLowerCase(),
    "utf8"
  );

  if (receivedBuffer.length !== generatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    generatedBuffer
  );
}

export async function POST(request: Request) {
  try {
    /*
      Read Billplz callback
    */
    const formData = await request.formData();

    const params: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      params[key] = String(value);
    }

    /*
      Do not log secret signatures
    */
    console.log("Billplz callback received:", {
      id: params.id,
      paid: params.paid,
      state: params.state,
      paid_at: params.paid_at,
    });

    /*
      Get X Signature
    */
    const receivedSignature = params.x_signature;

    const xSignatureKey =
      process.env.BILLPLZ_X_SIGNATURE_KEY;

    if (!xSignatureKey) {
      console.error(
        "BILLPLZ_X_SIGNATURE_KEY is missing"
      );

      return NextResponse.json(
        {
          error: "X Signature configuration missing",
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
          error: "Missing X Signature",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Verify callback authenticity
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
          error: "Invalid X Signature",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "Billplz X Signature verified"
    );

    /*
      Payment information
    */
    const billId = params.id;
    const paid = params.paid;
    const state = params.state;
    const paidAt = params.paid_at;

    if (!billId) {
      return NextResponse.json(
        {
          error: "Missing Bill ID",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Successful Billplz payment
    */
    const isPaid =
      paid === "true" &&
      state === "paid";

    /*
      Find order using stored Billplz Bill ID
    */
    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        payment_status,
        billplz_bill_id
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
          error: "Unable to find order",
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
          error: "Order not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
      Successful payment
    */
    if (isPaid) {
      if (order.payment_status !== "paid") {
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
          error: updateError,
        } = await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "paid",
            paid_at: paymentDate,
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

        console.log(
          `Order ${order.id} marked as PAID`
        );
      } else {
        console.log(
          `Order ${order.id} was already PAID`
        );
      }
    } else {
      console.log(
        `Bill ${billId} is not paid. paid=${paid}, state=${state}`
      );
    }

    /*
      Important:
      Return HTTP 200 after successful processing
    */
    return NextResponse.json({
      success: true,
      orderId: order.id,
      billId,
      paymentStatus:
        isPaid ? "paid" : "pending",
    });
  } catch (error) {
    console.error(
      "Billplz Callback Error:",
      error
    );

    return NextResponse.json(
      {
        error: "Callback processing failed",
      },
      {
        status: 500,
      }
    );
  }
}