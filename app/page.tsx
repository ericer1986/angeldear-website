import type { Metadata } from "next";

import Hero from "@/components/sections/Hero";
import WhyChoose from "@/components/sections/WhyChoose";
import Categories from "@/components/sections/Categories";
import FeaturedProducts from "@/components/sections/FeaturedProducts";

export const metadata: Metadata = {
  title: {
    absolute: "Angel Dear Malaysia | Baby & Mom Products",
  },

  description:
    "Shop baby and mom essentials at Angel Dear Malaysia. Discover quality baby products including feeding essentials, strollers, carriers, toys and more.",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "Angel Dear Malaysia | Baby & Mom Products",
    description:
      "Shop baby and mom essentials at Angel Dear Malaysia. Discover quality baby products including feeding essentials, strollers, carriers, toys and more.",
    url: "/",
    type: "website",
    locale: "en_MY",
    siteName: "Angel Dear Malaysia",
  },

  twitter: {
    card: "summary_large_image",
    title: "Angel Dear Malaysia | Baby & Mom Products",
    description:
      "Shop baby and mom essentials at Angel Dear Malaysia. Discover quality baby products including feeding essentials, strollers, carriers, toys and more.",
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <WhyChoose />
      <Categories />
      <FeaturedProducts />
    </>
  );
}