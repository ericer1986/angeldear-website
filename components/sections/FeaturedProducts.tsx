import ProductCard from "@/components/cards/ProductCard";
import { supabase } from "@/lib/supabase";

export default async function FeaturedProducts() {

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("featured", true)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">

        <h2 className="text-4xl font-bold mb-10">
          Featured Products
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {products?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}

        </div>

      </div>
    </section>
  );
}