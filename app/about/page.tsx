import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",

  description:
    "Learn more about Angel Dear Malaysia and our commitment to providing quality baby and family essentials for parents and growing families in Malaysia.",

  alternates: {
    canonical: "/about",
  },

  openGraph: {
    title: "About Us | Angel Dear Malaysia",
    description:
      "Learn more about Angel Dear Malaysia and our commitment to providing quality baby and family essentials for parents and growing families in Malaysia.",
    url: "/about",
    type: "website",
    locale: "en_MY",
    siteName: "Angel Dear Malaysia",
  },

  twitter: {
    card: "summary_large_image",
    title: "About Us | Angel Dear Malaysia",
    description:
      "Learn more about Angel Dear Malaysia and our commitment to providing quality baby and family essentials for parents and growing families in Malaysia.",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Angel Dear Malaysia
          </p>

          <h1 className="mt-3 text-4xl font-bold text-[#38435A]">
            About Us
          </h1>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            Angel Dear Malaysia is dedicated to providing quality baby and
            family essentials designed to support parents through everyday
            family life.
          </p>

          <p className="mt-5 leading-8 text-gray-600">
            We carefully select products with comfort, practicality and
            convenience in mind, helping families find the essentials they need
            for their little ones.
          </p>

          <p className="mt-5 leading-8 text-gray-600">
            From baby feeding and everyday essentials to products for growing
            families, our goal is to make shopping simple, reliable and
            convenient for parents across Malaysia.
          </p>
        </div>
      </section>
    </main>
  );
}