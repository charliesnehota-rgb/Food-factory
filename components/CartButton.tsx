"use client";
import { useCart } from "@/lib/cart";

export function CartButton() {
  const { count, openCart } = useCart();
  return (
    <button
      onClick={openCart}
      className="relative flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:border-neutral-600 transition"
    >
      🛒
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-black">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
