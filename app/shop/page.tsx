import { products } from "@/data/products";
import ProductCard from "@/components/cards/ProductCard";

export default function ShopPage() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">

      <h1 className="text-5xl font-bold text-[#38435A] mb-4">
        Shop
      </h1>

      <p className="text-gray-500 mb-12">
        Browse all Angel Dear products.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            name={product.name}
            price={`RM ${product.price}`}
            image={product.image}
          />
        ))}
      </div>

    </section>
  );
}