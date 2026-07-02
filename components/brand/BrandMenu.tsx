"use client";
import { useState } from "react";
import { formatCzk } from "@/lib/types";
import type { MenuItem } from "@/lib/types";
import type { BrandTheme } from "@/lib/brand/registry";
import { ProductDetailModal } from "@/components/brand/ProductDetailModal";

export function BrandMenu({ items, brand }: { items: MenuItem[]; brand: BrandTheme }) {
  const [detail, setDetail] = useState<MenuItem | null>(null);

  const categories = new Map<string, MenuItem[]>();
  for (const it of items) {
    const list = categories.get(it.category) ?? [];
    list.push(it);
    categories.set(it.category, list);
  }

  return (
    <div className="space-y-12">
      {Array.from(categories.entries()).map(([category, list]) => (
        <div key={category}>
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: brand.accent }}>
            {category}
          </h3>
          <ul className="space-y-3">
            {list.map((item) => (
              <li key={item.id} className="flex items-center gap-4 rounded-2xl p-4"
                style={{ background: brand.surface, border: `1px solid ${brand.line}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold" style={{ fontFamily: "var(--brand-display)" }}>{item.name}</span>
                    <span className="text-sm font-medium" style={{ color: brand.muted }}>{formatCzk(item.priceCzk)}</span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: brand.muted }}>{item.description}</p>
                </div>
                <button onClick={() => setDetail(item)} disabled={!item.available}
                  className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: brand.accent, color: brand.accentInk }}>
                  {item.available ? "Přidat" : "Vyprodáno"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {detail && (
        <ProductDetailModal
          item={detail}
          onClose={() => setDetail(null)}
          theme={{
            bg: brand.bg, surface: brand.surface, ink: brand.ink, muted: brand.muted,
            line: brand.line, accent: brand.accent, accentInk: brand.accentInk,
            displayFont: brand.displayFont,
          }}
        />
      )}
    </div>
  );
}
