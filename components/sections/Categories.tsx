export default function Categories() {
  const categories = [
    {
      title: "Baby Strollers",
      image: "/images/categories/stroller.jpg",
    },
    {
      title: "Baby Feeding",
      image: "/images/categories/feeding.jpg",
    },
    {
      title: "Baby Carriers",
      image: "/images/categories/carrier.jpg",
    },
    {
      title: "Baby Toys",
      image: "/images/categories/toys.jpg",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        <h2 className="text-4xl font-bold text-center text-[#38435A]">
          Shop By Category
        </h2>

        <p className="text-center text-gray-500 mt-4 mb-12">
          Explore our collections for every stage of your baby's journey.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

          {categories.map((category) => (
            <div
              key={category.title}
              className="rounded-3xl overflow-hidden shadow hover:shadow-lg transition bg-[#F8F7F3]"
            >

              <div className="h-52 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">
                  Image
                </span>
              </div>

              <div className="p-5 text-center">

                <h3 className="font-semibold text-lg text-[#38435A]">
                  {category.title}
                </h3>

              </div>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}