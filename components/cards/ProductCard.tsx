import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/product";

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const price = Number(product.price);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block h-full"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>

        {/* Product Information */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg font-semibold leading-6 text-[#38435A]">
            {product.name}
          </h3>

          <p className="mt-2 text-xl font-bold text-[#AFC7B4]">
            RM {Number.isFinite(price) ? price.toFixed(2) : product.price}
          </p>

          <div className="mt-auto pt-5">
            <div className="w-full rounded-full bg-[#E8C9C1] py-3 text-center font-medium text-[#38435A] transition group-hover:bg-[#DDB8AE]">
              View Product
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}