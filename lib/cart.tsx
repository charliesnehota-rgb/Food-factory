"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { MenuItem } from "@/lib/types";

export interface CartItem {
  product: MenuItem;
  qty: number;
  note?: string;
}

interface CartCtx {
  items: CartItem[];
  isOpen: boolean;
  total: number;
  count: number;
  activeSlug: string | null;
  addItem: (product: MenuItem, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  setScope: (slug: string | null) => void;
  openCart: () => void;
  closeCart: () => void;
}

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "ff-carts-v1";
const ACTIVE_KEY = "ff-cart-active-v1";

// Košíky jsou oddělené per značka (slug). Položky z jedné restaurace
// se nikdy nemíchají s jinou — každá značka má vlastní izolovaný košík.
type CartMap = Record<string, CartItem[]>;

export function CartProvider({ children }: { children: ReactNode }) {
  const [carts, setCarts] = useState<CartMap>({});
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const hydrated = useRef(false);

  // Hydratace z localStorage (jen klient)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCarts(JSON.parse(raw));
      const act = localStorage.getItem(ACTIVE_KEY);
      if (act) setActiveSlug(act);
    } catch { /* ignore */ }
    hydrated.current = true;
  }, []);

  // Persist při změně
  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(carts)); } catch { /* ignore */ }
  }, [carts]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (activeSlug) localStorage.setItem(ACTIVE_KEY, activeSlug);
    } catch { /* ignore */ }
  }, [activeSlug]);

  // Vyber aktivní košík; pojistka: když aktivní slug nemá položky,
  // ale existuje právě jeden neprázdný košík, použij ho (typicky na /checkout po reloadu)
  const nonEmpty = Object.entries(carts).filter(([, v]) => v.length > 0);
  const effectiveSlug = (activeSlug && (carts[activeSlug]?.length ?? 0) > 0)
    ? activeSlug
    : (nonEmpty.length === 1 ? nonEmpty[0][0] : activeSlug);
  const items = (effectiveSlug ? carts[effectiveSlug] : undefined) ?? [];

  // Když pojistka vybrala košík, nastav ho jako aktivní (ať fungují úpravy i vyčištění)
  useEffect(() => {
    if (effectiveSlug && effectiveSlug !== activeSlug) setActiveSlug(effectiveSlug);
  }, [effectiveSlug, activeSlug]);

  const addItem = useCallback((product: MenuItem, qty = 1) => {
    // Položka vždy patří do košíku své vlastní značky
    const slug = product.conceptSlug;
    setActiveSlug(slug);
    setCarts(prev => {
      const bucket = prev[slug] ?? [];
      const existing = bucket.find(i => i.product.id === product.id);
      const nextBucket = existing
        ? bucket.map(i => i.product.id === product.id ? { ...i, qty: i.qty + qty } : i)
        : [...bucket, { product, qty }];
      return { ...prev, [slug]: nextBucket };
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setCarts(prev => {
      if (!activeSlug) return prev;
      const bucket = (prev[activeSlug] ?? []).filter(i => i.product.id !== id);
      return { ...prev, [activeSlug]: bucket };
    });
  }, [activeSlug]);

  const updateQty = useCallback((id: string, qty: number) => {
    setCarts(prev => {
      if (!activeSlug) return prev;
      let bucket = prev[activeSlug] ?? [];
      bucket = qty <= 0
        ? bucket.filter(i => i.product.id !== id)
        : bucket.map(i => i.product.id === id ? { ...i, qty } : i);
      return { ...prev, [activeSlug]: bucket };
    });
  }, [activeSlug]);

  const clearCart = useCallback(() => {
    setCarts(prev => {
      if (!activeSlug) return prev;
      return { ...prev, [activeSlug]: [] };
    });
  }, [activeSlug]);

  const setScope = useCallback((slug: string | null) => setActiveSlug(slug), []);

  const total = items.reduce((s, i) => s + i.product.priceCzk * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <Ctx.Provider value={{
      items, isOpen, total, count, activeSlug,
      addItem, removeItem, updateQty, clearCart, setScope,
      openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
