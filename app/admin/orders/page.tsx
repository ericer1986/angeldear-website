"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Order = {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  city: string;
  postcode: string;
  subtotal: number;
  shipping: number;
  total: number;
  payment_status: string;
  order_status: string;
  created_at: string;

  // Payment / expiry race protection
  payment_exception: string | null;
  payment_exception_at: string | null;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Search
  const [search, setSearch] = useState("");

  // Filters
  const [orderStatus, setOrderStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");

  // Manual review filter
  const [reviewFilter, setReviewFilter] = useState("all");

  async function loadOrders() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Orders Error:", error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setOrders((data || []) as Order[]);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // =========================================
  // Filter orders
  // =========================================

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !keyword ||
        order.customer_name
          ?.toLowerCase()
          .includes(keyword) ||
        order.email
          ?.toLowerCase()
          .includes(keyword) ||
        order.phone
          ?.toLowerCase()
          .includes(keyword) ||
        order.id
          ?.toLowerCase()
          .includes(keyword);

      const matchesOrderStatus =
        orderStatus === "all" ||
        order.order_status === orderStatus;

      const matchesPaymentStatus =
        paymentStatus === "all" ||
        order.payment_status === paymentStatus;

      const hasPaymentException =
        Boolean(order.payment_exception);

      const matchesReviewFilter =
        reviewFilter === "all" ||
        (reviewFilter === "review" &&
          hasPaymentException) ||
        (reviewFilter === "normal" &&
          !hasPaymentException);

      return (
        matchesSearch &&
        matchesOrderStatus &&
        matchesPaymentStatus &&
        matchesReviewFilter
      );
    });
  }, [
    orders,
    search,
    orderStatus,
    paymentStatus,
    reviewFilter,
  ]);

  // =========================================
  // Statistics
  // =========================================

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) => order.order_status === "pending"
  ).length;

  const paidOrders = orders.filter(
    (order) => order.payment_status === "paid"
  ).length;

  const manualReviewOrders = orders.filter(
    (order) => Boolean(order.payment_exception)
  ).length;

  const totalSales = orders
    .filter((order) => order.payment_status === "paid")
    .reduce(
      (total, order) =>
        total + Number(order.total),
      0
    );

  // =========================================
  // Payment badge
  // =========================================

  function getPaymentBadge(status: string) {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";

      case "failed":
        return "bg-red-100 text-red-700";

      case "refunded":
        return "bg-purple-100 text-purple-700";

      case "expired":
        return "bg-gray-100 text-gray-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  // =========================================
  // Order status badge
  // =========================================

  function getOrderBadge(status: string) {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-700";

      case "shipped":
        return "bg-blue-100 text-blue-700";

      case "processing":
        return "bg-indigo-100 text-indigo-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-10">
      <div className="max-w-7xl mx-auto px-6">

        {/* =====================================
            Header
        ====================================== */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <p className="text-sm text-gray-500">
              Angel Dear Malaysia
            </p>

            <h1 className="text-4xl font-bold text-[#38435A]">
              Orders
            </h1>
          </div>

          <button
            onClick={loadOrders}
            className="rounded-full bg-[#E8C9C1] px-6 py-3 font-medium hover:bg-[#DDB8AE] transition"
          >
            Refresh Orders
          </button>
        </div>

        {/* =====================================
            Payment Exception Alert
        ====================================== */}

        {manualReviewOrders > 0 && (
          <div className="mb-8 rounded-3xl border border-red-200 bg-red-50 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
                  Payment Exception
                </p>

                <h2 className="mt-1 text-xl font-bold text-red-700">
                  Manual Review Required
                </h2>

                <p className="mt-2 text-sm text-red-600">
                  {manualReviewOrders} order
                  {manualReviewOrders === 1 ? "" : "s"}{" "}
                  received a payment exception and require
                  administrator review.
                </p>
              </div>

              <button
                onClick={() => {
                  setReviewFilter("review");
                  setOrderStatus("all");
                  setPaymentStatus("all");
                  setSearch("");
                }}
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 transition"
              >
                Review Exceptions
              </button>

            </div>
          </div>
        )}

        {/* =====================================
            Statistics
        ====================================== */}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-10">

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Orders
            </p>

            <p className="mt-2 text-3xl font-bold text-[#38435A]">
              {totalOrders}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Pending Orders
            </p>

            <p className="mt-2 text-3xl font-bold text-[#38435A]">
              {pendingOrders}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Paid Orders
            </p>

            <p className="mt-2 text-3xl font-bold text-[#38435A]">
              {paidOrders}
            </p>
          </div>

          <div
            className={`rounded-3xl p-6 shadow-sm ${
              manualReviewOrders > 0
                ? "border border-red-200 bg-red-50"
                : "bg-white"
            }`}
          >
            <p
              className={`text-sm ${
                manualReviewOrders > 0
                  ? "font-medium text-red-600"
                  : "text-gray-500"
              }`}
            >
              Manual Review
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${
                manualReviewOrders > 0
                  ? "text-red-600"
                  : "text-[#38435A]"
              }`}
            >
              {manualReviewOrders}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Paid Sales
            </p>

            <p className="mt-2 text-3xl font-bold text-[#AFC7B4]">
              RM {totalSales.toFixed(2)}
            </p>
          </div>

        </div>

        {/* =====================================
            Search & Filters
        ====================================== */}

        <div className="bg-white rounded-3xl shadow-sm p-6 mb-8">

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

            {/* Search */}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Search Orders
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Customer, email, phone or order ID"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8C9C1]"
              />
            </div>

            {/* Order Status */}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Order Status
              </label>

              <select
                value={orderStatus}
                onChange={(e) =>
                  setOrderStatus(e.target.value)
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8C9C1]"
              >
                <option value="all">
                  All Orders
                </option>

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
            </div>

            {/* Payment Status */}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Payment Status
              </label>

              <select
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(e.target.value)
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8C9C1]"
              >
                <option value="all">
                  All Payments
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="paid">
                  Paid
                </option>

                <option value="failed">
                  Failed
                </option>

                <option value="expired">
                  Expired
                </option>

                <option value="refunded">
                  Refunded
                </option>
              </select>
            </div>

            {/* Manual Review */}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Payment Review
              </label>

              <select
                value={reviewFilter}
                onChange={(e) =>
                  setReviewFilter(e.target.value)
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8C9C1]"
              >
                <option value="all">
                  All
                </option>

                <option value="review">
                  Manual Review Required
                </option>

                <option value="normal">
                  No Exception
                </option>
              </select>
            </div>

          </div>

          {/* Filter Result */}

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-[#38435A]">
                {filteredOrders.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#38435A]">
                {totalOrders}
              </span>{" "}
              orders
            </p>

            <button
              onClick={() => {
                setSearch("");
                setOrderStatus("all");
                setPaymentStatus("all");
                setReviewFilter("all");
              }}
              className="text-sm font-medium text-[#38435A] hover:underline"
            >
              Clear Filters
            </button>

          </div>

        </div>

        {/* =====================================
            Error
        ====================================== */}

        {errorMessage && (
          <div className="mb-6 rounded-2xl bg-red-50 p-5 text-red-600">
            <p className="font-semibold">
              Database Error
            </p>

            <p className="mt-1 text-sm">
              {errorMessage}
            </p>
          </div>
        )}

        {/* =====================================
            Loading
        ====================================== */}

        {loading && (
          <div className="bg-white rounded-3xl p-10 text-center">
            Loading orders...
          </div>
        )}

        {/* =====================================
            Orders
        ====================================== */}

        {!loading && !errorMessage && (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">

            <div className="px-6 py-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

              <h2 className="text-xl font-semibold text-[#38435A]">
                Recent Orders
              </h2>

              {manualReviewOrders > 0 && (
                <span className="text-sm font-medium text-red-600">
                  {manualReviewOrders} require manual review
                </span>
              )}

            </div>

            {filteredOrders.length === 0 ? (

              <div className="p-10 text-center">
                <p className="text-gray-500">
                  No orders found.
                </p>

                <button
                  onClick={() => {
                    setSearch("");
                    setOrderStatus("all");
                    setPaymentStatus("all");
                    setReviewFilter("all");
                  }}
                  className="mt-4 rounded-full bg-[#E8C9C1] px-5 py-2 text-sm font-medium"
                >
                  Clear Filters
                </button>
              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead className="bg-gray-50">
                    <tr className="text-left">

                      <th className="px-6 py-4">
                        Order
                      </th>

                      <th className="px-6 py-4">
                        Customer
                      </th>

                      <th className="px-6 py-4">
                        Contact
                      </th>

                      <th className="px-6 py-4">
                        Total
                      </th>

                      <th className="px-6 py-4">
                        Payment
                      </th>

                      <th className="px-6 py-4">
                        Status
                      </th>

                      <th className="px-6 py-4">
                        Review
                      </th>

                      <th className="px-6 py-4">
                        Date
                      </th>

                      <th className="px-6 py-4">
                        Action
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {filteredOrders.map((order) => {
                      const hasPaymentException =
                        Boolean(
                          order.payment_exception
                        );

                      return (
                        <tr
                          key={order.id}
                          className={`border-t ${
                            hasPaymentException
                              ? "bg-red-50 hover:bg-red-100"
                              : "hover:bg-gray-50"
                          }`}
                        >

                          {/* Order */}

                          <td className="px-6 py-5">

                            <p className="font-mono text-xs text-gray-500">
                              {order.id.slice(0, 8)}
                            </p>

                            {hasPaymentException && (
                              <p className="mt-2 text-xs font-bold text-red-600">
                                PAYMENT EXCEPTION
                              </p>
                            )}

                          </td>

                          {/* Customer */}

                          <td className="px-6 py-5">

                            <p className="font-semibold text-[#38435A]">
                              {order.customer_name}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              {order.city}{" "}
                              {order.postcode}
                            </p>

                          </td>

                          {/* Contact */}

                          <td className="px-6 py-5">

                            <p>
                              {order.phone}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              {order.email}
                            </p>

                          </td>

                          {/* Total */}

                          <td className="px-6 py-5 font-semibold">
                            RM{" "}
                            {Number(
                              order.total
                            ).toFixed(2)}
                          </td>

                          {/* Payment */}

                          <td className="px-6 py-5">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentBadge(
                                order.payment_status
                              )}`}
                            >
                              {order.payment_status}
                            </span>

                          </td>

                          {/* Order Status */}

                          <td className="px-6 py-5">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getOrderBadge(
                                order.order_status
                              )}`}
                            >
                              {order.order_status}
                            </span>

                          </td>

                          {/* Review */}

                          <td className="px-6 py-5">

                            {hasPaymentException ? (
                              <div className="min-w-[170px]">

                                <span className="inline-flex rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                                  MANUAL REVIEW
                                </span>

                                <p className="mt-2 max-w-[220px] break-words text-xs font-medium text-red-600">
                                  {order.payment_exception}
                                </p>

                                {order.payment_exception_at && (
                                  <p className="mt-1 text-xs text-red-500">
                                    {new Date(
                                      order.payment_exception_at
                                    ).toLocaleString(
                                      "en-MY"
                                    )}
                                  </p>
                                )}

                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">
                                —
                              </span>
                            )}

                          </td>

                          {/* Date */}

                          <td className="px-6 py-5 text-gray-500 whitespace-nowrap">

                            {new Date(
                              order.created_at
                            ).toLocaleDateString(
                              "en-MY"
                            )}

                          </td>

                          {/* Action */}

                          <td className="px-6 py-5">

                            <Link
                              href={`/admin/orders/${order.id}`}
                              className={`inline-flex rounded-full px-4 py-2 text-xs font-medium transition ${
                                hasPaymentException
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "bg-[#E8C9C1] text-[#38435A] hover:bg-[#DDB8AE]"
                              }`}
                            >
                              {hasPaymentException
                                ? "Review"
                                : "View"}
                            </Link>

                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>

            )}

          </div>
        )}

      </div>
    </main>
  );
}