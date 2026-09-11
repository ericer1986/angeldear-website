import Image from "next/image";
import { supabase } from "@/lib/supabase";
import AddToCartButton from "@/components/cart/AddToCartButton";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-[#38435A]">
          Product Not Found
        </h1>
      </div>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

        {/* Product Image */}
        <div className="relative h-[500px] rounded-3xl overflow-hidden bg-gray-100">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>

        {/* Product Information */}
        <div className="flex flex-col justify-center">

          <p className="text-sm text-gray-500 uppercase tracking-wider">
            {product.brand}
          </p>

          <h1 className="mt-3 text-4xl font-bold text-[#38435A]">
            {product.name}
          </h1>

          <div className="mt-5">
            <span className="text-3xl font-bold text-[#AFC7B4]">
              RM {product.price}
            </span>
          </div>

          <div className="mt-6 text-gray-600 leading-7">
            {product.description}
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Stock: {product.stock}
          </p>

          <div className="mt-8 flex gap-4">

           <AddToCartButton product={product} />

          </div>

        </div>

      </div>
    </section>
  );
}