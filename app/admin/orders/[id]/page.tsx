"use client";

import {
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

function formatStatus(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
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

function getOrderMessage(
  order: Order
) {
  if (
    order.payment_status ===
      "paid" &&
    order.payment_exception
  ) {
    return {
      title:
        "Payment Received — Order Under Review",
      description:
        "We have received your payment successfully. Your order requires a short manual review before processing. Our team will review the order before fulfillment.",
      className:
        "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (
    order.payment_status ===
    "pending"
  ) {
    return {
      title:
        "Payment Pending",
      description:
        "Your order has been created and is awaiting payment confirmation.",
      className:
        "border-yellow-200 bg-yellow-50 text-yellow-800",
    };
  }

  if (
    order.payment_status ===
    "expired"
  ) {
    return {
      title:
        "Payment Expired",
      description:
        "The payment window for this order has expired. This order will not be processed.",
      className:
        "border-gray-200 bg-gray-50 text-gray-700",
    };
  }

  if (
    order.payment_status ===
    "failed"
  ) {
    return {
      title:
        "Payment Failed",
      description:
        "The payment for this order was not completed successfully.",
      className:
        "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (
    order.payment_status ===
    "refunded"
  ) {
    return {
      title:
        "Payment Refunded",
      description:
        "The payment for this order has been refunded.",
      className:
        "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (
    order.order_status ===
    "cancelled"
  ) {
    return {
      title:
        "Order Cancelled",
      description:
        "This order has been cancelled.",
      className:
        "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (
    order.order_status ===
    "processing"
  ) {
    return {
      title:
        "Order Processing",
      description:
        "Your payment has been confirmed and we are preparing your order.",
      className:
        "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (
    order.order_status ===
    "shipped"
  ) {
    return {
      title:
        "Order Shipped",
      description:
        "Your order has been shipped and is on the way.",
      className:
        "border-purple-200 bg-purple-50 text-purple-700",
    };
  }

  if (
    order.order_status ===
    "delivered"
  ) {
    return {
      title:
        "Order Delivered",
      description:
        "Your order has been marked as delivered.",
      className:
        "border-green-200 bg-green-50 text-green-700",
    };
  }

  return {
    title:
      "Payment Confirmed",
    description:
      "Your payment has been confirmed. We will begin processing your order shortly.",
    className:
      "border-green-200 bg-green-50 text-green-700",
  };
}

export default function CustomerOrderDetailPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const orderId =
    params.id as string;

  const [
    order,
    setOrder,
  ] =
    useState<Order | null>(
      null
    );

  const [
    items,
    setItems,
  ] =
    useState<OrderItem[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  async function loadOrder() {
    setLoading(true);
    setErrorMessage("");

    /*
      RLS protects this query.

      Customers can only read
      their own orders.
    */
    const [
      orderResult,
      itemsResult,
    ] =
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
            created_at
          `)
          .eq(
            "id",
            orderId
          )
          .single(),

        supabase
          .from(
            "order_items"
          )
          .select(`
            id,
            order_id,
            product_id,
            product_name,
            price,
            quantity,
            created_at
          `)
          .eq(
            "order_id",
            orderId
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          ),
      ]);

    if (
      orderResult.error
    ) {
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

    if (
      itemsResult.error
    ) {
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

    setOrder(
      orderResult.data as Order
    );

    setItems(
      (itemsResult.data ||
        []) as OrderItem[]
    );

    setLoading(false);
  }

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">
              Loading order...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (
    errorMessage ||
    !order
  ) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-10">
        <div className="mx-auto max-w-6xl px-6">
          <button
            onClick={() =>
              router.push(
                "/account/orders"
              )
            }
            className="mb-6 text-sm text-gray-500 hover:text-[#38435A]"
          >
            ← Back to My Orders
          </button>

          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-[#38435A]">
              Order unavailable
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {errorMessage ||
                "This order could not be found."}
            </p>

            <button
              onClick={() =>
                router.push(
                  "/account/orders"
                )
              }
              className="mt-6 rounded-full bg-[#E8C9C1] px-6 py-3 text-sm font-semibold text-[#38435A]"
            >
              Back to My Orders
            </button>
          </div>
        </div>
      </main>
    );
  }

  const statusMessage =
    getOrderMessage(
      order
    );

  const isUnderReview =
    order.payment_status ===
      "paid" &&
    Boolean(
      order.payment_exception
    );

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-10">
      <div className="mx-auto max-w-6xl px-6">
        {/* Back */}

        <button
          onClick={() =>
            router.push(
              "/account/orders"
            )
          }
          className="mb-6 text-sm text-gray-500 hover:text-[#38435A]"
        >
          ← Back to My Orders
        </button>

        {/* Header */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Angel Dear Malaysia
            </p>

            <h1 className="mt-1 text-4xl font-bold text-[#38435A]">
              My Order
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

            {!isUnderReview && (
              <span
                className={`rounded-full px-5 py-3 text-sm font-semibold ${orderStatusClass(
                  order.order_status
                )}`}
              >
                Order:{" "}
                {formatStatus(
                  order.order_status
                )}
              </span>
            )}

            {isUnderReview && (
              <span className="rounded-full bg-amber-100 px-5 py-3 text-sm font-semibold text-amber-800">
                Order: Under Review
              </span>
            )}
          </div>
        </div>

        {/* Customer Status Message */}

        <div
          className={`mb-8 rounded-3xl border p-6 ${statusMessage.className}`}
        >
          <h2 className="text-xl font-bold">
            {
              statusMessage.title
            }
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6">
            {
              statusMessage.description
            }
          </p>
        </div>

        {/* Customer / Delivery / Summary */}

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Customer */}

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#38435A]">
              Customer
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <div>
                <p className="text-gray-400">
                  Name
                </p>

                <p className="font-medium">
                  {
                    order.customer_name
                  }
                </p>
              </div>

              <div>
                <p className="text-gray-400">
                  Email
                </p>

                <p className="break-all font-medium">
                  {order.email ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-400">
                  Phone
                </p>

                <p className="font-medium">
                  {order.phone ||
                    "-"}
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
                  {order.address ||
                    "-"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">
                    City
                  </p>

                  <p className="mt-1 font-medium">
                    {order.city ||
                      "-"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-400">
                    State
                  </p>

                  <p className="mt-1 font-medium">
                    {order.state ||
                      "-"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-gray-400">
                  Postcode
                </p>

                <p className="mt-1 font-medium">
                  {order.postcode ||
                    "-"}
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
                      ).toFixed(
                        2
                      )}`}
                </span>
              </div>

              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>
                  Total
                </span>

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

        {/* Payment */}

        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#38435A]">
            Payment
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-5 text-sm md:grid-cols-2">
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
                {order.paid_at
                  ? new Date(
                      order.paid_at
                    ).toLocaleString(
                      "en-MY"
                    )
                  : "-"}
              </p>
            </div>
          </div>

          {isUnderReview && (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Your payment has been
              received. Our team is
              reviewing your order
              before fulfillment.
            </div>
          )}
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
                  {items.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
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
                          {
                            item.quantity
                          }
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
                    )
                  )}
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
          ).toLocaleString(
            "en-MY"
          )}
        </div>
      </div>
    </main>
  );
}