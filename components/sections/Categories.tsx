import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    title: "Baby Strollers",
    image: "/images/categories/stroller.jpg",
    href: "/shop",
  },
  {
    title: "Baby Feeding",
    image: "/images/categories/feeding.jpg",
    href: "/shop",
  },
  {
    title: "Baby Carriers",
    image: "/images/categories/carrier.jpg",
    href: "/shop",
  },
  {
    title: "Baby Toys",
    image: "/images/categories/toys.jpg",
    href: "/shop",
  },
];

export default function Categories() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        <h2 className="text-center text-3xl font-bold text-[#38435A] md:text-4xl">
          Shop By Category
        </h2>

        <p className="mx-auto mt-4 mb-10 max-w-2xl text-center leading-6 text-gray-500 md:mb-12">
          Explore our collections for every stage of your baby&apos;s journey.
        </p>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {categories.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="group overflow-hidden rounded-3xl bg-[#F8F7F3] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                <Image
                  src={category.image}
                  alt={category.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex min-h-[88px] items-center justify-center p-4 text-center md:p-5">
                <h3 className="text-base font-semibold leading-6 text-[#38435A] md:text-lg">
                  {category.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/shop"
            className="inline-flex rounded-full bg-[#38435A] px-7 py-3.5 font-semibold text-white transition hover:opacity-90"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}