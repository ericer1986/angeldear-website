"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
  payment_status: string;
  order_status: string;
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

export default function CustomerOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      setErrorMessage("");

      /*
        1. Check customer login
      */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      /*
        2. Load order + order items
        RLS will make sure the customer
        can only read their own order.
      */
      const [orderResult, itemsResult] = await Promise.all([
        supabase
          .from("orders")
          .select(
            `
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
            `
          )
          .eq("id", orderId)
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("order_items")
          .select(
            `
              id,
              order_id,
              product_id,
              product_name,
              price,
              quantity
            `
          )
          .eq("order_id", orderId)
          .order("created_at", {
            ascending: true,
          }),
      ]);

      /*
        3. Order error
      */
      if (orderResult.error) {
        console.error(
          "Order Error:",
          orderResult.error
        );

        setErrorMessage(
          orderResult.error.message
        );

        setLoading(false);
        return;
      }

      /*
        4. Order not found
      */
      if (!orderResult.data) {
        setErrorMessage(
          "Order not found or you do not have permission to view this order."
        );

        setLoading(false);
        return;
      }

      /*
        5. Order items error
      */
      if (itemsResult.error) {
        console.error(
          "Order Items Error:",
          itemsResult.error
        );

        setErrorMessage(
          itemsResult.error.message
        );

        setLoading(false);
        return;
      }

      setOrder(orderResult.data);
      setItems(itemsResult.data || []);
      setLoading(false);
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId, router]);

  /*
    Loading
  */
  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-16">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-gray-500">
            Loading order...
          </p>
        </div>
      </main>
    );
  }

  /*
    Error / Order Not Found
  */
  if (errorMessage || !order) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-16">
        <div className="max-w-5xl mx-auto px-6">

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

      <div className="max-w-5xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-10">

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

          <p className="text-xs uppercase tracking-wide text-gray-400">
            Order ID
          </p>

          <p className="mt-2 break-all font-medium text-[#38435A]">
            {order.id}
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">

            <div>
              <p className="text-sm text-gray-400">
                Payment Status
              </p>

              <p className="mt-1 text-lg font-semibold capitalize text-[#38435A]">
                {order.payment_status}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400">
                Order Status
              </p>

              <p className="mt-1 text-lg font-semibold capitalize text-[#38435A]">
                {order.order_status}
              </p>
            </div>

          </div>

        </div>

        {/* Customer + Delivery */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">

          {/* Customer Information */}
          <div className="rounded-3xl bg-white p-8 shadow-sm">

            <h2 className="text-xl font-semibold text-[#38435A]">
              Customer Information
            </h2>

            <div className="mt-5 space-y-3 text-gray-600">

              <p>
                <span className="font-medium text-[#38435A]">
                  Name:
                </span>{" "}
                {order.customer_name}
              </p>

              <p>
                <span className="font-medium text-[#38435A]">
                  Email:
                </span>{" "}
                {order.email || "-"}
              </p>

              <p>
                <span className="font-medium text-[#38435A]">
                  Phone:
                </span>{" "}
                {order.phone || "-"}
              </p>

            </div>

          </div>

          {/* Delivery Address */}
          <div className="rounded-3xl bg-white p-8 shadow-sm">

            <h2 className="text-xl font-semibold text-[#38435A]">
              Delivery Address
            </h2>

            <div className="mt-5 leading-7 text-gray-600">

              <p>{order.address || "-"}</p>

              <p>
                {order.postcode}{" "}
                {order.city}
              </p>

            </div>

          </div>

        </div>

        {/* Order Items */}
        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-semibold text-[#38435A]">
            Order Items
          </h2>

          {items.length === 0 ? (

            <p className="mt-6 text-gray-500">
              No items found for this order.
            </p>

          ) : (

            <div className="mt-6 divide-y divide-gray-100">

              {items.map((item) => (

                <div
                  key={item.id}
                  className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div>

                    <p className="font-semibold text-[#38435A]">
                      {item.product_name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      RM{" "}
                      {Number(
                        item.price
                      ).toFixed(2)}
                      {" × "}
                      {item.quantity}
                    </p>

                  </div>

                  <p className="font-semibold text-[#38435A]">
                    RM{" "}
                    {(
                      Number(item.price) *
                      item.quantity
                    ).toFixed(2)}
                  </p>

                </div>

              ))}

            </div>

          )}

        </div>

        {/* Order Summary */}
        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-semibold text-[#38435A]">
            Order Summary
          </h2>

          <div className="mt-6 ml-auto max-w-sm space-y-4">

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
                {Number(order.shipping) === 0
                  ? "FREE"
                  : `RM ${Number(
                      order.shipping
                    ).toFixed(2)}`}
              </span>
            </div>

            <div className="flex justify-between border-t pt-4 text-xl font-bold text-[#38435A]">
              <span>Total</span>

              <span>
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