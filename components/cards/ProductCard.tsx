import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/product";

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block"
    >
      <div className="bg-white rounded-3xl shadow-sm hover:shadow-lg transition overflow-hidden">

        <div className="relative h-64 bg-gray-100">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition duration-300"
          />
        </div>

        <div className="p-5">

          <h3 className="text-lg font-semibold text-[#38435A]">
            {product.name}
          </h3>

          <p className="mt-2 text-[#AFC7B4] font-bold text-xl">
            RM {product.price}
          </p>

          <p className="mt-2 text-yellow-500">
            ★★★★★
          </p>

          <div className="mt-5 w-full rounded-full bg-[#E8C9C1] py-3 text-center hover:bg-[#DDB8AE] transition">
            View Product
          </div>

        </div>

      </div>
    </Link>
  );
}