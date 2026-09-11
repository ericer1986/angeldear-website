"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function OrderSuccessContent() {
  const searchParams = useSearchParams();

  // Support both old and new parameter names
  const orderId =
    searchParams.get("order") ||
    searchParams.get("orderId");

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <span className="text-3xl">✓</span>
        </div>

        <h1 className="mt-6 text-3xl font-bold text-gray-900">
          Thank You
        </h1>

        <p className="mt-3 text-gray-600">
          Your order has been received.
        </p>

        {orderId && (
          <div className="mt-6 rounded-2xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Order ID
            </p>

            <p className="mt-1 break-all font-medium text-gray-900">
              {orderId}
            </p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-left">
          <p className="font-medium text-gray-900">
            Payment verification
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Your payment status is being verified. You can check the latest
            status from My Orders.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/account/orders"
            className="rounded-xl bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800"
          >
            View My Orders
          </Link>

          <Link
            href="/shop"
            className="rounded-xl border border-gray-300 px-6 py-3 font-medium text-gray-900 transition hover:bg-gray-50"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}

function OrderSuccessLoading() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">
        Loading order...
      </p>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<OrderSuccessLoading />}>
      <OrderSuccessContent />
    </Suspense>
  );
}