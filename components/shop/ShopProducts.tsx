"use client";

import { useMemo, useState } from "react";

import ProductCard from "@/components/cards/ProductCard";
import { Product } from "@/types/product";

interface ShopProductsProps {
  products: Product[];
}

export default function ShopProducts({
  products,
}: ShopProductsProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        products
          .map((product) => product.category?.trim())
          .filter(Boolean)
      )
    );

    return ["All", ...uniqueCategories];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" ||
        product.category === selectedCategory;

      const searchableText = [
        product.name,
        product.brand,
        product.category,
        product.sku,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchTerm === "" ||
        searchableText.includes(searchTerm);

      return matchesCategory && matchesSearch;
    });
  }, [products, search, selectedCategory]);

  return (
    <div>
      {/* Search */}
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg"
        >
          🔍
        </span>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search products..."
          aria-label="Search products"
          className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-[#38435A] outline-none transition placeholder:text-gray-400 focus:border-[#AFC7B4] focus:ring-2 focus:ring-[#AFC7B4]/20"
        />
      </div>

      {/* Category Filters */}
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2">
          {categories.map((category) => {
            const active =
              selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() =>
                  setSelectedCategory(category)
                }
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#38435A] text-white"
                    : "border border-gray-200 bg-white text-[#38435A] hover:bg-gray-50"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Count */}
      <div className="mt-6 border-t border-gray-200 pt-5">
        <p className="text-sm font-medium text-gray-500">
          {filteredProducts.length}{" "}
          {filteredProducts.length === 1
            ? "Product"
            : "Products"}
        </p>
      </div>

      {/* Product Results */}
      {filteredProducts.length > 0 ? (
        <div
          className={`mt-8 grid gap-6 md:gap-8 ${
            filteredProducts.length === 1
              ? "mx-auto max-w-sm grid-cols-1 md:mx-0"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl bg-gray-50 px-6 py-12 text-center">
          <h2 className="text-xl font-semibold text-[#38435A]">
            No products found
          </h2>

          <p className="mt-2 text-gray-600">
            Try another search or category.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("All");
            }}
            className="mt-6 rounded-full bg-[#38435A] px-6 py-3 font-semibold text-white transition hover:opacity-90"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}