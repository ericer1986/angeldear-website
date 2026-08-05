import Image from "next/image";
import { Product } from "@/types/product";

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  return (
    <div className="bg-white rounded-3xl shadow-sm hover:shadow-lg transition overflow-hidden">

      <div className="relative h-64">

        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
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

        <button className="mt-5 w-full rounded-full bg-[#E8C9C1] py-3 hover:bg-[#DDB8AE] transition">
          Add to Cart
        </button>

      </div>

    </div>
  );
}