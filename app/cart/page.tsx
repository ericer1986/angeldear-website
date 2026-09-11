"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const {
    items,
    removeFromCart,
    updateQuantity,
  } = useCart();

  const subtotal = items.reduce(
    (total, item) =>
      total + Number(item.product.price) * item.quantity,
    0
  );

  if (items.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-[#38435A]">
          Shopping Cart
        </h1>

        <p className="mt-4 text-gray-500">
          Your cart is currently empty.
        </p>

        <Link
          href="/shop"
          className="inline-block mt-8 rounded-full bg-[#E8C9C1] px-8 py-3 font-semibold hover:bg-[#DDB8AE] transition"
        >
          Continue Shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-bold text-[#38435A] mb-10">
        Shopping Cart
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">

          {items.map((item) => (
            <div
              key={item.product.id}
              className="flex gap-6 bg-white rounded-3xl shadow-sm p-5"
            >

              {/* Image */}
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                <Image
                  src={item.product.image}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1">

                <h2 className="text-xl font-semibold text-[#38435A]">
                  {item.product.name}
                </h2>

                <p className="mt-2 text-[#AFC7B4] font-bold">
                  RM {Number(item.product.price).toFixed(2)}
                </p>

                {/* Quantity */}
                <div className="mt-5 flex items-center gap-4">

                  <button
                    onClick={() =>
                      updateQuantity(
                        item.product.id,
                        item.quantity - 1
                      )
                    }
                    className="w-9 h-9 rounded-full bg-gray-100"
                  >
                    −
                  </button>

                  <span className="font-semibold">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() =>
                      updateQuantity(
                        item.product.id,
                        item.quantity + 1
                      )
                    }
                    className="w-9 h-9 rounded-full bg-gray-100"
                  >
                    +
                  </button>

                </div>

                <button
                  onClick={() =>
                    removeFromCart(item.product.id)
                  }
                  className="mt-4 text-sm text-red-500 hover:underline"
                >
                  Remove
                </button>

              </div>

              {/* Item Total */}
              <div className="font-bold text-[#38435A]">
                RM{" "}
                {(
                  Number(item.product.price) *
                  item.quantity
                ).toFixed(2)}
              </div>

            </div>
          ))}

        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-3xl p-8 h-fit">

          <h2 className="text-2xl font-bold text-[#38435A]">
            Order Summary
          </h2>

          <div className="flex justify-between mt-8">
            <span className="text-gray-500">
              Subtotal
            </span>

            <span className="font-semibold">
              RM {subtotal.toFixed(2)}
            </span>
          </div>

          <div className="border-t my-6" />

          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>

            <span className="text-[#AFC7B4]">
              RM {subtotal.toFixed(2)}
            </span>
          </div>

          <Link
            href="/checkout"
            className="block text-center mt-8 rounded-full bg-[#E8C9C1] py-4 font-semibold hover:bg-[#DDB8AE] transition"
          >
            Proceed to Checkout
          </Link>

        </div>

      </div>
    </section>
  );
}