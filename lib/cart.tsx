"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
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
  addItem: (product: MenuItem, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((product: MenuItem, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { product, qty }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.product.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return; }
    setItems(prev => prev.map(i => i.product.id === id ? { ...i, qty } : i));
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);
  const total = items.reduce((s, i) => s + i.product.priceCzk * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <Ctx.Provider value={{ items, isOpen, total, count, addItem, removeItem, updateQty, clearCart, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
