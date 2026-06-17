"use client";
import { useEffect } from "react";
import { useBrand } from "@/lib/brand-context";
import type { BrandTheme } from "@/lib/brand/registry";

// Nastaví aktivní brand při vstupu na brandový web a smaže při odchodu
export function BrandSetter({ brand }: { brand: BrandTheme }) {
  const { setBrand } = useBrand();
  useEffect(() => {
    setBrand(brand);
    return () => setBrand(null);
  }, [brand, setBrand]);
  return null;
}
