"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  state: string;
  subtotal: number;
  shipping: number;
  total: number;
  payment_status: string;
  order_status: string;
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

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadOrder() {
    setLoading(true);
    setErrorMessage("");

    const [orderResult, itemsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single(),

      supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", {
          ascending: true,
        }),
    ]);

    if (orderResult.error) {
      console.error("Order Error:", orderResult.error);

      setErrorMessage(orderResult.error.message);
      setLoading(false);

      return;
    }

    if (itemsResult.error) {
      console.error(
        "Order Items Error:",
        itemsResult.error
      );

      setErrorMessage(itemsResult.error.message);
      setLoading(false);

      return;
    }

    setOrder(orderResult.data);
    setItems(itemsResult.data || []);

    setLoading(false);
  }

  async function updateOrderStatus(
    field: "payment_status" | "order_status",
    value: string
  ) {
    if (!order) return;

    setUpdating(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("orders")
      .update({
        [field]: value,
      })
      .eq("id", order.id);

    if (error) {
      console.error(
        "Update Order Error:",
        error
      );

      setErrorMessage(error.message);
      setUpdating(false);

      return;
    }

    setOrder({
      ...order,
      [field]: value,
    });

    setSuccessMessage(
      "Order updated successfully."
    );

    setUpdating(false);

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-10">
        <div className="max-w-7xl mx-auto px-6">

          <div className="bg-white rounded-3xl shadow-sm p-10 text-center">

            <p className="text-gray-500">
              Loading order...
            </p>

          </div>

        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-10">
        <div className="max-w-7xl mx-auto px-6">

          <button
            onClick={() =>
              router.push("/admin/orders")
            }
            className="mb-6 text-sm text-gray-500 hover:text-[#38435A]"
          >
            ← Back to Orders
          </button>

          <div className="bg-red-50 rounded-3xl p-8 text-red-600">

            <h1 className="text-xl font-semibold">
              Database Error
            </h1>

            <p className="mt-2">
              {errorMessage}
            </p>

          </div>

        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-10">
        <div className="max-w-7xl mx-auto px-6">

          <div className="bg-white rounded-3xl p-10 text-center">

            <h1 className="text-xl font-semibold text-[#38435A]">
              Order not found
            </h1>

            <button
              onClick={() =>
                router.push("/admin/orders")
              }
              className="mt-5 rounded-full bg-[#E8C9C1] px-6 py-3"
            >
              Back to Orders
            </button>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-10">

      <div className="max-w-7xl mx-auto px-6">

        {/* Back */}
        <button
          onClick={() =>
            router.push("/admin/orders")
          }
          className="mb-6 text-sm text-gray-500 hover:text-[#38435A]"
        >
          ← Back to Orders
        </button>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

          <div>

            <p className="text-sm text-gray-500">
              Angel Dear Malaysia
            </p>

            <h1 className="mt-1 text-4xl font-bold text-[#38435A]">
              Order Details
            </h1>

            <p className="mt-2 text-sm text-gray-500 font-mono">
              {order.id}
            </p>

          </div>

          {/* Status Controls */}
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Payment Status */}
            <select
              value={order.payment_status}
              disabled={updating}
              onChange={(e) =>
                updateOrderStatus(
                  "payment_status",
                  e.target.value
                )
              }
              className="rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#E8C9C1]"
            >

              <option value="pending">
                Payment: Pending
              </option>

              <option value="paid">
                Payment: Paid
              </option>

              <option value="failed">
                Payment: Failed
              </option>

              <option value="refunded">
                Payment: Refunded
              </option>

            </select>

            {/* Order Status */}
            <select
              value={order.order_status}
              disabled={updating}
              onChange={(e) =>
                updateOrderStatus(
                  "order_status",
                  e.target.value
                )
              }
              className="rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#E8C9C1]"
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

              <option value="completed">
                Completed
              </option>

              <option value="cancelled">
                Cancelled
              </option>

            </select>

          </div>

        </div>

        {/* Updating */}
        {updating && (
          <div className="mb-5 rounded-2xl bg-blue-50 px-5 py-3 text-sm text-blue-600">
            Updating order...
          </div>
        )}

        {/* Success */}
        {successMessage && (
          <div className="mb-5 rounded-2xl bg-green-50 px-5 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {/* Error */}
        {errorMessage && (
          <div className="mb-5 rounded-2xl bg-red-50 px-5 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {/* Customer Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Customer */}
          <div className="bg-white rounded-3xl shadow-sm p-6">

            <h2 className="text-lg font-semibold text-[#38435A]">
              Customer
            </h2>

            <div className="mt-5 space-y-3 text-sm">

              <div>
                <p className="text-gray-400">
                  Name
                </p>

                <p className="font-medium">
                  {order.customer_name}
                </p>
              </div>

              <div>
                <p className="text-gray-400">
                  Email
                </p>

                <p className="font-medium">
                  {order.email}
                </p>
              </div>

              <div>
                <p className="text-gray-400">
                  Phone
                </p>

                <p className="font-medium">
                  {order.phone}
                </p>
              </div>

            </div>

          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-3xl shadow-sm p-6">

            <h2 className="text-lg font-semibold text-[#38435A]">
              Shipping Address
            </h2>

            <div className="mt-5 text-sm leading-6">

              <p>
                {order.address}
              </p>

              <p>
                {order.postcode} {order.city}
              </p>

              <p>
                {order.state}
              </p>

            </div>

          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-3xl shadow-sm p-6">

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
                  {Number(order.subtotal).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Shipping
                </span>

                <span>
                  RM{" "}
                  {Number(order.shipping).toFixed(2)}
                </span>
              </div>

              <div className="border-t pt-3 flex justify-between text-lg font-bold">

                <span>
                  Total
                </span>

                <span className="text-[#AFC7B4]">
                  RM{" "}
                  {Number(order.total).toFixed(2)}
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* Products */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b">

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
                          {item.product_name}
                        </p>

                        <p className="mt-1 text-xs text-gray-400 font-mono">
                          {item.product_id}
                        </p>

                      </td>

                      <td className="px-6 py-5">
                        RM{" "}
                        {Number(item.price).toFixed(2)}
                      </td>

                      <td className="px-6 py-5">
                        {item.quantity}
                      </td>

                      <td className="px-6 py-5 font-semibold">

                        RM{" "}
                        {(
                          Number(item.price) *
                          Number(item.quantity)
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