"use client";
import { useCart } from "@/lib/cart";
import { formatCzk } from "@/lib/types";
import Link from "next/link";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, total, count } = useCart();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={closeCart}
        />
      )}

      {/* Drawer */}
      <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col bg-[#0f0f10] border-l border-[var(--border)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="font-semibold">Košík</h2>
            <p className="text-xs text-[var(--muted)]">{count} {count === 1 ? "položka" : count < 5 ? "položky" : "položek"}</p>
          </div>
          <button onClick={closeCart} className="rounded-lg p-2 hover:bg-[var(--card)] text-[var(--muted)] hover:text-white">
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--muted)]">
              <span className="text-4xl">🛒</span>
              <p className="text-sm">Košík je prázdný</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.product.id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{formatCzk(item.product.priceCzk)} / ks</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => updateQty(item.product.id, item.qty - 1)} className="w-7 h-7 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-neutral-600 flex items-center justify-center text-sm">−</button>
                  <span className="w-5 text-center text-sm font-medium">{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, item.qty + 1)} className="w-7 h-7 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-neutral-600 flex items-center justify-center text-sm">+</button>
                  <button onClick={() => removeItem(item.product.id)} className="w-7 h-7 rounded-lg hover:bg-red-500/20 text-[var(--muted)] hover:text-red-400 flex items-center justify-center text-xs ml-1">✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[var(--border)] px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)] text-sm">Celkem</span>
              <span className="font-semibold text-lg">{formatCzk(total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full rounded-xl bg-white py-3 text-center text-sm font-semibold text-black hover:bg-neutral-200 transition"
            >
              Pokračovat k objednávce →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
