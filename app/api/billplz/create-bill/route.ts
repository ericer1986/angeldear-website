import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        {
          error: "Order ID is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Billplz environment variables
    */
    const secretKey = process.env.BILLPLZ_SECRET_KEY;
    const collectionId = process.env.BILLPLZ_COLLECTION_ID;
    const apiUrl = process.env.BILLPLZ_API_URL;

    if (!secretKey || !collectionId || !apiUrl) {
      console.error("Billplz environment variables are missing");

      return NextResponse.json(
        {
          error: "Billplz configuration is incomplete",
        },
        {
          status: 500,
        }
      );
    }

    /*
      Load trusted order information
      directly from Supabase.
    */
    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        customer_name,
        email,
        phone,
        total,
        payment_status,
        billplz_bill_id
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Order Lookup Error:", orderError);

      return NextResponse.json(
        {
          error: "Unable to verify order",
        },
        {
          status: 500,
        }
      );
    }

    if (!order) {
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
      Do not create another payment
      for an already paid order.
    */
    if (order.payment_status === "paid") {
      return NextResponse.json(
        {
          error: "This order has already been paid",
        },
        {
          status: 409,
        }
      );
    }

    /*
      Prevent duplicate Billplz bills.
    */
    if (order.billplz_bill_id) {
      return NextResponse.json(
        {
          error: "This order already has a Billplz bill",
        },
        {
          status: 409,
        }
      );
    }

    /*
      Validate trusted order amount.
    */
    const orderTotal = Number(order.total);

    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
      return NextResponse.json(
        {
          error: "Invalid order total",
        },
        {
          status: 400,
        }
      );
    }

    if (!order.customer_name) {
      return NextResponse.json(
        {
          error: "Customer name is missing",
        },
        {
          status: 400,
        }
      );
    }

    if (!order.email && !order.phone) {
      return NextResponse.json(
        {
          error: "Customer email or phone is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
      RM159.90 → 15990 cents
    */
    const amountInCents = Math.round(orderTotal * 100);

    /*
      Automatically detect current website URL.

      Local:
      http://localhost:3000

      Vercel:
      https://angeldear-website.vercel.app

      Future custom domain:
      automatically uses that domain.
    */
    const origin = new URL(request.url).origin;

    const callbackUrl =
      `${origin}/api/billplz/callback`;

    const redirectUrl =
      `${origin}/order-success?order=${orderId}`;

    /*
      Prepare Billplz request.
    */
    const formData = new URLSearchParams();

    formData.append(
      "collection_id",
      collectionId
    );

    formData.append(
      "name",
      order.customer_name
    );

    if (order.email) {
      formData.append(
        "email",
        order.email
      );
    }

    if (order.phone) {
      formData.append(
        "mobile",
        order.phone
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

    formData.append(
      "callback_url",
      callbackUrl
    );

    formData.append(
      "redirect_url",
      redirectUrl
    );

    /*
      Billplz Basic Authentication
    */
    const authorization = Buffer.from(
      `${secretKey}:`
    ).toString("base64");

    /*
      Create Billplz bill
    */
    const response = await fetch(
      `${apiUrl}/bills`,
      {
        method: "POST",

        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: formData.toString(),

        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Billplz API Error:",
        data
      );

      return NextResponse.json(
        {
          error:
            "Failed to create Billplz bill",

          details: data,
        },
        {
          status: response.status,
        }
      );
    }

    if (!data.id || !data.url) {
      console.error(
        "Invalid Billplz Response:",
        data
      );

      return NextResponse.json(
        {
          error:
            "Billplz did not return a valid bill",
        },
        {
          status: 500,
        }
      );
    }

    /*
      Save Billplz Bill ID
      into the matching order.
    */
    const {
      error: updateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        billplz_bill_id: data.id,
      })
      .eq("id", orderId);

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
      success: true,
      orderId,
      billId: data.id,
      billUrl: data.url,
      state: data.state,
      amount: data.amount,
      callbackUrl,
      redirectUrl,
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