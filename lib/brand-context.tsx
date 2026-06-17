"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { BrandTheme } from "@/lib/brand/registry";

interface BrandCtx {
  brand: BrandTheme | null;
  setBrand: (b: BrandTheme | null) => void;
}

const Ctx = createContext<BrandCtx>({ brand: null, setBrand: () => {} });

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrandState] = useState<BrandTheme | null>(null);
  const setBrand = useCallback((b: BrandTheme | null) => setBrandState(b), []);
  return <Ctx.Provider value={{ brand, setBrand }}>{children}</Ctx.Provider>;
}

export function useBrand() {
  return useContext(Ctx);
}
