import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Status",

  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function OrderSuccessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}