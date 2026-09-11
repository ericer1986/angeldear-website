export default function BrandsPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Angel Dear
          </p>

          <h1 className="mt-3 text-4xl font-bold text-gray-900">
            Our Brands
          </h1>

          <p className="mt-4 text-lg leading-8 text-gray-600">
            Discover carefully selected baby and family brands available at
            Angel Dear.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">
              Angel Dear
            </h2>

            <p className="mt-3 text-gray-600">
              Quality baby essentials designed for comfort, convenience and
              everyday family life.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}