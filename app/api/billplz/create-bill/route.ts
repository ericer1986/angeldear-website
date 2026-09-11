import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      name,
      email,
      phone,
      amount,
      orderId,
    } = body;

    /*
      Validate customer
    */
    if (!name) {
      return NextResponse.json(
        {
          error:
            "Customer name is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        {
          error:
            "Email or phone is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Validate amount
    */
    if (
      !amount ||
      Number(amount) <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Valid amount is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Order ID is now required
      because every Billplz bill
      must belong to a Supabase order
    */
    if (!orderId) {
      return NextResponse.json(
        {
          error:
            "Order ID is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Environment Variables
    */
    const secretKey =
      process.env
        .BILLPLZ_SECRET_KEY;

    const collectionId =
      process.env
        .BILLPLZ_COLLECTION_ID;

    const apiUrl =
      process.env
        .BILLPLZ_API_URL;

    if (
      !secretKey ||
      !collectionId ||
      !apiUrl
    ) {
      console.error(
        "Billplz configuration is incomplete"
      );

      return NextResponse.json(
        {
          error:
            "Billplz configuration is incomplete",
        },
        {
          status: 500,
        }
      );
    }

    /*
      Verify order exists first
    */
    const {
      data: existingOrder,
      error: orderLookupError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(
          "id, total, payment_status, billplz_bill_id"
        )
        .eq("id", orderId)
        .maybeSingle();

    if (orderLookupError) {
      console.error(
        "Order Lookup Error:",
        orderLookupError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify order",
        },
        {
          status: 500,
        }
      );
    }

    if (!existingOrder) {
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
      Prevent creating another bill
      if this order already has one
    */
    if (
      existingOrder.billplz_bill_id
    ) {
      return NextResponse.json(
        {
          error:
            "This order already has a Billplz bill",
        },
        {
          status: 409,
        }
      );
    }

    /*
      Important security check:

      Do not trust total received
      from browser.

      Use total stored in Supabase.
    */
    const orderTotal =
      Number(
        existingOrder.total
      );

    if (
      !Number.isFinite(
        orderTotal
      ) ||
      orderTotal <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid order total",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Billplz amount uses cents.

      RM159.90
      becomes
      15990
    */
    const amountInCents =
      Math.round(
        orderTotal * 100
      );

    /*
      Prepare Billplz Form
    */
    const formData =
      new URLSearchParams();

    formData.append(
      "collection_id",
      collectionId
    );

    formData.append(
      "name",
      name
    );

    if (email) {
      formData.append(
        "email",
        email
      );
    }

    if (phone) {
      formData.append(
        "mobile",
        phone
      );
    }

    formData.append(
      "amount",
      amountInCents.toString()
    );

    formData.append(
      "description",
      `Angel Dear Order ${orderId}`
    );

    /*
      Callback URL

      Localhost cannot receive
      Billplz server callback.

      We will replace this after
      deploying to Vercel.
    */
    formData.append(
      "callback_url",
      "http://localhost:3000/api/billplz/callback"
    );

    /*
      Customer browser return URL
    */
    formData.append(
      "redirect_url",
      `http://localhost:3000/order-success?order=${orderId}`
    );

    /*
      Billplz Basic Authentication
    */
    const authorization =
      Buffer.from(
        `${secretKey}:`
      ).toString("base64");

    /*
      Create Billplz Bill
    */
    const response =
      await fetch(
        `${apiUrl}/bills`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Basic ${authorization}`,

            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body:
            formData.toString(),

          cache:
            "no-store",
        }
      );

    const data =
      await response.json();

    /*
      Billplz Error
    */
    if (!response.ok) {
      console.error(
        "Billplz API Error:",
        data
      );

      return NextResponse.json(
        {
          error:
            "Failed to create Billplz bill",

          details:
            data,
        },
        {
          status:
            response.status,
        }
      );
    }

    /*
      Make sure Billplz returned ID
    */
    if (!data.id) {
      console.error(
        "Billplz did not return bill ID:",
        data
      );

      return NextResponse.json(
        {
          error:
            "Billplz bill ID was not returned",
        },
        {
          status: 500,
        }
      );
    }

    /*
      Save Billplz Bill ID
      back into Supabase order
    */
    const {
      error: updateError,
    } =
      await supabaseAdmin
        .from("orders")
        .update({
          billplz_bill_id:
            data.id,
        })
        .eq(
          "id",
          orderId
        );

    if (updateError) {
      console.error(
        "Save Billplz Bill ID Error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Bill was created but could not be linked to the order",
        },
        {
          status: 500,
        }
      );
    }

    /*
      Success
    */
    return NextResponse.json({
      success:
        true,

      orderId,

      billId:
        data.id,

      billUrl:
        data.url,

      state:
        data.state,

      amount:
        data.amount,
    });
  } catch (error) {
    console.error(
      "Create Bill Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating the bill",
      },
      {
        status: 500,
      }
    );
  }
}