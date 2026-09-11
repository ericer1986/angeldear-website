"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const { items } = useCart();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const cartCount = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  useEffect(() => {
    /*
      Load current login session
    */
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setAuthLoading(false);
    }

    loadSession();

    /*
      Listen for login / logout / register changes
    */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">

        {/* Logo */}
        <Link href="/">
          <Image
            src="/images/logo/logo.png"
            alt="Angel Dear"
            width={170}
            height={70}
            priority
            className="w-[170px] h-auto"
          />
        </Link>

        {/* Menu */}
        <nav className="hidden md:flex gap-8 text-gray-600 text-sm font-medium">

          <Link
            href="/"
            className="hover:text-[#38435A]"
          >
            Home
          </Link>

          <Link
            href="/shop"
            className="hover:text-[#38435A]"
          >
            Shop
          </Link>

          <Link
            href="/brands"
            className="hover:text-[#38435A]"
          >
            Brands
          </Link>

          <Link
            href="/about"
            className="hover:text-[#38435A]"
          >
            About
          </Link>

          <Link
            href="/agent"
            className="hover:text-[#38435A]"
          >
            Agent
          </Link>

          <Link
            href="/contact"
            className="hover:text-[#38435A]"
          >
            Contact
          </Link>

        </nav>

        {/* Right */}
        <div className="flex items-center gap-4">

          {/* Search */}
          <button
            type="button"
            aria-label="Search"
            className="text-xl"
          >
            🔍
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex items-center text-xl"
            aria-label="Shopping Cart"
          >
            🛒

            {cartCount > 0 && (
              <span className="absolute -top-2 -right-3 min-w-[20px] h-5 px-1 rounded-full bg-[#E8C9C1] text-xs font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}

          </Link>

          {/* Account / Login */}
          {!authLoading && (
            user ? (
              <Link
                href="/account"
                className="bg-[#E8C9C1] px-5 py-2 rounded-full text-sm font-medium text-[#38435A] hover:bg-[#DDB8AE] transition"
              >
                My Account
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-[#E8C9C1] px-5 py-2 rounded-full text-sm font-medium text-[#38435A] hover:bg-[#DDB8AE] transition"
              >
                Login
              </Link>
            )
          )}

        </div>

      </div>
    </header>
  );
}