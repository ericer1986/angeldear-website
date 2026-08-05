import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative h-[700px]">

      <Image
        src="/images/hero/banner.png"
        alt="Angel Dear"
        fill
        className="object-cover"
      />

    </section>
  );
}