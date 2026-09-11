"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types/product";

export default function AddToCartButton({
  product,
}: {
  product: Product;
}) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    addToCart(product);

    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 2000);
  }

  return (
    <button
      onClick={handleAddToCart}
      className="w-full rounded-full bg-[#E8C9C1] py-4 font-semibold hover:bg-[#DDB8AE] transition"
    >
      {added ? "Added to Cart ✓" : "Add to Cart"}
    </button>
  );
}