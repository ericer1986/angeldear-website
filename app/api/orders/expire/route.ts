import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ExpireBody = {
  orderId?: string;
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
        "Expire Order Auth Error:",
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
      (await request.json()) as ExpireBody;

    const orderId =
      body.orderId;

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
      process.env.BILLPLZ_SECRET_KEY;

    const apiUrl =
      process.env.BILLPLZ_API_URL;

    if (
      !secretKey ||
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

    const billplzAuthorization =
      Buffer.from(
        `${secretKey}:`
      ).toString(
        "base64"
      );

    // =========================================
    // 4. Load trusted order
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
        "Expire Order Lookup Error:",
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
    // 5. Verify ownership
    // =========================================

    if (
      !order.user_id ||
      order.user_id !==
        currentUser.id
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage this order",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================
    // 6. Never expire paid / sold order
    // =========================================

    if (
      order.payment_status ===
      "paid"
    ) {
      return NextResponse.json({
        success: true,
        expired: false,
        reason:
          "ORDER_ALREADY_PAID",
      });
    }

    if (
      order.stock_deducted_at
    ) {
      return NextResponse.json({
        success: true,
        expired: false,
        reason:
          "STOCK_ALREADY_SOLD",
      });
    }

    // =========================================
    // 7. Reservation must exist
    // =========================================

    if (
      !order.stock_reserved_at ||
      !order.stock_reservation_expires_at
    ) {
      return NextResponse.json(
        {
          error:
            "This order does not have a stock reservation",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================
    // 8. Already released
    // =========================================

    if (
      order.stock_released_at
    ) {
      return NextResponse.json({
        success: true,
        expired: true,
        alreadyReleased: true,
      });
    }

    // =========================================
    // 9. Reservation must be expired
    // =========================================

    const expiresAt =
      new Date(
        order.stock_reservation_expires_at
      ).getTime();

    if (
      !Number.isFinite(expiresAt)
    ) {
      console.error(
        "Invalid Reservation Expiry:",
        orderId
      );

      return NextResponse.json(
        {
          error:
            "Invalid reservation expiry",
        },
        {
          status: 500,
        }
      );
    }

    if (
      Date.now() <
      expiresAt
    ) {
      return NextResponse.json({
        success: true,
        expired: false,
        reason:
          "RESERVATION_STILL_ACTIVE",
        expiresAt:
          order.stock_reservation_expires_at,
      });
    }

    // =========================================
    // 10. No Billplz bill exists
    // Safe to expire reservation
    // =========================================

    if (
      !order.billplz_bill_id
    ) {
      const {
        data: expireResult,
        error: expireError,
      } =
        await supabaseAdmin.rpc(
          "expire_order_reservation",
          {
            p_order_id:
              orderId,
          }
        );

      if (expireError) {
        console.error(
          "Atomic Expire Error:",
          expireError
        );

        return NextResponse.json(
          {
            error:
              "Unable to expire stock reservation",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
        expired: true,
        billDeleted: false,
        stockReleased: true,
        expireResult,
      });
    }

    // =========================================
    // 11. Get latest Billplz state
    // =========================================

    const billResponse =
      await fetch(
        `${apiUrl}/bills/${encodeURIComponent(
          order.billplz_bill_id
        )}`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Basic ${billplzAuthorization}`,
          },
          cache:
            "no-store",
        }
      );

    let billData:
      Record<string, unknown>;

    try {
      billData =
        await billResponse.json();
    } catch {
      console.error(
        "Invalid Billplz Get Bill Response"
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

    if (
      !billResponse.ok
    ) {
      console.error(
        "Billplz Get Bill Error:",
        billData
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify payment status with Billplz",
        },
        {
          status: 502,
        }
      );
    }

    const billState =
      typeof billData.state ===
      "string"
        ? billData.state
        : "";

    const billPaid =
      billData.paid === true ||
      billData.paid === "true";

    // =========================================
    // 12. Billplz says PAID
    // NEVER release stock
    // =========================================

    if (
      billPaid ||
      billState === "paid"
    ) {
      /*
        Callback may be delayed.

        Do not release inventory.
        Existing Billplz callback remains
        responsible for marking the order paid
        and converting reservation to sold.
      */

      return NextResponse.json({
        success: true,
        expired: false,
        reason:
          "BILL_ALREADY_PAID",
      });
    }

    // =========================================
    // 13. Already deleted Bill
    // =========================================

    if (
      billState ===
      "deleted"
    ) {
      const {
        data: expireResult,
        error: expireError,
      } =
        await supabaseAdmin.rpc(
          "expire_order_reservation",
          {
            p_order_id:
              orderId,
          }
        );

      if (expireError) {
        console.error(
          "Atomic Expire Deleted Bill Error:",
          expireError
        );

        return NextResponse.json(
          {
            error:
              "Unable to expire stock reservation",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
        expired: true,
        billDeleted: true,
        stockReleased: true,
        expireResult,
      });
    }

    // =========================================
    // 14. Only DUE bill may continue
    // =========================================

    if (
      billState !== "due"
    ) {
      console.error(
        "Unexpected Billplz State:",
        billState
      );

      return NextResponse.json(
        {
          error:
            "Unexpected Billplz bill state",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================
    // 15. Delete DUE Billplz bill FIRST
    // =========================================

    const deleteResponse =
      await fetch(
        `${apiUrl}/bills/${encodeURIComponent(
          order.billplz_bill_id
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              `Basic ${billplzAuthorization}`,
          },
          cache:
            "no-store",
        }
      );

    if (
      !deleteResponse.ok
    ) {
      const deleteText =
        await deleteResponse.text();

      console.error(
        "Billplz Delete Bill Error:",
        deleteText
      );

      /*
        Critical safety rule:
        If Billplz bill was NOT successfully
        deleted, stock stays reserved.
      */

      return NextResponse.json(
        {
          error:
            "Unable to expire Billplz bill",
        },
        {
          status: 502,
        }
      );
    }

    // =========================================
    // 16. Bill deleted successfully
    // Atomically release stock + expire order
    // =========================================

    const {
      data: expireResult,
      error: expireError,
    } =
      await supabaseAdmin.rpc(
        "expire_order_reservation",
        {
          p_order_id:
            orderId,
        }
      );

    if (
      expireError
    ) {
      console.error(
        "Atomic Expire Error:",
        {
          orderId,
          message:
            expireError.message,
        }
      );

      /*
        Bill is already deleted.

        Returning 500 is correct because
        the operation needs to be retried.
        The RPC is idempotent.
      */

      return NextResponse.json(
        {
          error:
            "Bill was expired but stock reservation could not be released",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================
    // 17. Success
    // =========================================

    return NextResponse.json({
      success: true,
      expired: true,
      billDeleted: true,
      stockReleased: true,
      expireResult,
    });
  } catch (error) {
    console.error(
      "Expire Order Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while expiring the order",
      },
      {
        status: 500,
      }
    );
  }
}