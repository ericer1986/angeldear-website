import Hero from "@/components/sections/Hero";
import WhyChoose from "@/components/sections/WhyChoose";
import Categories from "@/components/sections/Categories";
import Footer from "@/components/layout/Footer";
import FeaturedProducts from "@/components/sections/FeaturedProducts";

export default function Home() {
  return (
    <>
      <Hero />
      <WhyChoose />
      <Categories />
      <FeaturedProducts />
      <Footer />
    </>
  );
}