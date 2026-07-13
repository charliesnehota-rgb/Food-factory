"use client";
// Detail produktu s customizacemi — otevře se po kliknutí na "+" v menu.
// Zákazník si vybere přídavky, počet porcí a poznámku, pak teprve
// tlačítkem "Přidat do košíku" položku vloží do košíku.
import { useState, useEffect, useMemo } from "react";
import { useCart, type CartCustomization } from "@/lib/cart";
import { formatCzk } from "@/lib/types";
import { formatAllergens } from "@/lib/allergens";
import type { MenuItem } from "@/lib/types";

interface DbCustomization {
  id: string;
  product_id: string;
  name: string;
  price_czk: number;
  available: boolean;
  sort_order: number;
}

// Vizuální téma modalu — každý brand si předá své barvy
export interface DetailTheme {
  bg: string;        // pozadí karty
  surface: string;   // pozadí polí / řádků
  ink: string;       // hlavní text
  muted: string;     // sekundární text
  line: string;      // okraje
  accent: string;    // hlavní barva (tlačítko)
  accentInk: string; // text na accentu
  radius?: number;   // zaoblení karty (default 20)
  border?: string;   // vlastní border karty (např. "4px solid ..." pro sunny-side)
  displayFont?: string;
}

const EMOJI_BY_CONCEPT: Record<string, string> = {
  "sunny-side": "🍳",
  "dumply": "🥟",
  "smash": "🍔",
};

export function ProductDetailModal({ item, theme, onClose }: {
  item: MenuItem;
  theme: DetailTheme;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [customizations, setCustomizations] = useState<DbCustomization[]>([]);
  const [loadingCust, setLoadingCust] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  // Načti přídavky pro produkt
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/${item.id}/customizations`)
      .then(r => r.json())
      .then(data => { if (!cancelled && Array.isArray(data)) setCustomizations(data); })
      .catch(() => { /* bez přídavků */ })
      .finally(() => { if (!cancelled) setLoadingCust(false); });
    return () => { cancelled = true; };
  }, [item.id]);

  // Zamkni scroll pozadí, dokud je modal otevřený
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedList: CartCustomization[] = useMemo(() =>
    customizations
      .filter(c => selected.has(c.id))
      .map(c => ({ id: c.id, name: c.name, priceCzk: Number(c.price_czk) })),
    [customizations, selected]);

  const unitPrice = item.priceCzk + selectedList.reduce((s, c) => s + c.priceCzk, 0);
  const totalPrice = unitPrice * qty;

  function handleAdd() {
    addItem(item, qty, selectedList, note);
    onClose();
  }

  const t = theme;
  const radius = t.radius ?? 20;
  const emoji = EMOJI_BY_CONCEPT[item.conceptSlug] ?? "🍽️";

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-3 sm:p-6"
      role="dialog" aria-modal="true" aria-label={item.name}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Karta — na mobilu bottom-sheet, na desktopu centrovaný dialog */}
      <div
        className="relative z-10 w-full sm:max-w-md max-h-[92dvh] flex flex-col overflow-hidden"
        style={{
          background: t.bg,
          color: t.ink,
          border: t.border ?? `1px solid ${t.line}`,
          borderRadius: radius,
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* Foto / emoji */}
        <div className="relative shrink-0" style={{ background: t.surface, borderBottom: `1px solid ${t.line}` }}>
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} className="h-44 w-full object-cover" />
          ) : (
            <div className="h-36 w-full flex items-center justify-center text-6xl select-none">{emoji}</div>
          )}
          <button
            onClick={onClose}
            aria-label="Zavřít"
            className="absolute right-3 top-3 h-9 w-9 rounded-full flex items-center justify-center text-lg font-bold transition hover:opacity-80"
            style={{ background: t.bg, color: t.ink, border: `1px solid ${t.line}` }}
          >✕</button>
        </div>

        {/* Obsah — scrollovatelný */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xl font-bold" style={{ fontFamily: t.displayFont }}>{item.name}</h3>
              <span className="text-base font-semibold whitespace-nowrap" style={{ color: t.muted }}>{formatCzk(item.priceCzk)}</span>
            </div>
            {item.description && <p className="mt-1 text-sm" style={{ color: t.muted }}>{item.description}</p>}
            {item.allergens && item.allergens.length > 0 && (
              <p className="mt-1.5 text-xs" style={{ color: t.muted, opacity: 0.85 }}>
                Alergeny: {formatAllergens(item.allergens)}
              </p>
            )}
          </div>

          {/* Customizace */}
          {loadingCust ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: t.surface }} />
              ))}
            </div>
          ) : customizations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: t.muted }}>Přídavky</p>
              <div className="space-y-2">
                {customizations.map(c => {
                  const on = selected.has(c.id);
                  return (
                    <label key={c.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition select-none"
                      style={{
                        background: t.surface,
                        border: `2px solid ${on ? t.accent : t.line}`,
                      }}>
                      <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="sr-only" />
                      <span
                        className="h-5 w-5 shrink-0 rounded-md flex items-center justify-center text-xs font-bold transition"
                        style={{
                          background: on ? t.accent : "transparent",
                          color: on ? t.accentInk : "transparent",
                          border: `2px solid ${on ? t.accent : t.muted}`,
                        }}>✓</span>
                      <span className="flex-1 text-sm font-medium">{c.name}</span>
                      <span className="text-sm whitespace-nowrap" style={{ color: on ? t.ink : t.muted }}>
                        +{formatCzk(Number(c.price_czk))}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Poznámka */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: t.muted }}>Poznámka <span className="normal-case tracking-normal font-normal">(volitelné)</span></p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Např. bez cibule, méně slaná…"
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{ background: t.surface, border: `1px solid ${t.line}`, color: t.ink }}
            />
          </div>
        </div>

        {/* Footer: počet porcí + přidat */}
        <div className="shrink-0 px-5 py-4 flex items-center gap-3" style={{ borderTop: `1px solid ${t.line}`, background: t.bg }}>
          {/* Spinner 1–10 */}
          <div className="flex items-center gap-1 rounded-full px-1 py-1" style={{ border: `1px solid ${t.line}`, background: t.surface }}>
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Méně porcí"
              className="h-9 w-9 rounded-full flex items-center justify-center text-lg font-bold transition disabled:opacity-30"
              style={{ color: t.ink }}
            >−</button>
            <span className="w-7 text-center text-base font-semibold tabular-nums">{qty}</span>
            <button
              onClick={() => setQty(q => Math.min(10, q + 1))}
              disabled={qty >= 10}
              aria-label="Více porcí"
              className="h-9 w-9 rounded-full flex items-center justify-center text-lg font-bold transition disabled:opacity-30"
              style={{ color: t.ink }}
            >+</button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!item.available}
            className="flex-1 rounded-full py-3 text-sm font-bold transition hover:opacity-90 disabled:opacity-40"
            style={{ background: t.accent, color: t.accentInk }}
          >
            {item.available ? <>Přidat do košíku · {formatCzk(totalPrice)}</> : "Vyprodáno"}
          </button>
        </div>
      </div>
    </div>
  );
}
