import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type RequestBody = {
  orderId?: string;
  confirmation?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    /*
     * 1. Verify logged-in user
     */
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken = authorization.replace(
      "Bearer ",
      ""
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      console.error(
        "Resolve Exception Auth Error:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * 2. Verify admin role
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "Resolve Exception Profile Error:",
        profileError
      );

      return NextResponse.json(
        {
          success: false,
          error: "PROFILE_NOT_FOUND",
        },
        {
          status: 403,
        }
      );
    }

    if (profile.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "ADMIN_REQUIRED",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * 3. Parse request body
     */
    let body: RequestBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_REQUEST_BODY",
        },
        {
          status: 400,
        }
      );
    }

    const orderId =
      typeof body.orderId === "string"
        ? body.orderId.trim()
        : "";

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "ORDER_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Admin must explicitly confirm manual review.
     */
    if (body.confirmation !== true) {
      return NextResponse.json(
        {
          success: false,
          error: "MANUAL_CONFIRMATION_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 4. Load trusted order state
     */
    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        payment_status,
        order_status,
        payment_exception,
        payment_exception_at,
        stock_deducted_at,
        stock_reserved_at,
        stock_released_at
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(
        "Resolve Exception Order Error:",
        orderError
      );

      return NextResponse.json(
        {
          success: false,
          error: "ORDER_NOT_FOUND",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * 5. Safety checks
     */

    /*
     * Payment must already be confirmed.
     */
    if (order.payment_status !== "paid") {
      return NextResponse.json(
        {
          success: false,
          error: "ORDER_NOT_PAID",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * There must actually be an exception.
     */
    if (!order.payment_exception) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_PAYMENT_EXCEPTION",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Delivered / cancelled orders are final.
     */
    if (
      order.order_status === "delivered" ||
      order.order_status === "cancelled"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "ORDER_ALREADY_FINAL",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Critical stock safety check.
     *
     * We do NOT clear the payment exception unless
     * stock has actually been secured/deducted for
     * this paid order.
     */
    if (!order.stock_deducted_at) {
      return NextResponse.json(
        {
          success: false,
          error: "STOCK_NOT_SECURED",
          message:
            "Payment exception cannot be resolved because stock has not been secured for this order.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * 6. Resolve exception.
     *
     * Do NOT modify:
     * - payment_status
     * - paid_at
     * - stock_deducted_at
     * - stock_reserved_at
     * - stock_released_at
     */
    const {
      data: updatedOrder,
      error: updateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        payment_exception: null,
        payment_exception_at: null,
      })
      .eq("id", order.id)
      .eq("payment_status", "paid")
      .not("payment_exception", "is", null)
      .not("stock_deducted_at", "is", null)
      .select(`
        id,
        payment_status,
        order_status,
        payment_exception,
        payment_exception_at,
        stock_deducted_at
      `)
      .maybeSingle();

    if (updateError) {
      console.error(
        "Resolve Exception Update Error:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          error: "UPDATE_FAILED",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Protect against concurrent changes.
     */
    if (!updatedOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "ORDER_STATE_CHANGED",
          message:
            "The order changed while the exception was being resolved. Refresh the order and review it again.",
        },
        {
          status: 409,
        }
      );
    }

    console.log(
      "Payment exception resolved:",
      {
        orderId: updatedOrder.id,
        adminUserId: user.id,
      }
    );

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Resolve Payment Exception Unexpected Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}