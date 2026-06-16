"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { MenuItem } from "@/lib/types";

export function AddToCartButton({ item }: { item: MenuItem }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <button
      onClick={handleAdd}
      disabled={!item.available}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        added
          ? "bg-green-500 text-white"
          : item.available
          ? "bg-white text-black hover:bg-neutral-200"
          : "bg-neutral-800 text-[var(--muted)] cursor-not-allowed"
      }`}
    >
      {added ? "✓ Přidáno" : item.available ? "+ Přidat" : "Vyprodáno"}
    </button>
  );
}
