import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ExpiredOrder = {
  id: string;
  payment_status: string;
  billplz_bill_id: string | null;
  stock_reservation_expires_at: string | null;
  stock_released_at: string | null;
  stock_deducted_at: string | null;
};

type BillplzData = {
  id?: string;
  state?: string;
  paid?: boolean | string;
};

type ProcessResult = {
  orderId: string;
  action:
    | "expired"
    | "recovered_paid"
    | "manual_review"
    | "skipped_paid"
    | "skipped_sold"
    | "skipped_released"
    | "skipped_not_due"
    | "error";
  billDeleted?: boolean;
  reason?: string;
};

// Maximum number of expired orders
// processed in one Cron execution.
const BATCH_SIZE = 20;

// After the reservation expires,
// wait another 5 minutes before processing.
//
// Example:
// Reservation expires: 3:00 PM
// Cron eligible:       3:05 PM
//
// This reduces payment/expiry race risk.
const GRACE_PERIOD_MINUTES = 5;

function isAuthorizedCron(
  request: Request,
  cronSecret: string
) {
  const authorization =
    request.headers.get("authorization");

  return (
    authorization ===
    `Bearer ${cronSecret}`
  );
}

async function expireReservation(
  orderId: string
) {
  return supabaseAdmin.rpc(
    "expire_order_reservation",
    {
      p_order_id: orderId,
    }
  );
}

async function recoverPaidOrder(
  orderId: string,
  paidAt: string
) {
  return supabaseAdmin.rpc(
    "complete_paid_order",
    {
      p_order_id: orderId,
      p_paid_at: paidAt,
    }
  );
}

async function processExpiredOrder(
  order: ExpiredOrder,
  apiUrl: string,
  billplzAuthorization: string
): Promise<ProcessResult> {
  try {
    // =========================================
    // 1. Defensive local checks
    // =========================================

    if (
      order.payment_status ===
      "paid"
    ) {
      return {
        orderId: order.id,
        action: "skipped_paid",
        reason: "ORDER_ALREADY_PAID",
      };
    }

    if (
      order.stock_deducted_at
    ) {
      return {
        orderId: order.id,
        action: "skipped_sold",
        reason: "STOCK_ALREADY_SOLD",
      };
    }

    if (
      order.stock_released_at
    ) {
      return {
        orderId: order.id,
        action: "skipped_released",
        reason: "STOCK_ALREADY_RELEASED",
      };
    }

    // =========================================
    // 2. No Billplz bill
    //
    // Reservation expired but payment bill
    // was never created.
    //
    // Safe to release using atomic RPC.
    // =========================================

    if (
      !order.billplz_bill_id
    ) {
      const {
        error: expireError,
      } =
        await expireReservation(
          order.id
        );

      if (expireError) {
        console.error(
          "Cron Atomic Expire Error:",
          {
            orderId: order.id,
            message:
              expireError.message,
          }
        );

        return {
          orderId: order.id,
          action: "error",
          reason:
            "ATOMIC_EXPIRE_FAILED",
        };
      }

      return {
        orderId: order.id,
        action: "expired",
        billDeleted: false,
      };
    }

    // =========================================
    // 3. Get latest Billplz state
    // =========================================

    const encodedBillId =
      encodeURIComponent(
        order.billplz_bill_id
      );

    const billResponse =
      await fetch(
        `${apiUrl}/bills/${encodedBillId}`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Basic ${billplzAuthorization}`,
          },
          cache: "no-store",
        }
      );

    let billData:
      BillplzData;

    try {
      billData =
        (await billResponse.json()) as BillplzData;
    } catch {
      console.error(
        "Cron Invalid Billplz Get Response:",
        {
          orderId: order.id,
          billId:
            order.billplz_bill_id,
        }
      );

      return {
        orderId: order.id,
        action: "error",
        reason:
          "INVALID_BILLPLZ_RESPONSE",
      };
    }

    if (!billResponse.ok) {
      console.error(
        "Cron Billplz Get Bill Error:",
        {
          orderId: order.id,
          billId:
            order.billplz_bill_id,
          status:
            billResponse.status,
        }
      );

      return {
        orderId: order.id,
        action: "error",
        reason:
          "BILLPLZ_GET_FAILED",
      };
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
// 4. Billplz says PAID
//
// Payment callback may have been delayed,
// lost, or unreachable.
//
// Never release stock.
//
// Recover the payment using the same
// atomic/idempotent RPC used by the
// Billplz callback.
// =========================================

if (
  billPaid ||
  billState === "paid"
) {
  const paidAt =
    new Date().toISOString();

  const {
    data: recoveryResult,
    error: recoveryError,
  } = await recoverPaidOrder(
    order.id,
    paidAt
  );

  if (recoveryError) {
    console.error(
      "Cron Paid Recovery RPC Error:",
      {
        orderId: order.id,
        billId:
          order.billplz_bill_id,
        message:
          recoveryError.message,
      }
    );

    return {
      orderId: order.id,
      action: "error",
      reason:
        "PAID_RECOVERY_FAILED",
    };
  }

  /*
   * complete_paid_order() may return
   * a JSON object or an array depending
   * on the PostgreSQL function shape.
   *
   * Normalize it before reading the
   * recovery result.
   */
  const normalizedResult =
    Array.isArray(recoveryResult)
      ? recoveryResult[0]
      : recoveryResult;

  const recovery =
    normalizedResult &&
    typeof normalizedResult === "object"
      ? (normalizedResult as Record<
          string,
          unknown
        >)
      : null;

  /*
   * The payment RPC is the source of truth.
   *
   * Reload the order after the RPC instead
   * of assuming payment/stock state from
   * the Billplz response alone.
   */
  const {
    data: recoveredOrder,
    error: reloadError,
  } = await supabaseAdmin
    .from("orders")
    .select(`
      id,
      payment_status,
      payment_exception,
      stock_deducted_at
    `)
    .eq("id", order.id)
    .maybeSingle();

  if (
    reloadError ||
    !recoveredOrder
  ) {
    console.error(
      "Cron Paid Recovery Reload Error:",
      {
        orderId: order.id,
        error: reloadError,
      }
    );

    return {
      orderId: order.id,
      action: "error",
      reason:
        "PAID_RECOVERY_RELOAD_FAILED",
    };
  }

  /*
   * Payment received but inventory could
   * not safely be secured.
   *
   * complete_paid_order() should place
   * the order into payment_exception /
   * manual review instead of allowing
   * fulfillment.
   */
  if (
    recoveredOrder.payment_exception
  ) {
    console.warn(
      "Cron Paid Recovery Requires Manual Review:",
      {
        orderId: order.id,
        billId:
          order.billplz_bill_id,
        paymentException:
          recoveredOrder.payment_exception,
        rpcResult: recovery,
      }
    );

    return {
      orderId: order.id,
      action: "manual_review",
      reason:
        "PAYMENT_RECOVERED_REQUIRES_MANUAL_REVIEW",
    };
  }

  /*
   * Normal successful recovery must leave
   * the order paid with stock secured.
   */
  if (
    recoveredOrder.payment_status !==
      "paid" ||
    !recoveredOrder.stock_deducted_at
  ) {
    console.error(
      "Cron Paid Recovery Incomplete:",
      {
        orderId: order.id,
        paymentStatus:
          recoveredOrder.payment_status,
        stockDeductedAt:
          recoveredOrder.stock_deducted_at,
        rpcResult: recovery,
      }
    );

    return {
      orderId: order.id,
      action: "error",
      reason:
        "PAID_RECOVERY_INCOMPLETE",
    };
  }

  console.log(
    "Cron Paid Order Recovered:",
    {
      orderId: order.id,
      billId:
        order.billplz_bill_id,
    }
  );

  return {
    orderId: order.id,
    action: "recovered_paid",
    reason:
      "BILL_PAID_RECOVERED",
  };
}

    // =========================================
    // 5. Bill already deleted
    //
    // Complete atomic expiry.
    // =========================================

    if (
      billState === "deleted"
    ) {
      const {
        error: expireError,
      } =
        await expireReservation(
          order.id
        );

      if (expireError) {
        console.error(
          "Cron Atomic Expire Deleted Bill Error:",
          {
            orderId: order.id,
            message:
              expireError.message,
          }
        );

        return {
          orderId: order.id,
          action: "error",
          reason:
            "ATOMIC_EXPIRE_FAILED",
        };
      }

      return {
        orderId: order.id,
        action: "expired",
        billDeleted: true,
      };
    }

    // =========================================
    // 6. Only DUE bills may be deleted
    // =========================================

    if (
      billState !== "due"
    ) {
      console.error(
        "Cron Unexpected Billplz State:",
        {
          orderId: order.id,
          billId:
            order.billplz_bill_id,
          state: billState,
        }
      );

      return {
        orderId: order.id,
        action:
          "skipped_not_due",
        reason:
          `UNEXPECTED_BILL_STATE:${billState}`,
      };
    }

    // =========================================
    // 7. Delete DUE Billplz bill FIRST
    //
    // Critical rule:
    // Never release stock unless Billplz
    // deletion succeeds.
    // =========================================

    const deleteResponse =
      await fetch(
        `${apiUrl}/bills/${encodedBillId}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              `Basic ${billplzAuthorization}`,
          },
          cache: "no-store",
        }
      );

    if (!deleteResponse.ok) {
      const deleteText =
        await deleteResponse.text();

      console.error(
        "Cron Billplz Delete Error:",
        {
          orderId: order.id,
          billId:
            order.billplz_bill_id,
          status:
            deleteResponse.status,
          response:
            deleteText.slice(
              0,
              300
            ),
        }
      );

      // Do NOT release inventory.

      return {
        orderId: order.id,
        action: "error",
        reason:
          "BILLPLZ_DELETE_FAILED",
      };
    }

    // =========================================
    // 8. Bill deleted successfully
    //
    // Atomically:
    // - release stock
    // - payment_status = expired
    // =========================================

    const {
      error: expireError,
    } =
      await expireReservation(
        order.id
      );

    if (expireError) {
      console.error(
        "Cron Atomic Expire Error:",
        {
          orderId: order.id,
          message:
            expireError.message,
        }
      );

      /*
        Bill is already deleted.

        Do not attempt another stock operation
        here. The next Cron run can safely retry
        the idempotent RPC.
      */

      return {
        orderId: order.id,
        action: "error",
        reason:
          "ATOMIC_EXPIRE_FAILED_AFTER_BILL_DELETE",
      };
    }

    return {
      orderId: order.id,
      action: "expired",
      billDeleted: true,
    };
  } catch (error) {
    console.error(
      "Cron Process Order Error:",
      {
        orderId: order.id,
        error,
      }
    );

    return {
      orderId: order.id,
      action: "error",
      reason:
        "UNEXPECTED_PROCESSING_ERROR",
    };
  }
}

export async function GET(
  request: Request
) {
  try {
    // =========================================
    // 1. Verify Cron authorization
    // =========================================

    const cronSecret =
      process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error(
        "CRON_SECRET is missing"
      );

      return NextResponse.json(
        {
          error:
            "Cron configuration missing",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !isAuthorizedCron(
        request,
        cronSecret
      )
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================
    // 2. Verify Billplz configuration
    // =========================================

    const secretKey =
      process.env
        .BILLPLZ_SECRET_KEY;

    const apiUrl =
      process.env
        .BILLPLZ_API_URL;

    if (
      !secretKey ||
      !apiUrl
    ) {
      console.error(
        "Cron Billplz environment variables are missing"
      );

      return NextResponse.json(
        {
          error:
            "Billplz configuration incomplete",
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
    // 3. Calculate Grace Period cutoff
    //
    // Example:
    //
    // Current time:       3:10 PM
    // Grace period:       5 minutes
    // Grace cutoff:       3:05 PM
    //
    // Only reservations that expired BEFORE
    // 3:05 PM may be processed.
    // =========================================

    const graceCutoff =
      new Date(
        Date.now() -
          GRACE_PERIOD_MINUTES *
            60 *
            1000
      ).toISOString();

    // =========================================
    // 4. Find expired reservations
    //
    // Only:
    // - pending payment
    // - reservation expired beyond grace period
    // - stock not released
    // - stock not sold
    //
    // Oldest reservations first.
    // =========================================

    const {
      data: expiredOrders,
      error: queryError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(`
          id,
          payment_status,
          billplz_bill_id,
          stock_reservation_expires_at,
          stock_released_at,
          stock_deducted_at
        `)
        .eq(
          "payment_status",
          "pending"
        )
        .not(
          "stock_reservation_expires_at",
          "is",
          null
        )
        .lt(
          "stock_reservation_expires_at",
          graceCutoff
        )
        .is(
          "stock_released_at",
          null
        )
        .is(
          "stock_deducted_at",
          null
        )
        .order(
          "stock_reservation_expires_at",
          {
            ascending: true,
          }
        )
        .limit(
          BATCH_SIZE
        );

    if (queryError) {
      console.error(
        "Cron Expired Order Query Error:",
        queryError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load expired reservations",
        },
        {
          status: 500,
        }
      );
    }

    const orders =
      (expiredOrders ??
        []) as ExpiredOrder[];

    // =========================================
    // 5. Nothing to process
    // =========================================

    if (
      orders.length === 0
    ) {
      return NextResponse.json({
        success: true,
        checked: 0,
        expired: 0,
        skipped: 0,
        errors: 0,
        gracePeriodMinutes:
          GRACE_PERIOD_MINUTES,
        message:
          "No expired reservations found",
      });
    }

    // =========================================
    // 6. Process sequentially
    //
    // Sequential processing is intentional.
    // It keeps Billplz traffic controlled and
    // makes logs easier to audit.
    // =========================================

    const results:
      ProcessResult[] = [];

    for (
      const order of orders
    ) {
      const result =
        await processExpiredOrder(
          order,
          apiUrl,
          billplzAuthorization
        );

      results.push(
        result
      );
    }

    // =========================================
    // 7. Summary
    // =========================================

   const expiredCount =
  results.filter(
    (result) =>
      result.action ===
      "expired"
  ).length;

const recoveredCount =
  results.filter(
    (result) =>
      result.action ===
      "recovered_paid"
  ).length;

const manualReviewCount =
  results.filter(
    (result) =>
      result.action ===
      "manual_review"
  ).length;

const errorCount =
  results.filter(
    (result) =>
      result.action ===
      "error"
  ).length;

const skippedCount =
  results.filter(
    (result) =>
      result.action ===
        "skipped_paid" ||
      result.action ===
        "skipped_sold" ||
      result.action ===
        "skipped_released" ||
      result.action ===
        "skipped_not_due"
  ).length;

   console.log(
  "Expired Reservation Cron Completed:",
  {
    checked:
      results.length,
    expired:
      expiredCount,
    recovered:
      recoveredCount,
    manualReview:
      manualReviewCount,
    skipped:
      skippedCount,
    errors:
      errorCount,
    gracePeriodMinutes:
      GRACE_PERIOD_MINUTES,
  }
);

    return NextResponse.json({
  success:
    errorCount === 0,
  checked:
    results.length,
  expired:
    expiredCount,
  recovered:
    recoveredCount,
  manualReview:
    manualReviewCount,
  skipped:
    skippedCount,
  errors:
    errorCount,
  gracePeriodMinutes:
    GRACE_PERIOD_MINUTES,
  results,
});
  } catch (error) {
    console.error(
      "Expire Orders Cron Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Cron processing failed",
      },
      {
        status: 500,
      }
    );
  }
}