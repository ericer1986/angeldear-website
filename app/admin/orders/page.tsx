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

    setOrders(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // Filter orders
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

      return (
        matchesSearch &&
        matchesOrderStatus &&
        matchesPaymentStatus
      );
    });
  }, [
    orders,
    search,
    orderStatus,
    paymentStatus,
  ]);

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) =>
      order.order_status === "pending"
  ).length;

  const paidOrders = orders.filter(
    (order) =>
      order.payment_status === "paid"
  ).length;

  const totalSales = orders.reduce(
    (total, order) =>
      total + Number(order.total),
    0
  );

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-10">

      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
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

        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

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

          <div className="bg-white rounded-3xl p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Sales
            </p>

            <p className="mt-2 text-3xl font-bold text-[#AFC7B4]">
              RM {totalSales.toFixed(2)}
            </p>

          </div>

        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-8">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Search */}
            <div className="lg:col-span-1">

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

                <option value="completed">
                  Completed
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
                  setPaymentStatus(
                    e.target.value
                  )
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

                <option value="refunded">
                  Refunded
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
              }}
              className="text-sm font-medium text-[#38435A] hover:underline"
            >
              Clear Filters
            </button>

          </div>

        </div>

        {/* Error */}
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

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-3xl p-10 text-center">
            Loading orders...
          </div>
        )}

        {/* Orders */}
        {!loading &&
          !errorMessage && (
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">

              <div className="px-6 py-5 border-b">

                <h2 className="text-xl font-semibold text-[#38435A]">
                  Recent Orders
                </h2>

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
                          Date
                        </th>

                        <th className="px-6 py-4">
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {filteredOrders.map(
                        (order) => (

                          <tr
                            key={order.id}
                            className="border-t hover:bg-gray-50"
                          >

                            {/* Order */}
                            <td className="px-6 py-5">

                              <p className="font-mono text-xs text-gray-500">
                                {order.id.slice(
                                  0,
                                  8
                                )}
                              </p>

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
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                  order.payment_status ===
                                  "paid"
                                    ? "bg-green-100 text-green-700"
                                    : order.payment_status ===
                                      "failed"
                                    ? "bg-red-100 text-red-700"
                                    : order.payment_status ===
                                      "refunded"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {
                                  order.payment_status
                                }
                              </span>

                            </td>

                            {/* Order Status */}
                            <td className="px-6 py-5">

                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                  order.order_status ===
                                  "completed"
                                    ? "bg-green-100 text-green-700"
                                    : order.order_status ===
                                      "shipped"
                                    ? "bg-blue-100 text-blue-700"
                                    : order.order_status ===
                                      "processing"
                                    ? "bg-indigo-100 text-indigo-700"
                                    : order.order_status ===
                                      "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {
                                  order.order_status
                                }
                              </span>

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
                                className="inline-flex rounded-full bg-[#E8C9C1] px-4 py-2 text-xs font-medium text-[#38435A] hover:bg-[#DDB8AE] transition"
                              >
                                View
                              </Link>

                            </td>

                          </tr>

                        )
                      )}

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