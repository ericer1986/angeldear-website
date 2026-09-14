"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export default function CheckoutPage() {
  const router = useRouter();

  /*
    Important:
    Do NOT clear cart here.

    Cart will only be cleared after
    Billplz payment is confirmed as PAID
    on /order-success.
  */
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

  const [postcode, setPostcode] =
    useState("");

  const [userId, setUserId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  /*
    =========================================
    LOAD LOGGED-IN CUSTOMER
    =========================================
  */
  useEffect(() => {
    async function loadCustomer() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      const user =
        session?.user;

      if (!user) {
        setUserId(null);
        return;
      }

      setUserId(user.id);

      setCustomerName(
        user.user_metadata?.full_name ||
          ""
      );

      setEmail(
        user.email ||
          ""
      );

      setPhone(
        user.user_metadata?.phone ||
          ""
      );
    }

    loadCustomer();
  }, []);

  /*
    =========================================
    CALCULATE ORDER TOTALS
    =========================================
  */

  const subtotal =
    items.reduce(
      (total, item) =>
        total +
        Number(
          item.product.price
        ) *
          item.quantity,
      0
    );

  /*
    Free shipping for RM150 and above
  */
  const shipping =
    subtotal >= 150
      ? 0
      : 10;

  const total =
    subtotal + shipping;

  /*
    =========================================
    PLACE ORDER
    =========================================
  */

  async function handlePlaceOrder() {
    setErrorMessage("");

    /*
      Validate delivery information
    */
    if (
      !customerName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !city.trim() ||
      !postcode.trim()
    ) {
      setErrorMessage(
        "Please fill in all required fields."
      );

      return;
    }

    /*
      Validate cart
    */
    if (items.length === 0) {
      setErrorMessage(
        "Your cart is empty."
      );

      return;
    }

    try {
      setLoading(true);

      /*
        =========================================
        1. GET CURRENT LOGIN SESSION
        =========================================

        Checkout now requires an authenticated
        customer.

        We do NOT trust the userId stored only
        in React state.
      */

      const {
        data: {
          session,
        },
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

      const currentUserId =
        session.user.id;

      /*
        =========================================
        2. GENERATE ORDER ID
        =========================================
      */

      const orderId =
        crypto.randomUUID();

      /*
        =========================================
        3. CREATE ORDER
        =========================================
      */

      const {
        error: orderError,
      } =
        await supabase
          .from("orders")
          .insert({
            id:
              orderId,

            /*
              Important:
              The order belongs to the
              currently authenticated user.
            */
            user_id:
              currentUserId,

            customer_name:
              customerName.trim(),

            email:
              email.trim(),

            phone:
              phone.trim(),

            address:
              address.trim(),

            city:
              city.trim(),

            postcode:
              postcode.trim(),

            subtotal,
            shipping,
            total,

            payment_status:
              "pending",

            order_status:
              "pending",
          });

      if (orderError) {
        console.error(
          "ORDER ERROR MESSAGE:",
          orderError.message
        );

        console.error(
          "ORDER ERROR CODE:",
          orderError.code
        );

        console.error(
          "ORDER ERROR DETAILS:",
          orderError.details
        );

        console.error(
          "ORDER ERROR HINT:",
          orderError.hint
        );

        throw new Error(
          `${orderError.code}: ${orderError.message}`
        );
      }

      /*
        =========================================
        4. CREATE ORDER ITEMS
        =========================================
      */

      const orderItems =
        items.map(
          (item) => ({
            order_id:
              orderId,

            product_id:
              item.product.id,

            product_name:
              item.product.name,

            price:
              Number(
                item.product.price
              ),

            quantity:
              item.quantity,
          })
        );

      const {
        error: itemsError,
      } =
        await supabase
          .from("order_items")
          .insert(
            orderItems
          );

      if (itemsError) {
        console.error(
          "Order Items Error:",
          itemsError
        );

        throw new Error(
          itemsError.message
        );
      }

      /*
        =========================================
        5. CREATE BILLPLZ BILL
        =========================================

        Important security change:

        We send ONLY:
        - orderId
        - authenticated user's access token

        We do NOT send:
        - amount
        - name
        - email
        - phone

        The server will load trusted order
        information directly from Supabase.
      */

      const billResponse =
        await fetch(
          "/api/billplz/create-bill",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                orderId,
              }),
          }
        );

      /*
        Read server response
      */
      let billData: {
        success?: boolean;
        billId?: string;
        billUrl?: string;
        state?: string;
        amount?: number;
        error?: string;
        details?: unknown;
      };

      try {
        billData =
          await billResponse.json();
      } catch {
        throw new Error(
          "Invalid response from payment server."
        );
      }

      /*
        Billplz API error
      */
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

      /*
        Make sure Billplz returned payment URL
      */
      if (!billData.billUrl) {
        console.error(
          "Billplz bill URL missing:",
          billData
        );

        throw new Error(
          "Payment link was not returned."
        );
      }

      /*
        =========================================
        6. REDIRECT TO BILLPLZ
        =========================================

        DO NOT clear cart here.

        The customer may:
        - cancel payment
        - fail payment
        - close Billplz

        Cart is cleared only after payment_status
        becomes "paid" on the success page.
      */

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

  /*
    =========================================
    EMPTY CART
    =========================================
  */

  if (
    items.length === 0
  ) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold text-[#38435A]">
            Your cart is empty
          </h1>

          <p className="mt-4 text-gray-500">
            Please add some products
            before checking out.
          </p>

          <button
            onClick={() =>
              router.push(
                "/shop"
              )
            }
            className="mt-8 rounded-full bg-[#E8C9C1] px-8 py-3 font-medium transition hover:bg-[#DDB8AE]"
          >
            Continue Shopping
          </button>
        </div>
      </main>
    );
  }

  /*
    =========================================
    CHECKOUT PAGE
    =========================================
  */

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-[#38435A] mb-10">
          Checkout
        </h1>

        <div className="grid md:grid-cols-2 gap-10">

          {/* =================================
              DELIVERY INFORMATION
          ================================= */}

          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#38435A] mb-6">
              Delivery Information
            </h2>

            <div className="space-y-4">

              {/* Full Name */}
              <input
                type="text"
                placeholder="Full Name"
                value={
                  customerName
                }
                onChange={(e) =>
                  setCustomerName(
                    e.target.value
                  )
                }
                disabled={
                  loading
                }
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />

              {/* Email */}
              <input
                type="email"
                placeholder="Email Address"
                value={
                  email
                }
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                disabled={
                  loading
                }
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />

              {/* Phone */}
              <input
                type="tel"
                placeholder="Phone Number"
                value={
                  phone
                }
                onChange={(e) =>
                  setPhone(
                    e.target.value
                  )
                }
                disabled={
                  loading
                }
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />

              {/* Address */}
              <textarea
                placeholder="Delivery Address"
                value={
                  address
                }
                onChange={(e) =>
                  setAddress(
                    e.target.value
                  )
                }
                rows={4}
                disabled={
                  loading
                }
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />

              {/* City */}
              <input
                type="text"
                placeholder="City"
                value={
                  city
                }
                onChange={(e) =>
                  setCity(
                    e.target.value
                  )
                }
                disabled={
                  loading
                }
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />

              {/* Postcode */}
              <input
                type="text"
                placeholder="Postcode"
                value={
                  postcode
                }
                onChange={(e) =>
                  setPostcode(
                    e.target.value
                  )
                }
                disabled={
                  loading
                }
                className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-100"
              />
            </div>

            {/* Login Status */}

            {userId ? (
              <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                Signed in customer — this
                order will be saved to your
                account.
              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                Please login before
                proceeding to payment.
              </div>
            )}

            {/* Error Message */}

            {errorMessage && (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {errorMessage}
              </div>
            )}
          </div>

          {/* =================================
              ORDER SUMMARY
          ================================= */}

          <div className="bg-white rounded-3xl p-8 shadow-sm h-fit">
            <h2 className="text-2xl font-semibold text-[#38435A] mb-6">
              Order Summary
            </h2>

            <div className="space-y-4">
              {items.map(
                (item) => (
                  <div
                    key={
                      item.product.id
                    }
                    className="flex justify-between gap-4 border-b pb-4"
                  >
                    <div>
                      <p className="font-medium text-[#38435A]">
                        {
                          item.product
                            .name
                        }
                      </p>

                      <p className="text-sm text-gray-500">
                        RM{" "}
                        {Number(
                          item.product
                            .price
                        ).toFixed(
                          2
                        )}
                        {" × "}
                        {
                          item.quantity
                        }
                      </p>
                    </div>

                    <p className="font-semibold">
                      RM{" "}
                      {(
                        Number(
                          item.product
                            .price
                        ) *
                        item.quantity
                      ).toFixed(
                        2
                      )}
                    </p>
                  </div>
                )
              )}
            </div>

            {/* =================================
                TOTALS
            ================================= */}

            <div className="mt-8 space-y-3">

              {/* Subtotal */}
              <div className="flex justify-between">
                <span>
                  Subtotal
                </span>

                <span>
                  RM{" "}
                  {subtotal.toFixed(
                    2
                  )}
                </span>
              </div>

              {/* Shipping */}
              <div className="flex justify-between">
                <span>
                  Shipping
                </span>

                <span>
                  {shipping === 0
                    ? "FREE"
                    : `RM ${shipping.toFixed(
                        2
                      )}`}
                </span>
              </div>

              {/* Total */}
              <div className="border-t pt-4 flex justify-between text-xl font-bold text-[#38435A]">
                <span>
                  Total
                </span>

                <span>
                  RM{" "}
                  {total.toFixed(
                    2
                  )}
                </span>
              </div>
            </div>

            {/* =================================
                PAYMENT BUTTON
            ================================= */}

            <button
              onClick={
                handlePlaceOrder
              }
              disabled={
                loading ||
                !userId
              }
              className="mt-8 w-full rounded-full bg-[#E8C9C1] py-4 font-semibold transition hover:bg-[#DDB8AE] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Redirecting to Payment..."
                : userId
                  ? "Proceed to Payment"
                  : "Login Required"}
            </button>

            {!userId && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/login"
                  )
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