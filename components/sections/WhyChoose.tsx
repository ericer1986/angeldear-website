export default function WhyChoose() {
  const features = [
    {
      icon: "⭐",
      title: "Premium Quality",
      description: "Carefully selected products for every growing family.",
    },
    {
      icon: "🚚",
      title: "Fast Delivery",
      description: "Fast shipping across Malaysia.",
    },
    {
      icon: "🍼",
      title: "Baby Safe",
      description: "Trusted brands with quality assurance.",
    },
    {
      icon: "💬",
      title: "Friendly Support",
      description: "Our team is ready to help every day.",
    },
  ];

  return (
    <section className="py-20 bg-[#F8F7F3]">
      <div className="max-w-7xl mx-auto px-6">

        <h2 className="text-4xl font-bold text-center text-[#38435A]">
          Why Choose Angel Dear
        </h2>

        <p className="text-center text-gray-500 mt-4 mb-14">
          Everything we do is designed to make parenting easier.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {features.map((item) => (

            <div
              key={item.title}
              className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition"
            >

              <div className="text-5xl mb-5">
                {item.icon}
              </div>

              <h3 className="font-bold text-xl text-[#38435A]">
                {item.title}
              </h3>

              <p className="text-gray-500 mt-4 leading-7">
                {item.description}
              </p>

            </div>

          ))}

        </div>

      </div>
    </section>
  );
}