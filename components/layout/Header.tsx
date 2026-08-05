import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">

        {/* Logo */}
        <Image
        src="/images/logo/logo.png"
        alt="Angel Dear"
        width={170}
        height={70}
        />

        {/* Menu */}
        <nav className="hidden md:flex gap-8 text-gray-600 text-sm font-medium">
          <a href="/">Home</a>
          <Link href="/shop">Shop</Link>
          <a href="/brands">Brands</a>
          <a href="/about">About</a>
          <a href="/agent">Agent</a>
          <a href="/contact">Contact</a>
        </nav>

        {/* Right */}
        <div className="flex gap-4">

          <button>
              🔍
          </button>

          <button>
              🛒
          </button>

          <button className="bg-[#E8C9C1] px-5 py-2 rounded-full">
              Login
          </button>

        </div>

      </div>
    </header>
  );
}