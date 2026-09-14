"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

type PaymentState =
  | "checking"
  | "paid"
  | "pending"
  | "error";

function OrderSuccessContent() {
  const searchParams = useSearchParams();

  const orderId =
    searchParams.get("order") ||
    searchParams.get("orderId");

  const { clearCart } = useCart();

  const clearCartRef = useRef(clearCart);

  const [paymentState, setPaymentState] =
    useState<PaymentState>("checking");

  const [message, setMessage] =
    useState(
      "We are confirming your payment..."
    );

  useEffect(() => {
    clearCartRef.current = clearCart;
  }, [clearCart]);

  useEffect(() => {
    if (!orderId) {
      setPaymentState("error");
      setMessage(
        "Order information could not be found."
      );
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const maxAttempts = 10;
    let attempts = 0;

    async function checkPayment() {
      if (cancelled) {
        return;
      }

      attempts += 1;

      try {
        const {
          data,
          error,
        } = await supabase
          .from("orders")
          .select(
            "id, payment_status, paid_at"
          )
          .eq("id", orderId)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (error) {
          console.error(
            "Payment Status Check Error:",
            error
          );

          setPaymentState("error");
          setMessage(
            "We could not verify your payment status."
          );

          return;
        }

        if (!data) {
          setPaymentState("error");
          setMessage(
            "Order could not be found."
          );

          return;
        }

        if (
          data.payment_status === "paid"
        ) {
          setPaymentState("paid");

          setMessage(
            "Your payment has been successfully confirmed."
          );

          clearCartRef.current();

          return;
        }

        if (attempts < maxAttempts) {
          setPaymentState("checking");

          setMessage(
            "Payment received. We are confirming your payment..."
          );

          timer = setTimeout(
            checkPayment,
            2000
          );

          return;
        }

        setPaymentState("pending");

        setMessage(
          "Your payment is still being verified. Please check My Orders shortly."
        );
      } catch (error) {
        console.error(
          "Payment Verification Error:",
          error
        );

        if (!cancelled) {
          setPaymentState("error");

          setMessage(
            "Something went wrong while verifying your payment."
          );
        }
      }
    }

    checkPayment();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [orderId]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          {paymentState === "paid" && (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <span className="text-4xl text-green-600">
                  ✓
                </span>
              </div>

              <h1 className="mt-6 text-3xl font-bold text-gray-900">
                Payment Successful
              </h1>

              <p className="mt-3 text-gray-600">
                {message}
              </p>
            </>
          )}

          {paymentState ===
            "checking" && (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
              </div>

              <h1 className="mt-6 text-3xl font-bold text-gray-900">
                Confirming Payment
              </h1>

              <p className="mt-3 text-gray-600">
                {message}
              </p>

              <p className="mt-2 text-sm text-gray-400">
                Please do not close this page.
              </p>
            </>
          )}

          {paymentState ===
            "pending" && (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
                <span className="text-4xl">
                  ⏳
                </span>
              </div>

              <h1 className="mt-6 text-3xl font-bold text-gray-900">
                Payment Verification
              </h1>

              <p className="mt-3 text-gray-600">
                {message}
              </p>
            </>
          )}

          {paymentState ===
            "error" && (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <span className="text-4xl">
                  !
                </span>
              </div>

              <h1 className="mt-6 text-3xl font-bold text-gray-900">
                Unable to Verify Payment
              </h1>

              <p className="mt-3 text-gray-600">
                {message}
              </p>
            </>
          )}

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
      </div>
    </main>
  );
}

function OrderSuccessLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

        <p className="mt-4 text-gray-500">
          Loading order...
        </p>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <OrderSuccessLoading />
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}