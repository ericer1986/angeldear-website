import type { Metadata } from "next";

import { supabase } from "@/lib/supabase";
import ShopProducts from "@/components/shop/ShopProducts";
import { Product } from "@/types/product";

export const metadata: Metadata = {
  title: "Shop Baby & Mom Products",

  description:
    "Shop baby and mom products at Angel Dear Malaysia. Discover baby feeding essentials, strollers, carriers, toys and more for families in Malaysia.",

  alternates: {
    canonical: "/shop",
  },

  openGraph: {
    title: "Shop Baby & Mom Products | Angel Dear Malaysia",
    description:
      "Shop baby and mom products at Angel Dear Malaysia. Discover baby feeding essentials, strollers, carriers, toys and more for families in Malaysia.",
    url: "/shop",
    type: "website",
    locale: "en_MY",
    siteName: "Angel Dear Malaysia",
  },

  twitter: {
    card: "summary_large_image",
    title: "Shop Baby & Mom Products | Angel Dear Malaysia",
    description:
      "Shop baby and mom products at Angel Dear Malaysia. Discover baby feeding essentials, strollers, carriers, toys and more for families in Malaysia.",
  },
};

export default async function ShopPage() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Shop Products Error:", error);

    return (
      <main className="mx-auto max-w-7xl px-5 py-16 md:px-6 md:py-20">
        <div className="rounded-3xl bg-gray-50 px-6 py-12 text-center">
          <h1 className="text-3xl font-bold text-[#38435A]">
            Unable to load products
          </h1>

          <p className="mt-4 text-gray-600">
            Our products are temporarily unavailable.
            Please try again later.
          </p>
        </div>
      </main>
    );
  }

  const products = (data ?? []) as Product[];

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-7xl px-5 py-14 md:px-6 md:py-20">
        {/* Shop Header */}
        <div className="mb-8 md:mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#AFC7B4]">
            Angel Dear Malaysia
          </p>

          <h1 className="mt-2 text-4xl font-bold text-[#38435A] md:text-5xl">
            Shop
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 md:text-lg">
            Discover baby and mom essentials selected
            for comfort, convenience and everyday
            family life.
          </p>
        </div>

        {products.length > 0 ? (
          <ShopProducts products={products} />
        ) : (
          <div className="rounded-3xl bg-gray-50 px-6 py-12 text-center">
            <h2 className="text-xl font-semibold text-[#38435A]">
              No products available
            </h2>

            <p className="mt-2 text-gray-600">
              New products are coming soon.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}