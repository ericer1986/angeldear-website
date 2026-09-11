"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

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

  const [postcode, setPostcode] =
    useState("");

  const [userId, setUserId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /*
    Load logged-in customer information
  */
  useEffect(() => {
    async function loadCustomer() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
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
    }

    loadCustomer();
  }, []);

  /*
    Calculate subtotal
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
    Shipping

    Free shipping for RM150+
    Otherwise RM10
  */
  const shipping =
    subtotal >= 150
      ? 0
      : 10;

  /*
    Grand Total
  */
  const total =
    subtotal + shipping;

  /*
    Place Order
  */
  async function handlePlaceOrder() {
    setErrorMessage("");

    /*
      Validate form
    */
    if (
      !customerName ||
      !email ||
      !phone ||
      !address ||
      !city ||
      !postcode
    ) {
      setErrorMessage(
        "Please fill in all required fields."
      );

      return;
    }

    /*
      Check cart
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
        Get latest login session
      */
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      const currentUserId =
        session?.user?.id ||
        userId ||
        null;

      /*
        1. Generate Order ID
      */
      const orderId =
        crypto.randomUUID();

      /*
        2. Create Supabase Order
      */
      const {
        error: orderError,
      } =
        await supabase
          .from("orders")
          .insert({
            id: orderId,

            user_id:
              currentUserId,

            customer_name:
              customerName,

            email,

            phone,

            address,

            city,

            postcode,

            subtotal,

            shipping,

            total,

            payment_status:
              "pending",

            order_status:
              "pending",
          });

      /*
        Order Error
      */
      if (orderError) {
        console.error(
          "Order Error:",
          orderError
        );

        throw new Error(
          orderError.message
        );
      }

      /*
        3. Prepare Order Items
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

      /*
        Insert Order Items
      */
      const {
        error: itemsError,
      } =
        await supabase
          .from("order_items")
          .insert(
            orderItems
          );

      /*
        Order Items Error
      */
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
        4. Create Billplz Bill
      */
      const billResponse =
        await fetch(
          "/api/billplz/create-bill",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  customerName,

                email,

                phone,

                amount:
                  total,

                orderId,
              }),
          }
        );

      /*
        Read Billplz response
      */
      const billData =
        await billResponse.json();

      /*
        Billplz API Error
      */
      if (!billResponse.ok) {
        console.error(
          "Billplz Error:",
          billData
        );

        throw new Error(
          billData.error ||
            "Unable to create payment."
        );
      }

      /*
        Check Billplz URL
      */
      if (!billData.billUrl) {
        throw new Error(
          "Billplz payment URL was not returned."
        );
      }

      /*
        IMPORTANT

        Do NOT clear cart here.

        Cart will only be cleared
        after payment is confirmed.
      */

      /*
        5. Redirect to Billplz
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
    } finally {
      setLoading(false);
    }
  }

  /*
    Empty Cart
  */
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#FAF8F6] py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">

          <h1 className="text-4xl font-bold text-[#38435A]">
            Your cart is empty
          </h1>

          <p className="mt-4 text-gray-500">
            Please add some products before
            checking out.
          </p>

          <button
            onClick={() =>
              router.push(
                "/shop"
              )
            }
            className="mt-8 rounded-full bg-[#E8C9C1] px-8 py-3 font-medium hover:bg-[#DDB8AE] transition"
          >
            Continue Shopping
          </button>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F6] py-16">

      <div className="max-w-6xl mx-auto px-6">

        <h1 className="text-4xl font-bold text-[#38435A] mb-10">
          Checkout
        </h1>

        <div className="grid md:grid-cols-2 gap-10">

          {/* Customer Information */}
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
                className="w-full rounded-xl border px-4 py-3"
              />

              {/* Email */}
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border px-4 py-3"
              />

              {/* Phone */}
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border px-4 py-3"
              />

              {/* Address */}
              <textarea
                placeholder="Delivery Address"
                value={address}
                onChange={(e) =>
                  setAddress(
                    e.target.value
                  )
                }
                rows={4}
                className="w-full rounded-xl border px-4 py-3"
              />

              {/* City */}
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) =>
                  setCity(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border px-4 py-3"
              />

              {/* Postcode */}
              <input
                type="text"
                placeholder="Postcode"
                value={postcode}
                onChange={(e) =>
                  setPostcode(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border px-4 py-3"
              />

            </div>

            {/* Login Status */}
            {userId && (
              <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                Signed in customer — this order
                will be saved to your account.
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-600 text-sm">
                {errorMessage}
              </div>
            )}

          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-3xl p-8 shadow-sm h-fit">

            <h2 className="text-2xl font-semibold text-[#38435A] mb-6">
              Order Summary
            </h2>

            {/* Products */}
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

                      <p className="text-sm text-gray-500 mt-1">
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

            {/* Totals */}
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

            {/* Payment Information */}
            <div className="mt-6 rounded-2xl bg-[#FAF8F6] p-4">

              <p className="text-sm font-medium text-[#38435A]">
                Secure Payment
              </p>

              <p className="mt-1 text-xs text-gray-500">
                You will be redirected to Billplz
                to complete your payment securely.
              </p>

            </div>

            {/* Proceed to Payment */}
            <button
              onClick={
                handlePlaceOrder
              }
              disabled={loading}
              className="mt-6 w-full rounded-full bg-[#E8C9C1] py-4 font-semibold hover:bg-[#DDB8AE] transition disabled:opacity-50"
            >
              {loading
                ? "Redirecting to Payment..."
                : "Proceed to Payment"}
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}