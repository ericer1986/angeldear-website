import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    // =========================================
    // 1. Verify logged-in customer
    // =========================================

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.replace(
        "Bearer ",
        ""
      );

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData.user
    ) {
      console.error(
        "Payment Auth Error:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Invalid or expired login session",
        },
        {
          status: 401,
        }
      );
    }

    const currentUser =
      userData.user;

    // =========================================
    // 2. Read request
    // =========================================

    const body =
      await request.json();

    const { orderId } =
      body;

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

    // =========================================
    // 3. Billplz configuration
    // =========================================

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
        "Billplz environment variables are missing"
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

    // =========================================
    // 4. Load trusted order
    // =========================================

    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        user_id,
        customer_name,
        email,
        phone,
        total,
        payment_status,
        billplz_bill_id
      `)
      .eq(
        "id",
        orderId
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
            "Unable to verify order",
        },
        {
          status: 500,
        }
      );
    }

    if (!order) {
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

    // =========================================
    // 5. Verify order ownership
    // =========================================

    if (
      !order.user_id ||
      order.user_id !==
        currentUser.id
    ) {
      console.warn(
        "Unauthorized Billplz order access:",
        {
          orderId,
          userId:
            currentUser.id,
        }
      );

      return NextResponse.json(
        {
          error:
            "You are not authorized to pay this order",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================
    // 6. Prevent duplicate / paid bills
    // =========================================

    if (
      order.payment_status ===
      "paid"
    ) {
      return NextResponse.json(
        {
          error:
            "This order has already been paid",
        },
        {
          status: 409,
        }
      );
    }

    if (
      order.billplz_bill_id
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

    // =========================================
    // 7. Validate trusted order information
    // =========================================

    const orderTotal =
      Number(order.total);

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

    if (
      !order.customer_name
    ) {
      return NextResponse.json(
        {
          error:
            "Customer name is missing",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !order.email &&
      !order.phone
    ) {
      return NextResponse.json(
        {
          error:
            "Customer email or phone is required",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // 8. Build Billplz bill
    // =========================================

    const amountInCents =
      Math.round(
        orderTotal * 100
      );

    const origin =
      new URL(
        request.url
      ).origin;

    const callbackUrl =
      `${origin}/api/billplz/callback`;

    const redirectUrl =
      `${origin}/order-success?order=${orderId}`;

    const formData =
      new URLSearchParams();

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

    const billplzAuthorization =
      Buffer.from(
        `${secretKey}:`
      ).toString(
        "base64"
      );

    // =========================================
    // 9. Create Billplz bill
    // =========================================

    const response =
      await fetch(
        `${apiUrl}/bills`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Basic ${billplzAuthorization}`,
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

    if (
      !data.id ||
      !data.url
    ) {
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

    // =========================================
    // 10. Save Billplz bill ID
    // =========================================

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        billplz_bill_id:
          data.id,
      })
      .eq(
        "id",
        orderId
      )
      .eq(
        "user_id",
        currentUser.id
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

    // =========================================
    // 11. Success
    // =========================================

    return NextResponse.json({
      success: true,
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