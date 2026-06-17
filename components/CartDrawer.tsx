"use client";
import { useCart } from "@/lib/cart";
import { useBrand } from "@/lib/brand-context";
import { formatCzk } from "@/lib/types";
import { BrandLogo } from "@/components/brand/BrandLogo";
import Link from "next/link";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, total, count } = useCart();
  const { brand } = useBrand();

  // Barvy — brand nebo výchozí tmavé
  const bg      = brand?.bg      ?? "var(--bg)";
  const surface = brand?.surface ?? "var(--card)";
  const ink     = brand?.ink     ?? "var(--fg)";
  const muted   = brand?.muted   ?? "var(--muted)";
  const line    = brand?.line    ?? "var(--border)";
  const accent  = brand?.accent  ?? "#ffffff";
  const accentInk = brand?.accentInk ?? "#000000";

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeCart} />
      )}

      <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: bg, borderLeft: `1px solid ${line}` }}>

        {/* Header s logem */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${line}` }}>
          <div className="flex flex-col gap-1">
            {brand ? (
              <BrandLogo brand={brand} size="sm" />
            ) : (
              <span className="font-semibold" style={{ color: ink }}>Košík</span>
            )}
            <span className="text-xs" style={{ color: muted }}>
              {count} {count === 1 ? "položka" : count < 5 ? "položky" : "položek"}
            </span>
          </div>
          <button onClick={closeCart} className="rounded-lg p-2 transition"
            style={{ color: muted }} onMouseOver={e => (e.currentTarget.style.color = ink)} onMouseOut={e => (e.currentTarget.style.color = muted)}>
            ✕
          </button>
        </div>

        {/* Položky */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: muted }}>
              <span className="text-4xl">🛒</span>
              <p className="text-sm">Košík je prázdný</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.product.id} className="flex items-start gap-3 rounded-2xl p-3"
                style={{ background: surface, border: `1px solid ${line}` }}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: ink }}>{item.product.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: muted }}>{formatCzk(item.product.priceCzk)} / ks</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => updateQty(item.product.id, item.qty - 1)}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition"
                    style={{ background: bg, borderColor: line, color: ink }}>−</button>
                  <span className="w-5 text-center text-sm font-medium" style={{ color: ink }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, item.qty + 1)}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition"
                    style={{ background: bg, borderColor: line, color: ink }}>+</button>
                  <button onClick={() => removeItem(item.product.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs ml-1 transition"
                    style={{ color: muted }}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer s celkem a tlačítkem */}
        {items.length > 0 && (
          <div className="px-5 py-4 space-y-3" style={{ borderTop: `1px solid ${line}` }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: muted }}>Celkem</span>
              <span className="font-semibold text-lg" style={{ color: ink }}>{formatCzk(total)}</span>
            </div>
            <Link href="/checkout" onClick={closeCart}
              className="block w-full rounded-xl py-3 text-center text-sm font-semibold transition hover:opacity-90"
              style={{ background: accent, color: accentInk }}>
              Pokračovat k objednávce →
            </Link>
            {brand && (
              <p className="text-xs text-center" style={{ color: muted }}>
                Objednáváš od <strong style={{ color: ink }}>{brand.name}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
