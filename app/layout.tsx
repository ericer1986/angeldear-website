import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CartProvider } from "@/context/CartContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
  "https://angeldear.com.my";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Angel Dear Malaysia | Baby & Mom Products",
    template: "%s | Angel Dear Malaysia",
  },

  description:
    "Shop baby and mom essentials at Angel Dear Malaysia. Discover quality baby products including feeding, strollers, carriers, toys and more.",

  applicationName: "Angel Dear Malaysia",

  keywords: [
    "Angel Dear Malaysia",
    "baby products Malaysia",
    "mother and baby products",
    "baby store Malaysia",
    "baby feeding",
    "baby stroller",
    "baby carrier",
    "baby toys",
    "newborn essentials",
    "mom and baby store",
  ],

  authors: [
    {
      name: "Angel Dear Malaysia",
    },
  ],

  creator: "Angel Dear Malaysia",
  publisher: "Angel Dear Malaysia",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_MY",
    url: "/",
    siteName: "Angel Dear Malaysia",
    title: "Angel Dear Malaysia | Baby & Mom Products",
    description:
      "Shop baby and mom essentials at Angel Dear Malaysia. Discover quality baby products including feeding, strollers, carriers, toys and more.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Angel Dear Malaysia | Baby & Mom Products",
    description:
      "Shop baby and mom essentials at Angel Dear Malaysia. Discover quality baby products including feeding, strollers, carriers, toys and more.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-MY"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white">
        <CartProvider>
          <Header />

          <main>{children}</main>

          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}