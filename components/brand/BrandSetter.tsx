"use client";
import { useEffect } from "react";
import { useBrand } from "@/lib/brand-context";
import { useCart } from "@/lib/cart";
import type { BrandTheme } from "@/lib/brand/registry";

// Nastaví aktivní brand i scope košíku při vstupu na brandový web.
// Díky scope se zobrazí jen košík dané značky (izolace mezi restauracemi).
export function BrandSetter({ brand }: { brand: BrandTheme }) {
  const { setBrand } = useBrand();
  const { setScope } = useCart();
  useEffect(() => {
    setBrand(brand);
    setScope(brand.slug);
    return () => setBrand(null);
  }, [brand, setBrand, setScope]);
  return null;
}
