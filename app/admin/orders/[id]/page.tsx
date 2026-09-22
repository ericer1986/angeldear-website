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

  billplz_bill_id: string | null;
  paid_at: string | null;

  stock_deducted_at: string | null;

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

export default function AdminOrderDetailPage() {
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
    updating,
    setUpdating,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  async function loadOrder() {
    setLoading(true);
    setErrorMessage("");

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
            billplz_bill_id,
            paid_at,
            stock_deducted_at,
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
        orderResult.error
          .message
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

  async function updateOrderStatus(
    value: OrderStatus
  ) {
    if (!order) {
      return;
    }

    /*
      Payment Exception orders require
      manual review before fulfillment.
    */
    if (
      order.payment_exception &&
      value !== "pending" &&
      value !== "cancelled"
    ) {
      setErrorMessage(
        "This order requires manual payment review. Resolve the payment exception before fulfillment."
      );

      return;
    }

    /*
      Prevent accidental fulfillment
      of unpaid orders.

      Cancelled is still allowed.
    */
    if (
      order.payment_status !==
        "paid" &&
      value !== "pending" &&
      value !== "cancelled"
    ) {
      setErrorMessage(
        "This order has not been paid. Only Pending or Cancelled is allowed."
      );

      return;
    }

    setUpdating(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      error,
    } =
      await supabase
        .from("orders")
        .update({
          order_status:
            value,
        })
        .eq(
          "id",
          order.id
        );

    if (error) {
      console.error(
        "Update Order Status Error:",
        error
      );

      setErrorMessage(
        error.message
      );

      setUpdating(false);
      return;
    }

    setOrder({
      ...order,
      order_status:
        value,
    });

    setSuccessMessage(
      "Order status updated successfully."
    );

    setUpdating(false);

    window.setTimeout(
      () => {
        setSuccessMessage("");
      },
      3000
    );
  }

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

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

  if (
    errorMessage &&
    !order
  ) {
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

          <div className="rounded-3xl bg-red-50 p-8 text-red-600">
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
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl bg-white p-10 text-center">
            <h1 className="text-xl font-semibold text-[#38435A]">
              Order not found
            </h1>

            <button
              onClick={() =>
                router.push(
                  "/admin/orders"
                )
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
              Order Details
            </h1>

            <p className="mt-2 break-all font-mono text-sm text-gray-500">
              {order.id}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div
              className={`rounded-full px-5 py-3 text-sm font-semibold ${paymentStatusClass(
                order.payment_status
              )}`}
            >
              Payment:{" "}
              {formatStatus(
                order.payment_status
              )}
            </div>

            <select
              value={
                order.order_status
              }
              disabled={
                updating
              }
              onChange={(e) =>
                updateOrderStatus(
                  e.target
                    .value as OrderStatus
                )
              }
              className="rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#E8C9C1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="pending">
                Order: Pending
              </option>

              <option value="processing">
                Order: Processing
              </option>

              <option value="shipped">
                Order: Shipped
              </option>

              <option value="delivered">
                Order: Delivered
              </option>

              <option value="cancelled">
                Order: Cancelled
              </option>
            </select>
          </div>
        </div>

        {/* PAYMENT EXCEPTION ALERT */}

        {order.payment_exception && (
          <div className="mb-8 rounded-3xl border border-red-200 bg-red-50 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                  Payment Exception
                </p>

                <h2 className="mt-2 text-2xl font-bold text-red-700">
                  Manual Review Required
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-red-700">
                  Payment has been recorded,
                  but this order encountered
                  an inventory or payment
                  processing exception.
                  Do not fulfill this order
                  until the issue has been
                  reviewed.
                </p>
              </div>

              <span className="w-fit rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white">
                HOLD FULFILLMENT
              </span>
            </div>

            <div className="mt-5 grid gap-4 rounded-2xl bg-white p-5 md:grid-cols-2">
              <div>
                <p className="text-xs text-gray-400">
                  Exception Reason
                </p>

                <p className="mt-1 break-all font-mono text-sm font-semibold text-red-700">
                  {
                    order.payment_exception
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Exception At
                </p>

                <p className="mt-1 text-sm font-medium text-gray-700">
                  {order.payment_exception_at
                    ? new Date(
                        order.payment_exception_at
                      ).toLocaleString(
                        "en-MY"
                      )
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}

        {updating && (
          <div className="mb-5 rounded-2xl bg-blue-50 px-5 py-3 text-sm text-blue-600">
            Updating order...
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-2xl bg-green-50 px-5 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-2xl bg-red-50 px-5 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {/* Status Overview */}

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-400">
              Payment Status
            </p>

            <div className="mt-3">
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

            <p className="mt-4 text-xs leading-5 text-gray-400">
              Paid status is controlled
              by the verified Billplz
              payment callback.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-400">
              Order Status
            </p>

            <div className="mt-3">
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

            <p className="mt-4 text-xs leading-5 text-gray-400">
              Admin can manage
              fulfillment status after
              payment is confirmed.
            </p>
          </div>
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

          {/* Delivery Information */}

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

          {/* Order Summary */}

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

        {/* Payment Information */}

        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#38435A]">
            Payment Information
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-5 text-sm md:grid-cols-3">
            <div>
              <p className="text-gray-400">
                Billplz Bill ID
              </p>

              <p className="mt-1 break-all font-mono">
                {order.billplz_bill_id ||
                  "-"}
              </p>
            </div>

            <div>
              <p className="text-gray-400">
                Paid At
              </p>

              <p className="mt-1 font-medium">
                {order.paid_at
                  ? new Date(
                      order.paid_at
                    ).toLocaleString(
                      "en-MY"
                    )
                  : "-"}
              </p>
            </div>

            <div>
              <p className="text-gray-400">
                Stock Deducted At
              </p>

              <p className="mt-1 font-medium">
                {order.stock_deducted_at
                  ? new Date(
                      order.stock_deducted_at
                    ).toLocaleString(
                      "en-MY"
                    )
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Products */}

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

                          <p className="mt-1 break-all font-mono text-xs text-gray-400">
                            {
                              item.product_id
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