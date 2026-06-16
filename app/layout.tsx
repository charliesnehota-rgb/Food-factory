import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "@/components/CartDrawer";

export const metadata: Metadata = {
  title: "Food Factory — multi-concept kitchen",
  description: "Pět konceptů, jedna kuchyně. Snídaně, dumplingy, burgery, bowls a řízky. Praha.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen">
        <CartProvider>
          <Nav />
          <CartDrawer />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
