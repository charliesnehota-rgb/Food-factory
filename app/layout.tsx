import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "@/components/CartDrawer";

export const metadata: Metadata = {
  title: "Food Factory",
  description: "Cloud kitchen Praha.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen">
        <CartProvider>
          <CartDrawer />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
