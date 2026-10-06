import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative h-[610px] overflow-hidden md:h-[700px]">
      <Image
        src="/images/hero/banner.png"
        alt="Angel Dear Malaysia baby and mom products"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[58%_center] md:object-center"
      />

      <div className="absolute inset-0">
        <div className="mx-auto flex h-full max-w-7xl items-end px-4 pb-5 md:items-center md:px-6 md:pb-0">
          <div className="w-full rounded-[28px] bg-white/80 p-6 shadow-sm backdrop-blur-[2px] md:max-w-lg md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#38435A] md:text-sm md:tracking-[0.2em]">
              Angel Dear Malaysia
            </p>

            <h1 className="mt-2.5 text-[32px] font-bold leading-[1.08] text-[#38435A] sm:text-4xl md:mt-3 md:text-5xl md:leading-[1.1]">
              Baby & Mom Essentials for Everyday Family Life
            </h1>

            <p className="mt-4 max-w-md text-[15px] leading-6 text-[#38435A] md:mt-5 md:text-lg md:leading-7">
              Discover quality baby essentials selected for comfort,
              convenience and growing families in Malaysia.
            </p>

            <Link
              href="/shop"
              className="mt-5 inline-flex rounded-full bg-[#38435A] px-6 py-3 font-semibold text-white transition hover:opacity-90 md:mt-7 md:px-7 md:py-3.5"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}