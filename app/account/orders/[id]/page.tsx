"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
};

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-MY");
}

function paymentClass(status: PaymentStatus) {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700";

    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "expired":
      return "bg-gray-100 text-gray-700";

    case "refunded":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function orderClass(status: OrderStatus) {
  switch (status) {
    case "processing":
      return "bg-blue-100 text-blue-700";

    case "shipped":
      return "bg-purple-100 text-purple-700";

    case "delivered":
      return "bg-green-100 text-green-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    case "pending":
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const [orderResult, itemResult] = await Promise.all([
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
            quantity
          `)
          .eq("order_id", orderId)
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (orderResult.error || !orderResult.data) {
        console.error(
          "Customer Order Error:",
          orderResult.error
        );

        setError("Unable to load this order.");
        setLoading(false);
        return;
      }

      if (itemResult.error) {
        console.error(
          "Customer Order Items Error:",
          itemResult.error
        );

        setError(itemResult.error.message);
        setLoading(false);
        return;
      }

      setOrder(orderResult.data as Order);
      setItems(
        (itemResult.data || []) as OrderItem[]
      );

      setLoading(false);
    }

    void loadOrder();
  }, [orderId, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
        <p className="text-gray-500">
          Loading order...
        </p>
      </main>
    );
  }

  if (!order || error) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm text-center max-w-lg w-full">
          <h2 className="text-2xl font-bold text-[#38435A]">
            Order unavailable
          </h2>

          <p className="mt-3 text-gray-500">
            {error ||
              "This order could not be found."}
          </p>

          <Link
            href="/account/orders"
            className="mt-6 inline-block rounded-full bg-[#E8C9C1] px-6 py-3 font-medium text-[#38435A] transition hover:opacity-90"
          >
            Back to My Orders
          </Link>
        </div>
      </main>
    );
  }

  const underReview =
    order.payment_status === "paid" &&
    Boolean(order.payment_exception);

  const showShipping =
    !underReview &&
    (order.order_status === "shipped" ||
      order.order_status === "delivered");

  const validTrackingUrl =
    order.tracking_url &&
    /^https?:\/\//i.test(order.tracking_url);

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-12">
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Angel Dear Malaysia
            </p>

            <h1 className="mt-1 text-4xl font-bold text-[#38435A]">
              My Order
            </h1>

            <p className="mt-2 text-gray-500">
              Order Date{" "}
              {new Date(
                order.created_at
              ).toLocaleDateString("en-MY")}
            </p>
          </div>

          <Link
            href="/account/orders"
            className="self-start rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-[#38435A] transition hover:bg-gray-50"
          >
            Back to My Orders
          </Link>
        </div>

        {/* Under Review */}

        {underReview && (
          <div className="mb-6 rounded-3xl border border-amber-300 bg-amber-50 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Payment Received
            </p>

            <h2 className="mt-2 text-2xl font-bold text-amber-800">
              Order Under Review
            </h2>

            <p className="mt-3 text-sm leading-6 text-amber-700">
              We have received your payment
              successfully. Your order requires a
              short manual review before processing.
              Our team will review your order as soon
              as possible.
            </p>
          </div>
        )}

        {/* Main Summary */}

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase text-gray-400">
                Order ID
              </p>

              <p className="mt-2 break-all font-mono text-sm">
                {order.id}
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-xs text-gray-400">
                Total
              </p>

              <p className="mt-1 text-3xl font-bold text-[#38435A]">
                RM{" "}
                {Number(
                  order.total
                ).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t pt-6">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${paymentClass(
                order.payment_status
              )}`}
            >
              Payment:{" "}
              {formatStatus(
                order.payment_status
              )}
            </span>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                underReview
                  ? "bg-amber-100 text-amber-800"
                  : orderClass(
                      order.order_status
                    )
              }`}
            >
              Order:{" "}
              {underReview
                ? "Under Review"
                : formatStatus(
                    order.order_status
                  )}
            </span>
          </div>
        </div>

        {/* Customer + Delivery */}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Customer */}

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#38435A]">
              Customer
            </h2>

            <div className="mt-4 space-y-3 text-sm">
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

                <p className="mt-1 break-all">
                  {order.email || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-400">
                  Phone
                </p>

                <p className="mt-1">
                  {order.phone || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Information */}

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#38435A]">
              Delivery Information
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-gray-400">
                  Address
                </p>

                <p className="mt-1 leading-6">
                  {order.address || "-"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">
                    City
                  </p>

                  <p className="mt-1">
                    {order.city || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-400">
                    State
                  </p>

                  <p className="mt-1">
                    {order.state || "-"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-gray-400">
                  Postcode
                </p>

                <p className="mt-1">
                  {order.postcode || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment */}

        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#38435A]">
            Payment
          </h2>

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-400">
                Payment Status
              </p>

              <span
                className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${paymentClass(
                  order.payment_status
                )}`}
              >
                {formatStatus(
                  order.payment_status
                )}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-400">
                Paid At
              </p>

              <p className="mt-2">
                {formatDate(order.paid_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Shipping & Tracking */}

        {showShipping && (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#AFC7B4]">
                  Delivery Update
                </p>

                <h2 className="mt-1 text-xl font-semibold text-[#38435A]">
                  Shipping & Tracking
                </h2>
              </div>

              <span
                className={`self-start rounded-full px-4 py-2 text-xs font-semibold ${
                  order.order_status ===
                  "delivered"
                    ? "bg-green-100 text-green-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {order.order_status ===
                "delivered"
                  ? "DELIVERED"
                  : "SHIPPED"}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#FAF8F6] p-4">
                <p className="text-sm text-gray-400">
                  Courier
                </p>

                <p className="mt-1 font-semibold text-[#38435A]">
                  {order.courier_name || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF8F6] p-4">
                <p className="text-sm text-gray-400">
                  Tracking Number
                </p>

                <p className="mt-1 break-all font-mono font-semibold text-[#38435A]">
                  {order.tracking_number ||
                    "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF8F6] p-4">
                <p className="text-sm text-gray-400">
                  Shipped At
                </p>

                <p className="mt-1 text-sm font-medium text-[#38435A]">
                  {formatDate(
                    order.shipped_at
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF8F6] p-4">
                <p className="text-sm text-gray-400">
                  Delivered At
                </p>

                <p className="mt-1 text-sm font-medium text-[#38435A]">
                  {order.delivered_at
                    ? formatDate(
                        order.delivered_at
                      )
                    : "Not delivered yet"}
                </p>
              </div>
            </div>

            {validTrackingUrl && (
              <a
                href={order.tracking_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-[#38435A] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Track Parcel →
              </a>
            )}
          </div>
        )}

        {/* Order Items */}

        <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
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
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[#38435A]">
                      {item.product_name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      RM{" "}
                      {Number(
                        item.price
                      ).toFixed(2)}{" "}
                      × {item.quantity}
                    </p>
                  </div>

                  <p className="font-semibold text-[#38435A]">
                    RM{" "}
                    {(
                      Number(item.price) *
                      Number(item.quantity)
                    ).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Summary */}

        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#38435A]">
            Order Summary
          </h2>

          <div className="mt-5 space-y-3">
            <div className="flex justify-between gap-4">
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

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">
                Shipping
              </span>

              <span>
                {Number(order.shipping) === 0
                  ? "FREE"
                  : `RM ${Number(
                      order.shipping
                    ).toFixed(2)}`}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-t pt-4 text-xl font-bold">
              <span>Total</span>

              <span className="text-[#38435A]">
                RM{" "}
                {Number(
                  order.total
                ).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}