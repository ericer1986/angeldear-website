"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");

  return (
    <main className="min-h-screen bg-[#FAF8F6] flex items-center justify-center px-6 py-20">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-sm p-10 text-center">

        <div className="mx-auto w-20 h-20 rounded-full bg-[#AFC7B4] flex items-center justify-center text-white text-4xl">
          ✓
        </div>

        <h1 className="mt-8 text-4xl font-bold text-[#38435A]">
          Order Successful
        </h1>

        <p className="mt-4 text-gray-500">
          Thank you for your order with Angel Dear Malaysia.
        </p>

        {orderId && (
          <div className="mt-8 rounded-2xl bg-[#FAF8F6] p-5">
            <p className="text-sm text-gray-500">
              Order ID
            </p>

            <p className="mt-2 font-mono text-sm break-all text-[#38435A]">
              {orderId}
            </p>
          </div>
        )}

        <p className="mt-6 text-gray-500">
          We have received your order and will contact you shortly.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">

          <Link
            href="/shop"
            className="rounded-full bg-[#E8C9C1] px-8 py-3 font-medium hover:bg-[#DDB8AE] transition"
          >
            Continue Shopping
          </Link>

          <Link
            href="/"
            className="rounded-full border border-gray-200 px-8 py-3 font-medium text-[#38435A] hover:bg-gray-50 transition"
          >
            Back to Home
          </Link>

        </div>

      </div>
    </main>
  );
}