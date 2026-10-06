import ProductCard from "@/components/cards/ProductCard";
import { supabase } from "@/lib/supabase";

export default async function FeaturedProducts() {
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("featured", true)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Featured Products Error:", error);
  }

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-[#38435A] md:text-4xl">
            Featured Products
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-gray-500">
            Discover some of our featured baby essentials.
          </p>
        </div>

        {error ? (
          <p className="text-center text-gray-500">
            Featured products are temporarily unavailable.
          </p>
        ) : products && products.length > 0 ? (
          <div
            className={`grid gap-6 md:gap-8 ${
              products.length === 1
                ? "mx-auto max-w-sm grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            Featured products are coming soon.
          </p>
        )}
      </div>
    </section>
  );
}