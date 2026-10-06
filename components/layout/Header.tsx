"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

const menuItems = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "Brands", href: "/brands" },
  { name: "About", href: "/about" },
  { name: "Agent", href: "/agent" },
  { name: "Contact", href: "/contact" },
];

export default function Header() {
  const { items } = useCart();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartCount = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setAuthLoading(false);
    }

    loadSession();

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

  /*
    Close mobile menu automatically
    after navigation.
  */
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="relative z-50 w-full border-b border-gray-200 bg-white">
      {/* Main Header */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6 md:py-5">
        {/* Logo */}
        <Link
          href="/"
          aria-label="Angel Dear Malaysia Home"
          className="shrink-0"
        >
          <Image
            src="/images/logo/logo.png"
            alt="Angel Dear Malaysia"
            width={170}
            height={70}
            priority
            className="h-auto w-[125px] sm:w-[145px] md:w-[170px]"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex"
          aria-label="Main navigation"
        >
          {menuItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition ${
                  active
                    ? "font-semibold text-[#38435A]"
                    : "hover:text-[#38435A]"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Search */}
          <button
            type="button"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center text-xl"
          >
            🔍
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center text-xl"
            aria-label={`Shopping Cart${
              cartCount > 0
                ? ` with ${cartCount} item${cartCount === 1 ? "" : "s"}`
                : ""
            }`}
          >
            🛒

            {cartCount > 0 && (
              <span className="absolute right-0 top-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E8C9C1] px-1 text-xs font-bold text-[#38435A]">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* Desktop Account */}
          {!authLoading && (
            <div className="hidden md:block">
              {user ? (
                <Link
                  href="/account"
                  className="rounded-full bg-[#E8C9C1] px-5 py-2 text-sm font-medium text-[#38435A] transition hover:bg-[#DDB8AE]"
                >
                  My Account
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full bg-[#E8C9C1] px-5 py-2 text-sm font-medium text-[#38435A] transition hover:bg-[#DDB8AE]"
                >
                  Login
                </Link>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#38435A] transition hover:bg-gray-100 md:hidden"
            aria-label={
              mobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() =>
              setMobileMenuOpen((current) => !current)
            }
          >
            {mobileMenuOpen ? (
              <span
                aria-hidden="true"
                className="text-3xl leading-none"
              >
                ×
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="flex flex-col gap-[5px]"
              >
                <span className="block h-[2px] w-6 rounded-full bg-current" />
                <span className="block h-[2px] w-6 rounded-full bg-current" />
                <span className="block h-[2px] w-6 rounded-full bg-current" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="absolute left-0 top-full w-full border-t border-gray-100 bg-white shadow-lg md:hidden"
        >
          <nav
            className="mx-auto flex max-w-7xl flex-col px-6 py-5"
            aria-label="Mobile navigation"
          >
            {menuItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`border-b border-gray-100 py-3.5 text-base transition last:border-b-0 ${
                    active
                      ? "font-semibold text-[#38435A]"
                      : "text-gray-600 hover:text-[#38435A]"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            {!authLoading && (
              <div className="mt-5">
                {user ? (
                  <Link
                    href="/account"
                    className="flex w-full items-center justify-center rounded-full bg-[#E8C9C1] px-5 py-3 font-semibold text-[#38435A] transition hover:bg-[#DDB8AE]"
                  >
                    My Account
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center rounded-full bg-[#E8C9C1] px-5 py-3 font-semibold text-[#38435A] transition hover:bg-[#DDB8AE]"
                  >
                    Login
                  </Link>
                )}
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}