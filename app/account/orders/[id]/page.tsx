"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import Link from "next/link";
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
  user_id: string | null;
  customer_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  created_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  price: number;
  quantity: number;
};

const orderSteps: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
];

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

function OrderProgress({
  paymentStatus,
  orderStatus,
}: {
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
}) {
  if (orderStatus === "cancelled") {
    return (
      <div className="rounded-2xl bg-red-50 px-5 py-4">
        <p className="font-semibold text-red-700">
          Order Cancelled
        </p>

        <p className="mt-1 text-sm text-red-600">
          This order has been cancelled.
        </p>
      </div>
    );
  }

  if (paymentStatus === "refunded") {
    return (
      <div className="rounded-2xl bg-blue-50 px-5 py-4">
        <p className="font-semibold text-blue-700">
          Payment Refunded
        </p>

        <p className="mt-1 text-sm text-blue-600">
          The payment for this order has been refunded.
        </p>
      </div>
    );
  }

  if (paymentStatus === "failed") {
    return (
      <div className="rounded-2xl bg-red-50 px-5 py-4">
        <p className="font-semibold text-red-700">
          Payment Failed
        </p>

        <p className="mt-1 text-sm text-red-600">
          The payment for this order was not successful.
        </p>
      </div>
    );
  }

  if (paymentStatus === "expired") {
    return (
      <div className="rounded-2xl bg-gray-100 px-5 py-4">
        <p className="font-semibold text-gray-700">
          Payment Expired
        </p>

        <p className="mt-1 text-sm text-gray-500">
          The payment session for this order has expired.
        </p>
      </div>
    );
  }

  if (paymentStatus !== "paid") {
    return (
      <div className="rounded-2xl bg-yellow-50 px-5 py-4">
        <p className="font-semibold text-yellow-700">
          Waiting for Payment
        </p>

        <p className="mt-1 text-sm text-yellow-600">
          Your order will be confirmed after payment is verified.
        </p>
      </div>
    );
  }

  const currentStep =
    orderSteps.indexOf(
      orderStatus
    );

  const steps = [
    {
      status: "pending",
      label: "Confirmed",
      description:
        "Payment confirmed",
    },
    {
      status: "processing",
      label: "Processing",
      description:
        "Preparing your order",
    },
    {
      status: "shipped",
      label: "Shipped",
      description:
        "Order dispatched",
    },
    {
      status: "delivered",
      label: "Delivered",
      description:
        "Order delivered",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#38435A]">
        Order Progress
      </h2>

      <div className="mt-7 grid grid-cols-4 gap-2">
        {steps.map(
          (step, index) => {
            const completed =
              index <= currentStep;

            return (
              <div
                key={step.status}
                className="text-center"
              >
                <div
                  className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                    completed
                      ? "bg-[#AFC7B4] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {completed
                    ? "✓"
                    : index + 1}
                </div>

                <p
                  className={`mt-3 text-sm ${
                    completed
                      ? "font-semibold text-[#38435A]"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>

                <p className="mt-1 hidden text-xs text-gray-400 sm:block">
                  {
                    step.description
                  }
                </p>
              </div>
            );
          }
        )}
      </div>

      <div className="mt-4 flex gap-1">
        {steps.map(
          (step, index) => (
            <div
              key={step.status}
              className={`h-1.5 flex-1 rounded-full ${
                index <= currentStep
                  ? "bg-[#AFC7B4]"
                  : "bg-gray-100"
              }`}
            />
          )
        )}
      </div>
    </div>
  );
}

export default function CustomerOrderDetailsPage() {
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

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      const user =
        session?.user;

      if (!user) {
        router.replace(
          "/login"
        );
        return;
      }

      const [
        orderResult,
        itemsResult,
      ] =
        await Promise.all([
          supabase
            .from("orders")
            .select(`
              id,
              user_id,
              customer_name,
              email,
              phone,
              address,
              city,
              postcode,
              subtotal,
              shipping,
              total,
              payment_status,
              order_status,
              created_at
            `)
            .eq(
              "id",
              orderId
            )
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle(),

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
              quantity
            `)
            .eq(
              "order_id",
              orderId
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
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
          orderResult.error
            .message
        );

        setLoading(false);
        return;
      }

      if (
        !orderResult.data
      ) {
        setErrorMessage(
          "Order not found or you do not have permission to view this order."
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
          itemsResult.error
            .message
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

    if (orderId) {
      loadOrder();
    }
  }, [orderId, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-gray-500">
            Loading order...
          </p>
        </div>
      </main>
    );
  }

  if (
    errorMessage ||
    !order
  ) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-3xl bg-white p-10 shadow-sm">
            <h1 className="text-3xl font-bold text-[#38435A]">
              Order Not Available
            </h1>

            <p className="mt-4 text-red-600">
              {errorMessage ||
                "Unable to load this order."}
            </p>

            <Link
              href="/account/orders"
              className="mt-8 inline-block rounded-full bg-[#E8C9C1] px-7 py-3 font-medium text-[#38435A]"
            >
              Back to My Orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-16">
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}

        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Angel Dear Malaysia
            </p>

            <h1 className="mt-2 text-4xl font-bold text-[#38435A]">
              Order Details
            </h1>

            <p className="mt-3 text-gray-500">
              Placed on{" "}
              {new Date(
                order.created_at
              ).toLocaleDateString(
                "en-MY",
                {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }
              )}
            </p>
          </div>

          <Link
            href="/account/orders"
            className="w-fit rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-[#38435A] hover:bg-gray-50"
          >
            Back to My Orders
          </Link>
        </div>

        {/* Order Information */}

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Order ID
              </p>

              <p className="mt-2 break-all font-medium text-[#38435A]">
                {order.id}
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-xs text-gray-400">
                Order Total
              </p>

              <p className="mt-1 text-2xl font-bold text-[#38435A]">
                RM{" "}
                {Number(
                  order.total
                ).toFixed(
                  2
                )}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-4 border-t pt-6">
            <div>
              <p className="mb-2 text-xs text-gray-400">
                Payment
              </p>

              <span
                className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${paymentStatusClass(
                  order.payment_status
                )}`}
              >
                {formatStatus(
                  order.payment_status
                )}
              </span>
            </div>

            <div>
              <p className="mb-2 text-xs text-gray-400">
                Order Status
              </p>

              <span
                className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${orderStatusClass(
                  order.order_status
                )}`}
              >
                {formatStatus(
                  order.order_status
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Progress */}

        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <OrderProgress
            paymentStatus={
              order.payment_status
            }
            orderStatus={
              order.order_status
            }
          />
        </div>

        {/* Customer + Delivery */}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[#38435A]">
              Customer Information
            </h2>

            <div className="mt-5 space-y-3 text-gray-600">
              <p>
                <span className="font-medium text-[#38435A]">
                  Name:
                </span>{" "}
                {
                  order.customer_name
                }
              </p>

              <p>
                <span className="font-medium text-[#38435A]">
                  Email:
                </span>{" "}
                {order.email ||
                  "-"}
              </p>

              <p>
                <span className="font-medium text-[#38435A]">
                  Phone:
                </span>{" "}
                {order.phone ||
                  "-"}
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[#38435A]">
              Delivery Address
            </h2>

            <div className="mt-5 leading-7 text-gray-600">
              <p>
                {order.address ||
                  "-"}
              </p>

              <p>
                {order.postcode ||
                  ""}{" "}
                {order.city ||
                  ""}
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}

        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-[#38435A]">
            Order Items
          </h2>

          {items.length ===
          0 ? (
            <p className="mt-6 text-gray-500">
              No items found
              for this order.
            </p>
          ) : (
            <div className="mt-6 divide-y divide-gray-100">
              {items.map(
                (item) => (
                  <div
                    key={
                      item.id
                    }
                    className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[#38435A]">
                        {
                          item.product_name
                        }
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        RM{" "}
                        {Number(
                          item.price
                        ).toFixed(
                          2
                        )}
                        {" × "}
                        {
                          item.quantity
                        }
                      </p>
                    </div>

                    <p className="font-semibold text-[#38435A]">
                      RM{" "}
                      {(
                        Number(
                          item.price
                        ) *
                        Number(
                          item.quantity
                        )
                      ).toFixed(
                        2
                      )}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Order Summary */}

        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-[#38435A]">
            Order Summary
          </h2>

          <div className="ml-auto mt-6 max-w-sm space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-500">
                Subtotal
              </span>

              <span>
                RM{" "}
                {Number(
                  order.subtotal
                ).toFixed(
                  2
                )}
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

            <div className="flex justify-between border-t pt-4 text-xl font-bold text-[#38435A]">
              <span>
                Total
              </span>

              <span>
                RM{" "}
                {Number(
                  order.total
                ).toFixed(
                  2
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Continue Shopping */}

        <div className="mt-8 text-center">
          <Link
            href="/shop"
            className="inline-block rounded-full bg-[#E8C9C1] px-8 py-3 font-medium text-[#38435A] hover:bg-[#DDB8AE]"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}