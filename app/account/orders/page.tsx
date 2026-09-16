"use client";

import {
  useEffect,
  useState,
} from "react";
import {
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
  customer_name: string;
  email: string | null;
  total: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  created_at: string;
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

function getStepIndex(
  status: OrderStatus
) {
  return orderSteps.indexOf(status);
}

function OrderProgress({
  order,
}: {
  order: Order;
}) {
  if (
    order.order_status === "cancelled"
  ) {
    return (
      <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3">
        <p className="text-sm font-medium text-red-700">
          This order has been cancelled.
        </p>
      </div>
    );
  }

  if (
    order.payment_status !== "paid"
  ) {
    return (
      <div className="mt-5 rounded-2xl bg-yellow-50 px-4 py-3">
        <p className="text-sm font-medium text-yellow-700">
          Waiting for payment confirmation.
        </p>
      </div>
    );
  }

  const currentStep =
    getStepIndex(
      order.order_status
    );

  const steps = [
    {
      status: "pending",
      label: "Confirmed",
    },
    {
      status: "processing",
      label: "Processing",
    },
    {
      status: "shipped",
      label: "Shipped",
    },
    {
      status: "delivered",
      label: "Delivered",
    },
  ];

  return (
    <div className="mt-6">
      <div className="grid grid-cols-4 gap-2">
        {steps.map(
          (step, index) => {
            const completed =
              index <=
              currentStep;

            return (
              <div
                key={
                  step.status
                }
                className="text-center"
              >
                <div
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    completed
                      ? "bg-[#AFC7B4] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {completed
                    ? "✓"
                    : index +
                      1}
                </div>

                <p
                  className={`mt-2 text-xs ${
                    completed
                      ? "font-medium text-[#38435A]"
                      : "text-gray-400"
                  }`}
                >
                  {
                    step.label
                  }
                </p>
              </div>
            );
          }
        )}
      </div>

      <div className="mt-3 flex gap-1">
        {steps.map(
          (step, index) => (
            <div
              key={
                step.status
              }
              className={`h-1 flex-1 rounded-full ${
                index <=
                currentStep
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

export default function MyOrdersPage() {
  const router =
    useRouter();

  const [
    orders,
    setOrders,
  ] =
    useState<Order[]>([]);

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
    async function loadOrders() {
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

      const {
        data,
        error,
      } =
        await supabase
          .from("orders")
          .select(`
            id,
            customer_name,
            email,
            total,
            payment_status,
            order_status,
            created_at
          `)
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      if (error) {
        console.error(
          "My Orders Error:",
          error
        );

        setErrorMessage(
          error.message
        );

        setLoading(false);
        return;
      }

      setOrders(
        (data ||
          []) as Order[]
      );

      setLoading(false);
    }

    loadOrders();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-gray-500">
            Loading your orders...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-16">
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}

        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Angel Dear Malaysia
            </p>

            <h1 className="mt-2 text-4xl font-bold text-[#38435A]">
              My Orders
            </h1>

            <p className="mt-3 text-gray-500">
              View your orders
              and delivery
              progress.
            </p>
          </div>

          <Link
            href="/account"
            className="self-start rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-[#38435A] hover:bg-gray-50"
          >
            Back to Account
          </Link>
        </div>

        {/* Error */}

        {errorMessage && (
          <div className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {/* No Orders */}

        {orders.length ===
        0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-[#38435A]">
              No orders yet
            </h2>

            <p className="mt-3 text-gray-500">
              You have not
              placed any
              orders yet.
            </p>

            <Link
              href="/shop"
              className="mt-6 inline-block rounded-full bg-[#E8C9C1] px-8 py-3 font-medium text-[#38435A] hover:bg-[#DDB8AE]"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(
              (order) => (
                <Link
                  key={
                    order.id
                  }
                  href={`/account/orders/${order.id}`}
                  className="block rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Top */}

                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Order ID
                      </p>

                      <p className="mt-1 break-all font-medium text-[#38435A]">
                        {
                          order.id
                        }
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        {new Date(
                          order.created_at
                        ).toLocaleDateString(
                          "en-MY",
                          {
                            day: "2-digit",
                            month:
                              "short",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xs text-gray-400">
                        Total
                      </p>

                      <p className="mt-1 text-xl font-bold text-[#38435A]">
                        RM{" "}
                        {Number(
                          order.total
                        ).toFixed(
                          2
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Status */}

                  <div className="mt-5 flex flex-wrap gap-3 border-t pt-5">
                    <div>
                      <p className="mb-2 text-xs text-gray-400">
                        Payment
                      </p>

                      <span
                        className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold ${paymentStatusClass(
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
                        Order
                        Status
                      </p>

                      <span
                        className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold ${orderStatusClass(
                          order.order_status
                        )}`}
                      >
                        {formatStatus(
                          order.order_status
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}

                  <OrderProgress
                    order={
                      order
                    }
                  />

                  <div className="mt-5 text-right">
                    <span className="text-sm font-medium text-[#38435A]">
                      View Order
                      Details →
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}