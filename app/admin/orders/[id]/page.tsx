"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { supabase } from "@/lib/supabase";

type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded";

type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type Order = {
  id: string;
  customer_name: string;
  email: string | null;
  phone: string | null;

  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;

  subtotal: number;
  shipping: number;
  total: number;

  payment_status: PaymentStatus;
  order_status: OrderStatus;

  paid_at: string | null;

  payment_exception: string | null;
  payment_exception_at: string | null;

  courier_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;

  created_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  created_at: string;
};

const COURIERS = [
  "J&T Express",
  "Pos Laju",
  "Ninja Van",
  "DHL eCommerce",
  "GDEX",
  "Flash Express",
  "City-Link Express",
  "Best Express",
  "Other",
];

/*
 * Fulfillment Safety V2
 *
 * Only these forward transitions are allowed:
 *
 * Pending    -> Processing / Cancelled
 * Processing -> Shipped / Cancelled
 * Shipped    -> Delivered
 * Delivered  -> Final
 * Cancelled  -> Final
 */
const ALLOWED_STATUS_TRANSITIONS: Record<
  OrderStatus,
  OrderStatus[]
> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
) {
  if (currentStatus === nextStatus) {
    return true;
  }

  return ALLOWED_STATUS_TRANSITIONS[
    currentStatus
  ].includes(nextStatus);
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString(
    "en-MY"
  );
}

function paymentStatusClass(
  status: PaymentStatus
) {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700";

    case "pending":
      return "bg-yellow-50 text-yellow-700";

    case "failed":
      return "bg-red-50 text-red-700";

    case "expired":
      return "bg-gray-100 text-gray-600";

    case "refunded":
      return "bg-blue-50 text-blue-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
}

function orderStatusClass(
  status: OrderStatus
) {
  switch (status) {
    case "processing":
      return "bg-blue-50 text-blue-700";

    case "shipped":
      return "bg-purple-50 text-purple-700";

    case "delivered":
      return "bg-green-50 text-green-700";

    case "cancelled":
      return "bg-red-50 text-red-700";

    case "pending":
    default:
      return "bg-yellow-50 text-yellow-700";
  }
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = params.id as string;

  const [order, setOrder] =
    useState<Order | null>(null);

  const [items, setItems] = useState<
    OrderItem[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [savingStatus, setSavingStatus] =
    useState(false);

  const [
    savingShipping,
    setSavingShipping,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<OrderStatus>("pending");

  const [courierName, setCourierName] =
    useState("");

  const [
    trackingNumber,
    setTrackingNumber,
  ] = useState("");

  const [trackingUrl, setTrackingUrl] =
    useState("");

  const [
  resolvingException,
  setResolvingException,
] = useState(false);

const [
  exceptionConfirmed,
  setExceptionConfirmed,
] = useState(false);

  const loadOrder =
    useCallback(async () => {
      setLoading(true);
      setErrorMessage("");

      const [orderResult, itemsResult] =
        await Promise.all([
          supabase
            .from("orders")
            .select(`
              id,
              customer_name,
              email,
              phone,
              address,
              city,
              state,
              postcode,
              subtotal,
              shipping,
              total,
              payment_status,
              order_status,
              paid_at,
              payment_exception,
              payment_exception_at,
              courier_name,
              tracking_number,
              tracking_url,
              shipped_at,
              delivered_at,
              created_at
            `)
            .eq("id", orderId)
            .single(),

          supabase
            .from("order_items")
            .select(`
              id,
              order_id,
              product_id,
              product_name,
              price,
              quantity,
              created_at
            `)
            .eq("order_id", orderId)
            .order("created_at", {
              ascending: true,
            }),
        ]);

      if (orderResult.error) {
        console.error(
          "Order Error:",
          orderResult.error
        );

        setErrorMessage(
          "Unable to load this order."
        );

        setLoading(false);
        return;
      }

      if (itemsResult.error) {
        console.error(
          "Order Items Error:",
          itemsResult.error
        );

        setErrorMessage(
          "Unable to load order items."
        );

        setLoading(false);
        return;
      }

      const loadedOrder =
        orderResult.data as Order;

      setOrder(loadedOrder);

      setItems(
        (itemsResult.data ||
          []) as OrderItem[]
      );

      setSelectedStatus(
        loadedOrder.order_status
      );

      setCourierName(
        loadedOrder.courier_name || ""
      );

      setTrackingNumber(
        loadedOrder.tracking_number || ""
      );

      setTrackingUrl(
        loadedOrder.tracking_url || ""
      );

      setLoading(false);
    }, [orderId]);

  useEffect(() => {
    if (orderId) {
      void loadOrder();
    }
  }, [orderId, loadOrder]);

  const fulfillmentBlocked =
    !order ||
    order.payment_status !== "paid" ||
    Boolean(order.payment_exception);

  const shippingLocked =
    !order ||
  order.order_status === "delivered" ||
  order.order_status === "cancelled";

  async function saveShippingInformation() {
    if (!order) return;

    setSavingShipping(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (
  order.order_status === "delivered" ||
  order.order_status === "cancelled"
) {
  setErrorMessage(
    "Shipping information is locked because this order is final."
  );

  setSavingShipping(false);
  return;
}

    if (order.payment_status !== "paid") {
      setErrorMessage(
        "Shipping information cannot be updated until payment is confirmed."
      );

      setSavingShipping(false);
      return;
    }

    if (order.payment_exception) {
      setErrorMessage(
        "HOLD FULFILLMENT: Resolve the payment exception before updating shipping information."
      );

      setSavingShipping(false);
      return;
    }

    const cleanCourier =
      courierName.trim();

    const cleanTrackingNumber =
      trackingNumber.trim();

    const cleanTrackingUrl =
      trackingUrl.trim();

    if (!cleanCourier) {
      setErrorMessage(
        "Please select or enter a courier."
      );

      setSavingShipping(false);
      return;
    }

    if (!cleanTrackingNumber) {
      setErrorMessage(
        "Please enter the tracking number."
      );

      setSavingShipping(false);
      return;
    }

    if (
      cleanTrackingUrl &&
      !/^https?:\/\//i.test(
        cleanTrackingUrl
      )
    ) {
      setErrorMessage(
        "Tracking URL must begin with http:// or https://."
      );

      setSavingShipping(false);
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({
        courier_name: cleanCourier,
        tracking_number:
          cleanTrackingNumber,
        tracking_url:
          cleanTrackingUrl || null,
      })
      .eq("id", order.id);

    if (error) {
      console.error(
        "Save Shipping Error:",
        error
      );

      setErrorMessage(
        "Unable to save shipping information."
      );

      setSavingShipping(false);
      return;
    }

    setSuccessMessage(
      "Shipping information saved successfully."
    );

    await loadOrder();

    setSavingShipping(false);
  }

  async function resolvePaymentException() {
  if (!order) return;

  setErrorMessage("");
  setSuccessMessage("");

  if (!order.payment_exception) {
    setErrorMessage(
      "This order does not have a payment exception."
    );
    return;
  }

  if (!exceptionConfirmed) {
    setErrorMessage(
      "Please confirm that payment and stock have been manually verified."
    );
    return;
  }

  setResolvingException(true);

  try {
    /*
     * Get the current Admin session.
     * The access token is sent to our Step 3A Server API.
     */
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error(
        "Resolve Exception Session Error:",
        sessionError
      );

      setErrorMessage(
        "Your admin session is unavailable. Please sign in again."
      );

      setResolvingException(false);
      return;
    }

    const response = await fetch(
      "/api/admin/orders/resolve-payment-exception",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          orderId: order.id,
          confirmation: true,
        }),
      }
    );

    const result = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      console.error(
        "Resolve Payment Exception API Error:",
        result
      );

      let message =
        "Unable to resolve the payment exception.";

      switch (result?.error) {
        case "UNAUTHORIZED":
          message =
            "Your admin session is no longer valid. Please sign in again.";
          break;

        case "ADMIN_REQUIRED":
          message =
            "Administrator permission is required.";
          break;

        case "ORDER_NOT_FOUND":
          message =
            "This order could not be found.";
          break;

        case "ORDER_NOT_PAID":
          message =
            "The payment exception cannot be resolved because payment is not confirmed.";
          break;

        case "NO_PAYMENT_EXCEPTION":
          message =
            "This order no longer has a payment exception. Refresh the page.";
          break;

        case "ORDER_ALREADY_FINAL":
          message =
            "The payment exception cannot be resolved because this order is already final.";
          break;

        case "STOCK_NOT_SECURED":
          message =
            result?.message ||
            "The payment exception cannot be resolved because stock has not been secured.";
          break;

        case "ORDER_STATE_CHANGED":
          message =
            result?.message ||
            "The order changed while it was being reviewed. Refresh and review it again.";
          break;

        case "MANUAL_CONFIRMATION_REQUIRED":
          message =
            "Manual payment and stock confirmation is required.";
          break;

        default:
          if (
            typeof result?.message ===
            "string"
          ) {
            message = result.message;
          }
      }

      setErrorMessage(message);
      setResolvingException(false);
      return;
    }

    if (!result?.success) {
      setErrorMessage(
        "The server did not confirm that the payment exception was resolved."
      );

      setResolvingException(false);
      return;
    }

    setExceptionConfirmed(false);

    /*
     * Reload trusted order state.
     */
    await loadOrder();

    setSuccessMessage(
      "Payment exception resolved successfully. Fulfillment may now continue."
    );
  } catch (error) {
    console.error(
      "Resolve Payment Exception Error:",
      error
    );

    setErrorMessage(
      "Unable to contact the server. Please try again."
    );
  } finally {
    setResolvingException(false);
  }
}

  async function updateOrderStatus() {
    if (!order) return;

    setSavingStatus(true);
    setErrorMessage("");
    setSuccessMessage("");

    /*
     * No change required.
     */
    if (
      selectedStatus ===
      order.order_status
    ) {
      setSuccessMessage(
        "Order status is already up to date."
      );

      setSavingStatus(false);
      return;
    }

    /*
     * SAFETY V2:
     * Block invalid/backward transitions.
     */
    if (
      !canTransitionOrderStatus(
        order.order_status,
        selectedStatus
      )
    ) {
      setErrorMessage(
        `Invalid order status transition: ${formatStatus(
          order.order_status
        )} → ${formatStatus(
          selectedStatus
        )}.`
      );

      setSavingStatus(false);
      return;
    }

    const fulfillmentStatuses:
      OrderStatus[] = [
      "processing",
      "shipped",
      "delivered",
    ];

    /*
     * Fulfillment requires payment.
     */
    if (
      fulfillmentStatuses.includes(
        selectedStatus
      ) &&
      order.payment_status !== "paid"
    ) {
      setErrorMessage(
        "This order cannot enter fulfillment because payment has not been confirmed."
      );

      setSavingStatus(false);
      return;
    }

    /*
     * Payment exceptions block fulfillment.
     */
    if (
      fulfillmentStatuses.includes(
        selectedStatus
      ) &&
      order.payment_exception
    ) {
      setErrorMessage(
        "HOLD FULFILLMENT: Resolve the payment exception before processing this order."
      );

      setSavingStatus(false);
      return;
    }

    /*
     * Shipped requires valid shipping info.
     */
    if (selectedStatus === "shipped") {
      if (!courierName.trim()) {
        setErrorMessage(
          "Courier is required before marking this order as shipped."
        );

        setSavingStatus(false);
        return;
      }

      if (!trackingNumber.trim()) {
        setErrorMessage(
          "Tracking number is required before marking this order as shipped."
        );

        setSavingStatus(false);
        return;
      }

      if (
        trackingUrl.trim() &&
        !/^https?:\/\//i.test(
          trackingUrl.trim()
        )
      ) {
        setErrorMessage(
          "Tracking URL must begin with http:// or https://."
        );

        setSavingStatus(false);
        return;
      }
    }

    /*
     * Delivered must come from Shipped.
     */
    if (
      selectedStatus === "delivered" &&
      order.order_status !== "shipped"
    ) {
      setErrorMessage(
        "The order must be marked as shipped before it can be marked as delivered."
      );

      setSavingStatus(false);
      return;
    }

    const updateData: {
      order_status: OrderStatus;
      courier_name?: string;
      tracking_number?: string;
      tracking_url?: string | null;
      shipped_at?: string;
      delivered_at?: string;
    } = {
      order_status: selectedStatus,
    };

    /*
     * Save shipping data and shipped timestamp.
     */
    if (selectedStatus === "shipped") {
      updateData.courier_name =
        courierName.trim();

      updateData.tracking_number =
        trackingNumber.trim();

      updateData.tracking_url =
        trackingUrl.trim() || null;

      if (!order.shipped_at) {
        updateData.shipped_at =
          new Date().toISOString();
      }
    }

    /*
     * Delivered timestamp.
     */
    if (
      selectedStatus === "delivered"
    ) {
      if (!order.shipped_at) {
        setErrorMessage(
          "Shipped timestamp is missing. Mark the order as shipped first."
        );

        setSavingStatus(false);
        return;
      }

      if (!order.delivered_at) {
        updateData.delivered_at =
          new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (error) {
      console.error(
        "Update Order Status Error:",
        error
      );

      setErrorMessage(
        "Unable to update the order status."
      );

      setSavingStatus(false);
      return;
    }

    setSuccessMessage(
      `Order status updated to ${formatStatus(
        selectedStatus
      )}.`
    );

    await loadOrder();

    setSavingStatus(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">
              Loading order...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage && !order) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-10">
        <div className="mx-auto max-w-7xl px-6">
          <button
            onClick={() =>
              router.push(
                "/admin/orders"
              )
            }
            className="mb-6 text-sm text-gray-500 hover:text-[#38435A]"
          >
            ← Back to Orders
          </button>

          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-[#38435A]">
              Order unavailable
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {errorMessage}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return null;
  }

  const isUnderReview =
    order.payment_status === "paid" &&
    Boolean(order.payment_exception);

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-10">
      <div className="mx-auto max-w-7xl px-6">
        {/* Back */}

        <button
          onClick={() =>
            router.push(
              "/admin/orders"
            )
          }
          className="mb-6 text-sm text-gray-500 hover:text-[#38435A]"
        >
          ← Back to Orders
        </button>

        {/* Header */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Angel Dear Malaysia
            </p>

            <h1 className="mt-1 text-4xl font-bold text-[#38435A]">
              Admin Order Detail
            </h1>

            <p className="mt-2 break-all font-mono text-sm text-gray-500">
              {order.id}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span
              className={`rounded-full px-5 py-3 text-sm font-semibold ${paymentStatusClass(
                order.payment_status
              )}`}
            >
              Payment:{" "}
              {formatStatus(
                order.payment_status
              )}
            </span>

            <span
              className={`rounded-full px-5 py-3 text-sm font-semibold ${orderStatusClass(
                order.order_status
              )}`}
            >
              Order:{" "}
              {isUnderReview
                ? "Under Review"
                : formatStatus(
                    order.order_status
                  )}
            </span>
          </div>
        </div>

       {/* Payment Exception */}

{isUnderReview && (
  <div className="mb-8 rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
    <h2 className="text-xl font-bold">
      HOLD FULFILLMENT
    </h2>

    <p className="mt-2 text-sm leading-6">
      Payment was received, but this order has a
      payment exception. Do not process or ship
      this order until the exception has been
      reviewed and safely resolved.
    </p>

    <div className="mt-4 rounded-2xl bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Payment Exception
      </p>

      <p className="mt-2 break-words text-sm font-medium">
        {order.payment_exception}
      </p>

      <p className="mt-3 text-xs text-amber-700">
        Exception At:{" "}
        {formatDate(
          order.payment_exception_at
        )}
      </p>
    </div>

    {/* Manual Review */}

    <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-5">
      <h3 className="font-semibold text-[#38435A]">
        Manual Review Required
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Before resolving this exception, manually
        verify that payment has been received and
        stock has been safely secured for this
        order.
      </p>

      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={exceptionConfirmed}
          onChange={(event) =>
            setExceptionConfirmed(
              event.target.checked
            )
          }
          disabled={resolvingException}
          className="mt-1 h-4 w-4 rounded border-gray-300"
        />

        <span className="text-sm font-medium leading-6 text-gray-700">
          I have manually verified payment and
          stock, and this order is safe to
          fulfill.
        </span>
      </label>

      <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
        This confirmation does not override the
        server safety checks. The exception will
        remain active if stock has not been
        secured.
      </div>

      <button
        type="button"
        onClick={resolvePaymentException}
        disabled={
          resolvingException ||
          !exceptionConfirmed
        }
        className="mt-5 rounded-2xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {resolvingException
          ? "Resolving..."
          : "Resolve Payment Exception"}
      </button>
    </div>
  </div>
)}

        {/* Messages */}

        {errorMessage && order && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {/* Main Information */}

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Customer */}

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#38435A]">
              Customer
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-gray-400">
                  Name
                </p>

                <p className="mt-1 font-medium">
                  {order.customer_name}
                </p>
              </div>

              <div>
                <p className="text-gray-400">
                  Email
                </p>

                <p className="mt-1 break-all font-medium">
                  {order.email || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-400">
                  Phone
                </p>

                <p className="mt-1 font-medium">
                  {order.phone || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery */}

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#38435A]">
              Delivery Information
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-gray-400">
                  Address
                </p>

                <p className="mt-1 font-medium leading-6">
                  {order.address || "-"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">
                    City
                  </p>

                  <p className="mt-1 font-medium">
                    {order.city || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-400">
                    State
                  </p>

                  <p className="mt-1 font-medium">
                    {order.state || "-"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-gray-400">
                  Postcode
                </p>

                <p className="mt-1 font-medium">
                  {order.postcode || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#38435A]">
              Order Summary
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Subtotal
                </span>

                <span>
                  RM{" "}
                  {Number(
                    order.subtotal
                  ).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Shipping
                </span>

                <span>
                  {Number(
                    order.shipping
                  ) === 0
                    ? "FREE"
                    : `RM ${Number(
                        order.shipping
                      ).toFixed(2)}`}
                </span>
              </div>

              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>

                <span className="text-[#AFC7B4]">
                  RM{" "}
                  {Number(
                    order.total
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment + Order Status */}

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Payment */}

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#38435A]">
              Payment
            </h2>

            <p className="mt-1 text-xs text-gray-400">
              Payment status is read-only and
              controlled by the payment system.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 text-sm sm:grid-cols-2">
              <div>
                <p className="text-gray-400">
                  Payment Status
                </p>

                <span
                  className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${paymentStatusClass(
                    order.payment_status
                  )}`}
                >
                  {formatStatus(
                    order.payment_status
                  )}
                </span>
              </div>

              <div>
                <p className="text-gray-400">
                  Paid At
                </p>

                <p className="mt-2 font-medium">
                  {formatDate(
                    order.paid_at
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Order Status */}

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#38435A]">
              Order Status
            </h2>

            <p className="mt-1 text-xs text-gray-400">
              Fulfillment requires confirmed
              payment and no payment exception.
            </p>

            <div className="mt-5">
              <select
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(
                    event.target
                      .value as OrderStatus
                  )
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#AFC7B4]"
              >
                <option value="pending">
                  Pending
                </option>

                <option value="processing">
                  Processing
                </option>

                <option value="shipped">
                  Shipped
                </option>

                <option value="delivered">
                  Delivered
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>

              {fulfillmentBlocked && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  Fulfillment is currently
                  blocked.
                  {order.payment_status !==
                    "paid" &&
                    " Payment has not been confirmed."}
                  {order.payment_exception &&
                    " A payment exception requires manual review."}
                </div>
              )}

              {order.order_status ===
                "delivered" && (
                <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-700">
                  This order is delivered and
                  final. Its fulfillment status
                  cannot be changed.
                </div>
              )}

              {order.order_status ===
                "cancelled" && (
                <div className="mt-4 rounded-2xl bg-gray-100 p-4 text-sm text-gray-600">
                  This order is cancelled and
                  final. Its status cannot be
                  changed.
                </div>
              )}

              <button
                type="button"
                onClick={
                  updateOrderStatus
                }
                disabled={savingStatus}
                className="mt-4 w-full rounded-2xl bg-[#38435A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingStatus
                  ? "Updating..."
                  : "Update Order Status"}
              </button>
            </div>
          </div>
        </div>

        {/* Shipping & Fulfillment */}

        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#38435A]">
                Shipping & Fulfillment
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Add courier and tracking
                information before marking the
                order as shipped.
              </p>
            </div>

            {shippingLocked && (
  <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-700">
    <p className="font-semibold">
      Fulfillment Completed
    </p>

    <p className="mt-1">
      Shipping information is locked because this
      order is final.
    </p>
  </div>
)}

            {order.order_status ===
              "shipped" && (
              <span className="rounded-full bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700">
                SHIPPED
              </span>
            )}

            {order.order_status ===
              "delivered" && (
              <span className="rounded-full bg-green-50 px-4 py-2 text-xs font-semibold text-green-700">
                DELIVERED
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Courier */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Courier
              </label>

              <select
                value={courierName}
                onChange={(event) =>
                  setCourierName(
                    event.target.value
                  )
                }
                disabled={
  fulfillmentBlocked ||
  shippingLocked
}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#AFC7B4] disabled:bg-gray-100"
              >
                <option value="">
                  Select courier
                </option>

                {COURIERS.map(
                  (courier) => (
                    <option
                      key={courier}
                      value={courier}
                    >
                      {courier}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Tracking Number */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tracking Number
              </label>

              <input
                type="text"
                value={trackingNumber}
                onChange={(event) =>
                  setTrackingNumber(
                    event.target.value
                  )
                }
                disabled={
  fulfillmentBlocked ||
  shippingLocked
}
                placeholder="e.g. 620123456789"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#AFC7B4] disabled:bg-gray-100"
              />
            </div>

            {/* Tracking URL */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tracking URL
              </label>

              <input
                type="url"
                value={trackingUrl}
                onChange={(event) =>
                  setTrackingUrl(
                    event.target.value
                  )
                }
                disabled={
  fulfillmentBlocked ||
  shippingLocked
}
                placeholder="https://..."
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#AFC7B4] disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Fulfillment timestamps */}

          <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-gray-50 p-5 text-sm sm:grid-cols-2">
            <div>
              <p className="text-gray-400">
                Shipped At
              </p>

              <p className="mt-1 font-medium text-gray-700">
                {formatDate(
                  order.shipped_at
                )}
              </p>
            </div>

            <div>
              <p className="text-gray-400">
                Delivered At
              </p>

              <p className="mt-1 font-medium text-gray-700">
                {formatDate(
                  order.delivered_at
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              saveShippingInformation
            }
            disabled={
  fulfillmentBlocked ||
  shippingLocked
}
            className="mt-6 rounded-2xl bg-[#E8C9C1] px-6 py-3 text-sm font-semibold text-[#38435A] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingShipping
              ? "Saving..."
              : "Save Shipping Information"}
          </button>
        </div>

        {/* Order Items */}

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-xl font-semibold text-[#38435A]">
              Order Items
            </h2>
          </div>

          {items.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No items found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-6 py-4">
                      Product
                    </th>

                    <th className="px-6 py-4">
                      Price
                    </th>

                    <th className="px-6 py-4">
                      Quantity
                    </th>

                    <th className="px-6 py-4">
                      Subtotal
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t"
                    >
                      <td className="px-6 py-5">
                        <p className="font-medium text-[#38435A]">
                          {
                            item.product_name
                          }
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        RM{" "}
                        {Number(
                          item.price
                        ).toFixed(2)}
                      </td>

                      <td className="px-6 py-5">
                        {item.quantity}
                      </td>

                      <td className="px-6 py-5 font-semibold">
                        RM{" "}
                        {(
                          Number(
                            item.price
                          ) *
                          Number(
                            item.quantity
                          )
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Date */}

        <div className="mt-6 text-sm text-gray-500">
          Order Date:{" "}
          {new Date(
            order.created_at
          ).toLocaleString("en-MY")}
        </div>
      </div>
    </main>
  );
}