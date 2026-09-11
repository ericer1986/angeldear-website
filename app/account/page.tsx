"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type UserInfo = {
  id: string;
  email: string;
  name: string;
  phone: string;
};

type Order = {
  id: string;
  total: number;
  payment_status: string;
  order_status: string;
  created_at: string;
};

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user;

      if (!currentUser) {
        router.replace("/login");
        return;
      }

      setUser({
        id: currentUser.id,
        email: currentUser.email || "",
        name:
          currentUser.user_metadata?.full_name || "",
        phone:
          currentUser.user_metadata?.phone || "",
      });

      const { data: orderData, error: orderError } =
        await supabase
          .from("orders")
          .select(
            "id, total, payment_status, order_status, created_at"
          )
          .eq("user_id", currentUser.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(3);

      if (orderError) {
        console.error(
          "Account Orders Error:",
          orderError
        );

        setErrorMessage(orderError.message);
      } else {
        setOrders(orderData || []);
      }

      setLoading(false);
    }

    loadAccount();
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Logout Error:",
        error
      );

      setLoggingOut(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
        <p className="text-gray-500">
          Loading account...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-16">

      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="mb-10">

          <p className="text-sm text-gray-500">
            Angel Dear Malaysia
          </p>

          <h1 className="mt-2 text-4xl font-bold text-[#38435A]">
            My Account
          </h1>

          <p className="mt-3 text-gray-500">
            Welcome back,{" "}
            {user.name || "Customer"}.
          </p>

        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {/* Top Section */}
        <div className="grid gap-6 md:grid-cols-3">

          {/* Profile */}
          <div className="md:col-span-2 bg-white rounded-3xl shadow-sm p-8">

            <div className="flex items-center justify-between">

              <h2 className="text-xl font-semibold text-[#38435A]">
                Profile
              </h2>

              <span className="rounded-full bg-[#FAF8F6] px-4 py-2 text-xs font-medium text-gray-500">
                Customer Account
              </span>

            </div>

            <div className="mt-7 grid gap-6 sm:grid-cols-2">

              <div>
                <p className="text-sm text-gray-500">
                  Full Name
                </p>

                <p className="mt-1 font-medium text-gray-800">
                  {user.name || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Phone
                </p>

                <p className="mt-1 font-medium text-gray-800">
                  {user.phone || "-"}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-sm text-gray-500">
                  Email
                </p>

                <p className="mt-1 font-medium text-gray-800 break-all">
                  {user.email}
                </p>
              </div>

            </div>

          </div>

          {/* Account Menu */}
          <div className="bg-white rounded-3xl shadow-sm p-6">

            <h2 className="text-lg font-semibold text-[#38435A]">
              Account
            </h2>

            <div className="mt-5 space-y-3">

              <Link
                href="/account/orders"
                className="block rounded-2xl bg-[#FAF8F6] px-5 py-4 hover:bg-[#F2ECE8] transition"
              >
                <p className="font-medium text-[#38435A]">
                  My Orders
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  View your order history
                </p>
              </Link>

              <Link
                href="/shop"
                className="block rounded-2xl bg-[#FAF8F6] px-5 py-4 hover:bg-[#F2ECE8] transition"
              >
                <p className="font-medium text-[#38435A]">
                  Continue Shopping
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Browse our products
                </p>
              </Link>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full rounded-2xl bg-red-50 px-5 py-4 text-left text-red-600 hover:bg-red-100 transition disabled:opacity-50"
              >
                <p className="font-medium">
                  {loggingOut
                    ? "Logging out..."
                    : "Logout"}
                </p>

                <p className="text-xs mt-1">
                  Sign out of your account
                </p>
              </button>

            </div>

          </div>

        </div>

        {/* Recent Orders */}
        <div className="mt-8 bg-white rounded-3xl shadow-sm p-8">

          <div className="flex items-center justify-between gap-4">

            <div>
              <h2 className="text-2xl font-semibold text-[#38435A]">
                Recent Orders
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your latest Angel Dear orders.
              </p>
            </div>

            <Link
              href="/account/orders"
              className="rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-[#38435A] hover:bg-gray-50"
            >
              View All Orders
            </Link>

          </div>

          {orders.length === 0 ? (

            <div className="mt-8 rounded-2xl bg-[#FAF8F6] p-8 text-center">

              <p className="font-medium text-[#38435A]">
                No orders yet
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Your recent orders will appear here.
              </p>

              <Link
                href="/shop"
                className="mt-5 inline-block rounded-full bg-[#E8C9C1] px-6 py-3 text-sm font-medium text-[#38435A]"
              >
                Start Shopping
              </Link>

            </div>

          ) : (

            <div className="mt-6 space-y-4">

              {orders.map((order) => (

                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="block rounded-2xl border border-gray-100 p-5 transition hover:bg-[#FAF8F6]"
                >

                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Order ID
                      </p>

                      <p className="mt-1 break-all font-medium text-[#38435A]">
                        {order.id}
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
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

                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">

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

                      <div>

                        <p className="text-xs text-gray-400">
                          Payment
                        </p>

                        <p className="mt-1 capitalize text-[#38435A]">
                          {
                            order.payment_status
                          }
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-gray-400">
                          Status
                        </p>

                        <p className="mt-1 capitalize text-[#38435A]">
                          {
                            order.order_status
                          }
                        </p>

                      </div>

                    </div>

                  </div>

                </Link>

              ))}

            </div>

          )}

        </div>

      </div>

    </main>
  );
}