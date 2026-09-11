"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  customer_name: string;
  email: string | null;
  total: number;
  payment_status: string;
  order_status: string;
  created_at: string;
};

export default function MyOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, customer_name, email, total, payment_status, order_status, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("My Orders Error:", error);
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setOrders(data || []);
      setLoading(false);
    }

    loadOrders();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-16">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-gray-500">
            Loading your orders...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-16">
      <div className="max-w-5xl mx-auto px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">

          <div>
            <p className="text-sm text-gray-500">
              Angel Dear Malaysia
            </p>

            <h1 className="mt-2 text-4xl font-bold text-[#38435A]">
              My Orders
            </h1>

            <p className="mt-3 text-gray-500">
              View your recent Angel Dear orders.
            </p>
          </div>

          <Link
            href="/account"
            className="rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-[#38435A] hover:bg-gray-50"
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
        {orders.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">

            <h2 className="text-2xl font-semibold text-[#38435A]">
              No orders yet
            </h2>

            <p className="mt-3 text-gray-500">
              You have not placed any orders yet.
            </p>

            <Link
              href="/shop"
              className="mt-6 inline-block rounded-full bg-[#E8C9C1] px-8 py-3 font-medium text-[#38435A] hover:bg-[#DDB8AE]"
            >
              Start Shopping
            </Link>

          </div>
        ) : (

          /* Orders */
          <div className="space-y-5">

            {orders.map((order) => (

              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-3xl bg-white p-6 shadow-sm transition hover:shadow-md"
              >

                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                  {/* Order Info */}
                  <div>

                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Order ID
                    </p>

                    <p className="mt-1 break-all font-medium text-[#38435A]">
                      {order.id}
                    </p>

                    <p className="mt-3 text-sm text-gray-500">
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

                  {/* Order Summary */}
                  <div className="grid grid-cols-2 gap-6 md:grid-cols-3">

                    {/* Total */}
                    <div>

                      <p className="text-xs text-gray-400">
                        Total
                      </p>

                      <p className="mt-1 font-semibold text-[#38435A]">
                        RM{" "}
                        {Number(
                          order.total
                        ).toFixed(2)}
                      </p>

                    </div>

                    {/* Payment */}
                    <div>

                      <p className="text-xs text-gray-400">
                        Payment
                      </p>

                      <p className="mt-1 capitalize text-[#38435A]">
                        {order.payment_status}
                      </p>

                    </div>

                    {/* Order Status */}
                    <div>

                      <p className="text-xs text-gray-400">
                        Order Status
                      </p>

                      <p className="mt-1 capitalize text-[#38435A]">
                        {order.order_status}
                      </p>

                    </div>

                  </div>

                </div>

              </Link>

            ))}

          </div>
        )}

      </div>
    </main>
  );
}