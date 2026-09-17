import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CreateBillBody = {
  orderId?: string;
};

type BillplzResponse = {
  id?: string;
  url?: string;
  state?: string;
  amount?: number;
  paid?: boolean;
  error?: unknown;
};

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
        "Create Bill Auth Error:",
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
      (await request.json()) as CreateBillBody;

    const orderId =
      body.orderId;

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

    // =========================================
    // 3. Billplz configuration
    // =========================================

    const secretKey =
      process.env.BILLPLZ_SECRET_KEY;

    const collectionId =
      process.env.BILLPLZ_COLLECTION_ID;

    const apiUrl =
      process.env.BILLPLZ_API_URL;

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
    // 4. Load trusted order from database
    // =========================================

    const {
      data: order,
      error: orderError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(`
          id,
          user_id,
          customer_name,
          email,
          phone,
          total,
          payment_status,
          billplz_bill_id,
          stock_reserved_at,
          stock_reservation_expires_at,
          stock_released_at,
          stock_deducted_at
        `)
        .eq(
          "id",
          orderId
        )
        .maybeSingle();

    if (orderError) {
      console.error(
        "Create Bill Order Lookup Error:",
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
          error: "Order not found",
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
      order.user_id !== currentUser.id
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to pay for this order",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================
    // 6. Order must not already be paid
    // =========================================

    if (
      order.payment_status === "paid"
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

    // =========================================
    // 7. Block expired / failed / refunded
    // =========================================

    if (
      order.payment_status === "expired" ||
      order.payment_status === "failed" ||
      order.payment_status === "refunded"
    ) {
      return NextResponse.json(
        {
          error:
            "This order is no longer available for payment",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================
    // 8. Reservation must exist
    // =========================================

    if (
      !order.stock_reserved_at ||
      !order.stock_reservation_expires_at
    ) {
      return NextResponse.json(
        {
          error:
            "This order does not have an active stock reservation",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================
    // 9. Released stock cannot be paid
    // =========================================

    if (order.stock_released_at) {
      return NextResponse.json(
        {
          error:
            "This order reservation has already expired",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================
    // 10. Sold stock means payment completed
    // =========================================

    if (order.stock_deducted_at) {
      return NextResponse.json(
        {
          error:
            "This order has already been completed",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================
    // 11. Reservation must still be active
    // =========================================

    const reservationExpiresAt =
      new Date(
        order.stock_reservation_expires_at
      ).getTime();

    if (
      !Number.isFinite(
        reservationExpiresAt
      )
    ) {
      console.error(
        "Invalid reservation expiry:",
        orderId
      );

      return NextResponse.json(
        {
          error:
            "Invalid stock reservation",
        },
        {
          status: 500,
        }
      );
    }

    if (
      Date.now() >=
      reservationExpiresAt
    ) {
      return NextResponse.json(
        {
          error:
            "Your stock reservation has expired. Please place a new order.",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================
    // 12. Prevent duplicate Billplz bills
    // =========================================

    if (order.billplz_bill_id) {
      return NextResponse.json(
        {
          error:
            "A payment bill already exists for this order",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================
    // 13. Validate trusted order data
    // =========================================

    const total =
      Number(order.total);

    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {
      console.error(
        "Invalid order total:",
        {
          orderId,
          total:
            order.total,
        }
      );

      return NextResponse.json(
        {
          error:
            "Invalid order total",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !order.customer_name ||
      !order.email ||
      !order.phone
    ) {
      return NextResponse.json(
        {
          error:
            "Customer information is incomplete",
        },
        {
          status: 400,
        }
      );
    }

    // Billplz uses cents.
    const amount =
      Math.round(
        total * 100
      );

    // =========================================
    // 14. Build callback + redirect URLs
    // =========================================

    const requestUrl =
      new URL(request.url);

    const origin =
      requestUrl.origin;

    const callbackUrl =
      `${origin}/api/billplz/callback`;

    const redirectUrl =
      `${origin}/order-success?order=${encodeURIComponent(
        orderId
      )}`;

    // =========================================
    // 15. Create Billplz Bill
    // =========================================

    const billResponse =
      await fetch(
        `${apiUrl}/bills`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Basic ${Buffer.from(
                `${secretKey}:`
              ).toString("base64")}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            collection_id:
              collectionId,

            email:
              order.email,

            mobile:
              order.phone,

            name:
              order.customer_name,

            amount,

            callback_url:
              callbackUrl,

            redirect_url:
              redirectUrl,

            description:
              `Angel Dear Order ${orderId}`,
          }),

          cache: "no-store",
        }
      );

    let billData:
      BillplzResponse;

    try {
      billData =
        (await billResponse.json()) as BillplzResponse;
    } catch {
      console.error(
        "Invalid Billplz Create Bill Response"
      );

      return NextResponse.json(
        {
          error:
            "Invalid response from Billplz",
        },
        {
          status: 502,
        }
      );
    }

    if (!billResponse.ok) {
      console.error(
        "Billplz Create Bill Error:",
        {
          status:
            billResponse.status,
          error:
            billData.error,
        }
      );

      return NextResponse.json(
        {
          error:
            "Unable to create Billplz payment bill",
        },
        {
          status: 502,
        }
      );
    }

    // =========================================
    // 16. Billplz must return ID + URL
    // =========================================

    if (
      !billData.id ||
      !billData.url
    ) {
      console.error(
        "Billplz response missing bill information:",
        {
          hasId:
            Boolean(
              billData.id
            ),
          hasUrl:
            Boolean(
              billData.url
            ),
          state:
            billData.state,
        }
      );

      return NextResponse.json(
        {
          error:
            "Billplz did not return a valid payment link",
        },
        {
          status: 502,
        }
      );
    }

    // =========================================
    // 17. Save Billplz Bill ID
    // =========================================

    const {
      error: saveBillError,
    } =
      await supabaseAdmin
        .from("orders")
        .update({
          billplz_bill_id:
            billData.id,
        })
        .eq(
          "id",
          orderId
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .is(
          "billplz_bill_id",
          null
        );

    if (saveBillError) {
      console.error(
        "Save Billplz Bill ID Error:",
        saveBillError
      );

      return NextResponse.json(
        {
          error:
            "Payment bill was created but could not be linked to the order",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================
    // 18. Return payment URL to Checkout
    // =========================================

    return NextResponse.json({
      success: true,

      orderId,

      billId:
        billData.id,

      billUrl:
        billData.url,

      state:
        billData.state,

      amount:
        billData.amount ??
        amount,
    });
  } catch (error) {
    console.error(
      "Create Bill Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating the payment bill",
      },
      {
        status: 500,
      }
    );
  }
}