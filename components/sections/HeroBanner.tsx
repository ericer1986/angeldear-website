import Image from "next/image";

export default function HeroBanner() {
  return (
    <section className="bg-[#FFFDF8]">
      <div className="max-w-7xl mx-auto px-6 py-20 lg:grid lg:grid-cols-2 items-center gap-16">

        {/* Left */}

        <div>

          <p className="uppercase tracking-[5px] text-[#AFC7B4] font-semibold">
            Premium Baby & Family Lifestyle
          </p>

          <h1 className="mt-6 text-6xl font-bold leading-tight text-gray-700">
            Love Begins With Every Little Moment
          </h1>

          <p className="mt-8 text-xl text-gray-500 leading-9">
            Discover premium baby essentials carefully selected for growing families across Malaysia.
          </p>

          <div className="mt-10 flex gap-5">

            <button className="bg-[#E8C9C1] px-8 py-4 rounded-full hover:bg-[#DDB8AE] transition">
              Shop Now
            </button>

            <button className="border border-gray-300 px-8 py-4 rounded-full hover:bg-gray-100 transition">
              Explore Brand
            </button>

          </div>

        </div>

        {/* Right */}

        <div className="mt-16 lg:mt-0">

          <Image
            src="/images/hero/banner.jpg"
            alt="Angel Dear"
            width={800}
            height={700}
            className="rounded-[40px] shadow-xl"
          />

        </div>

      </div>
    </section>
  );
}