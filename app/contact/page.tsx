export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Angel Dear
          </p>

          <h1 className="mt-3 text-4xl font-bold text-gray-900">
            Contact Us
          </h1>

          <p className="mt-4 text-lg text-gray-600">
            Have a question about our products, orders or services?
            We&apos;re here to help.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Customer Support
              </h2>

              <p className="mt-2 text-gray-600">
                Contact our team for product enquiries, order support and
                general assistance.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Angel Dear Malaysia
              </h2>

              <p className="mt-2 text-gray-600">
                We&apos;ll be adding our official contact details here soon.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}