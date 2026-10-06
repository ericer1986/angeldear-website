import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[65vh] items-center justify-center bg-[#fafafa] px-6 py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#38435A]">
          Angel Dear Malaysia
        </p>

        <h1 className="mt-5 text-7xl font-bold tracking-tight text-[#38435A] md:text-8xl">
          404
        </h1>

        <h2 className="mt-5 text-3xl font-bold text-gray-900">
          Page Not Found
        </h2>

        <p className="mx-auto mt-4 max-w-md leading-7 text-gray-600">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or may
          have been moved.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-w-40 items-center justify-center rounded-full bg-[#38435A] px-7 py-3.5 font-semibold text-white transition hover:opacity-90"
          >
            Back to Home
          </Link>

          <Link
            href="/shop"
            className="inline-flex min-w-40 items-center justify-center rounded-full border border-gray-300 bg-white px-7 py-3.5 font-semibold text-[#38435A] transition hover:bg-gray-50"
          >
            Shop Products
          </Link>
        </div>
      </div>
    </main>
  );
}