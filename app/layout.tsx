import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { CartProvider } from "@/lib/cart";
import { BrandProvider } from "@/lib/brand-context";
import { CustomerLocaleProvider } from "@/lib/customer-locale";
import { CartDrawer } from "@/components/CartDrawer";

export const metadata: Metadata = {
  title: "Free City",
  description: "Cloud kitchen.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen">
        <CustomerLocaleProvider>
        <BrandProvider>
          <CartProvider>
            <CartDrawer />
            {children}
          </CartProvider>
        </BrandProvider>
        </CustomerLocaleProvider>
              <Analytics />
      </body>
    </html>
  );
}
