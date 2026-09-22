"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

const MALAYSIA_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
];

type CreateOrderResponse = {
  success?: boolean;
  orderId?: string;
  subtotal?: number;
  shipping?: number;
  total?: number;
  error?: string;
};

type CreateBillResponse = {
  success?: boolean;
  billId?: string;
  billUrl?: string;
  state?: string;
  amount?: number;
  error?: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items } = useCart();

  const [customerName, setCustomerName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [city, setCity] =
    useState("");

  const [state, setState] =
    useState("");

  const [postcode, setPostcode] =
    useState("");

  const [userId, setUserId] =
    useState<string | null>(null);

  const [authChecking, setAuthChecking] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadCustomer() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "Checkout Session Error:",
            error
          );
          return;
        }

        if (!active) {
          return;
        }

        const user = session?.user;

        if (!user) {
          setUserId(null);
          return;
        }

        setUserId(user.id);

        setCustomerName(
          user.user_metadata?.full_name || ""
        );

        setEmail(
          user.email || ""
        );

        setPhone(
          user.user_metadata?.phone || ""
        );
      } finally {
        if (active) {
          setAuthChecking(false);
        }
      }
    }

    loadCustomer();

    return () => {
      active = false;
    };
  }, []);

  /*
    DISPLAY values only.

    The server independently calculates
    the real subtotal, shipping and total.
  */
  const displaySubtotal =
    items.reduce(
      (total, item) =>
        total +
        Number(item.product.price) *
          item.quantity,
      0
    );

  const isEastMalaysia =
    state === "Sabah" ||
    state === "Sarawak";

  const displayShipping =
    displaySubtotal >= 300
      ? 0
      : isEastMalaysia
        ? 18
        : 8;

  const displayTotal =
    displaySubtotal +
    displayShipping;

  async function handlePlaceOrder() {
    setErrorMessage("");

    if (
      !customerName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !city.trim() ||
      !state ||
      !postcode.trim()
    ) {
      setErrorMessage(
        "Please fill in all required fields."
      );
      return;
    }

    if (items.length === 0) {
      setErrorMessage(
        "Your cart is empty."
      );
      return;
    }

    try {
      setLoading(true);

      // =====================================
      // 1. Get authenticated session
      // =====================================

      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Session Error:",
          sessionError
        );

        throw new Error(
          "Unable to verify your login session."
        );
      }

      if (
        !session ||
        !session.user
      ) {
        throw new Error(
          "Please login before proceeding to payment."
        );
      }

      // =====================================
      // 2. Send product IDs + quantity
      //    and delivery information.
      //
      //    Shipping/total are NOT sent.
      // =====================================

      const checkoutItems =
        items.map((item) => ({
          productId:
            item.product.id,
          quantity:
            item.quantity,
        }));

      const orderResponse =
        await fetch(
          "/api/orders/create",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              customerName:
                customerName.trim(),

              email:
                email.trim(),

              phone:
                phone.trim(),

              address:
                address.trim(),

              city:
                city.trim(),

              state,

              postcode:
                postcode.trim(),

              items:
                checkoutItems,
            }),
          }
        );

      let orderData:
        CreateOrderResponse;

      try {
        orderData =
          await orderResponse.json();
      } catch {
        throw new Error(
          "Invalid response from order server."
        );
      }

      if (!orderResponse.ok) {
        console.error(
          "Create Order Error:",
          orderData
        );

        throw new Error(
          orderData.error ||
            "Unable to create order."
        );
      }

      if (!orderData.orderId) {
        console.error(
          "Order ID Missing:",
          orderData
        );

        throw new Error(
          "Order was created but no order ID was returned."
        );
      }

      const orderId =
        orderData.orderId;

      // =====================================
      // 3. Create Billplz Bill
      // =====================================

      const billResponse =
        await fetch(
          "/api/billplz/create-bill",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              orderId,
            }),
          }
        );

      let billData:
        CreateBillResponse;

      try {
        billData =
          await billResponse.json();
      } catch {
        throw new Error(
          "Invalid response from payment server."
        );
      }

      if (!billResponse.ok) {
        console.error(
          "Billplz Create Bill Error:",
          billData
        );

        throw new Error(
          billData.error ||
            "Unable to create payment bill."
        );
      }

      if (!billData.billUrl) {
        console.error(
          "Billplz Bill URL Missing:",
          billData
        );

        throw new Error(
          "Payment link was not returned."
        );
      }

      // =====================================
      // 4. Redirect customer to Billplz
      // =====================================

      window.location.href =
        billData.billUrl;
    } catch (error) {
      console.error(
        "Checkout Error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );

      setLoading(false);
    }
  }

  if (authChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF8F6]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#38435A]" />

          <p className="mt-4 text-gray-500">
            Checking account...
          </p>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-4xl font-bold text-[#38435A]">
            Your cart is empty
          </h1>

          <p className="mt-4 text-gray-500">
            Please add some products before
            checking out.
          </p>

          <button
            onClick={() =>
              router.push("/shop")
            }
            className="mt-8 rounded-full bg-[#E8C9C1] px-8 py-3 font-medium transition hover:bg-[#DDB8AE]"
          >
            Continue Shopping
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-16">
      <div className="mx-auto max-w-6xl px-6">
        <h1 className="mb-10 text-4xl font-bold text-[#38435A]">
          Checkout
        </h1>

        <div className="grid gap-10 md:grid-cols-2">
          {/* DELIVERY INFORMATION */}

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-semibold text-[#38435A]">
              Delivery Information
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={customerName}
                onChange={(e) =>
                  setCustomerName(
                    e.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />

              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />

              <textarea
                placeholder="Delivery Address"
                value={address}
                onChange={(e) =>
                  setAddress(
                    e.target.value
                  )
                }
                rows={4}
                disabled={loading}
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />

              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) =>
                  setCity(
                    e.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />

              <select
                value={state}
                onChange={(e) =>
                  setState(
                    e.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border bg-white px-4 py-3 disabled:bg-gray-100"
              >
                <option value="">
                  Select State
                </option>

                {MALAYSIA_STATES.map(
                  (stateName) => (
                    <option
                      key={stateName}
                      value={stateName}
                    >
                      {stateName}
                    </option>
                  )
                )}
              </select>

              <input
                type="text"
                inputMode="numeric"
                placeholder="Postcode"
                value={postcode}
                onChange={(e) =>
                  setPostcode(
                    e.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />
            </div>

            {userId ? (
              <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                Signed in customer — this
                order will be securely saved
                to your account.
              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                Please login before proceeding
                to payment.
              </div>
            )}

            {errorMessage && (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {errorMessage}
              </div>
            )}
          </div>

          {/* ORDER SUMMARY */}

          <div className="h-fit rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-semibold text-[#38435A]">
              Order Summary
            </h2>

            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex justify-between gap-4 border-b pb-4"
                >
                  <div>
                    <p className="font-medium text-[#38435A]">
                      {item.product.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      RM{" "}
                      {Number(
                        item.product.price
                      ).toFixed(2)}
                      {" × "}
                      {item.quantity}
                    </p>
                  </div>

                  <p className="font-semibold">
                    RM{" "}
                    {(
                      Number(
                        item.product.price
                      ) *
                      item.quantity
                    ).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>

                <span>
                  RM{" "}
                  {displaySubtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Shipping</span>

                <span>
                  {displayShipping === 0
                    ? "FREE"
                    : `RM ${displayShipping.toFixed(
                        2
                      )}`}
                </span>
              </div>

              <div className="flex justify-between border-t pt-4 text-xl font-bold text-[#38435A]">
                <span>Total</span>

                <span>
                  RM{" "}
                  {displayTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-[#FAF8F6] px-4 py-3 text-xs leading-5 text-gray-500">
              <p>
                West Malaysia shipping:
                RM8.00
              </p>

              <p>
                Sabah & Sarawak shipping:
                RM18.00
              </p>

              <p>
                FREE shipping for orders
                RM300 and above.
              </p>

              <p className="mt-2">
                Product prices, availability
                and order total will be
                verified securely before
                payment.
              </p>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={
                loading ||
                !userId
              }
              className="mt-8 w-full rounded-full bg-[#E8C9C1] py-4 font-semibold transition hover:bg-[#DDB8AE] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Preparing Secure Payment..."
                : userId
                  ? "Proceed to Payment"
                  : "Login Required"}
            </button>

            {!userId && (
              <button
                type="button"
                onClick={() =>
                  router.push("/login")
                }
                className="mt-3 w-full rounded-full border border-[#E8C9C1] py-3 font-medium text-[#38435A] transition hover:bg-[#FAF8F6]"
              >
                Login to Continue
              </button>
            )}

            <p className="mt-4 text-center text-xs text-gray-400">
              Secure payment powered by
              Billplz
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}