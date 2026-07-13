"use client";
// Jazyk zákaznických webů (CS výchozí / EN). Nezávislé na admin i18n.
// Persistuje se v localStorage, přepínač je v navigaci každého brandu.
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { MenuItem, ProductCustomization } from "@/lib/types";

export type CustomerLocale = "cs" | "en";
const KEY = "ff-locale";

const Ctx = createContext<{ locale: CustomerLocale; setLocale: (l: CustomerLocale) => void }>({
  locale: "cs",
  setLocale: () => {},
});

export function CustomerLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<CustomerLocale>("cs");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "en" || saved === "cs") setLocaleState(saved);
    } catch { /* SSR/blokované storage */ }
  }, []);

  const setLocale = useCallback((l: CustomerLocale) => {
    setLocaleState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    try { document.documentElement.lang = l; } catch { /* ignore */ }
  }, []);

  return <Ctx.Provider value={{ locale, setLocale }}>{children}</Ctx.Provider>;
}

export const useCustomerLocale = () => useContext(Ctx);

// ── Lokalizované texty produktů (fallback na češtinu) ──
export const itemName = (i: Pick<MenuItem, "name" | "nameEn">, l: CustomerLocale) =>
  l === "en" && i.nameEn ? i.nameEn : i.name;
export const itemDesc = (i: Pick<MenuItem, "description" | "descriptionEn">, l: CustomerLocale) =>
  l === "en" && i.descriptionEn ? i.descriptionEn : i.description;
export const itemCategory = (i: Pick<MenuItem, "category" | "categoryEn">, l: CustomerLocale) =>
  l === "en" && i.categoryEn ? i.categoryEn : i.category;
export const custName = (c: Pick<ProductCustomization, "name"> & { nameEn?: string | null }, l: CustomerLocale) =>
  l === "en" && c.nameEn ? c.nameEn : c.name;

// ── Přepínač CZ/EN — pilulka, barvy si dodá brand přes props ──
export function LangToggle({ ink, line, bg }: { ink: string; line: string; bg?: string }) {
  const { locale, setLocale } = useCustomerLocale();
  return (
    <button
      onClick={() => setLocale(locale === "cs" ? "en" : "cs")}
      aria-label={locale === "cs" ? "Switch to English" : "Přepnout do češtiny"}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition hover:opacity-80"
      style={{ border: `2px solid ${line}`, color: ink, background: bg ?? "transparent" }}
    >
      <span style={{ opacity: locale === "cs" ? 1 : 0.45 }}>CZ</span>
      <span style={{ opacity: 0.4 }}>/</span>
      <span style={{ opacity: locale === "en" ? 1 : 0.45 }}>EN</span>
    </button>
  );
}
