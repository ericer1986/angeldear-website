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
      total +
      Number(item.product.price) *
        item.quantity,
    0
  );

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-16 md:px-6 md:py-20">
        <h1 className="text-3xl font-bold text-[#38435A] md:text-4xl">
          Shopping Cart
        </h1>

        <p className="mt-4 text-gray-500">
          Your cart is currently empty.
        </p>

        <Link
          href="/shop"
          className="mt-8 inline-flex rounded-full bg-[#E8C9C1] px-8 py-3 font-semibold transition hover:bg-[#DDB8AE]"
        >
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-6 md:py-20">
      <h1 className="mb-10 text-3xl font-bold text-[#38435A] md:text-4xl">
        Shopping Cart
      </h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="space-y-6 lg:col-span-2">
          {items.map((item) => {
            const stock = Math.max(
              0,
              Number(item.product.stock) || 0
            );

            const atStockLimit =
              item.quantity >= stock;

            const itemTotal =
              Number(item.product.price) *
              item.quantity;

            return (
              <article
                key={item.product.id}
                className="rounded-3xl bg-white p-5 shadow-sm"
              >
                <div className="flex gap-4 sm:gap-6">
                  {/* Image */}
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-gray-100 sm:h-32 sm:w-32"
                  >
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </Link>

                  {/* Product Information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/product/${item.product.slug}`}
                          className="text-lg font-semibold leading-6 text-[#38435A] hover:underline sm:text-xl"
                        >
                          {item.product.name}
                        </Link>

                        <p className="mt-2 font-bold text-[#AFC7B4]">
                          RM{" "}
                          {Number(
                            item.product.price
                          ).toFixed(2)}
                        </p>
                      </div>

                      <p className="shrink-0 text-right font-bold text-[#38435A]">
                        RM {itemTotal.toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity */}
                    <div className="mt-5 flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.product.name}`}
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.quantity - 1
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200"
                      >
                        −
                      </button>

                      <span className="min-w-6 text-center font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.product.name}`}
                        disabled={
                          stock <= 0 ||
                          atStockLimit
                        }
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.quantity + 1
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>

                    {atStockLimit &&
                      stock > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          Maximum available
                          quantity reached.
                        </p>
                      )}

                    {stock <= 0 && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        This product is
                        currently out of
                        stock.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(
                          item.product.id
                        )
                      }
                      className="mt-4 text-sm text-red-500 transition hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Order Summary */}
        <aside className="h-fit rounded-3xl bg-gray-50 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-[#38435A]">
            Order Summary
          </h2>

          <div className="mt-8 flex justify-between gap-4">
            <span className="text-gray-500">
              Subtotal
            </span>

            <span className="font-semibold">
              RM {subtotal.toFixed(2)}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Shipping will be calculated
            during checkout.
          </p>

          <div className="my-6 border-t" />

          <div className="flex justify-between gap-4 text-xl font-bold">
            <span>Total</span>

            <span className="text-[#AFC7B4]">
              RM {subtotal.toFixed(2)}
            </span>
          </div>

          <Link
            href="/checkout"
            className="mt-8 block rounded-full bg-[#E8C9C1] py-4 text-center font-semibold transition hover:bg-[#DDB8AE]"
          >
            Proceed to Checkout
          </Link>
        </aside>
      </div>
    </main>
  );
}