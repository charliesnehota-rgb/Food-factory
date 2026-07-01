"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCzk } from "@/lib/types";
import { useT } from "@/lib/i18n";

// --- Typy ---
interface ConceptRow {
  concept_slug: string;
  revenue: number;
  orders_count: number;
  portions: number;
  food_cost: number;
  food_cost_pct: number;
  gross_margin: number;
  gross_margin_pct: number;
}
interface ProductRow {
  product_id: string;
  product_name: string;
  concept_slug: string;
  portions: number;
  revenue: number;
  food_cost: number;
  food_cost_pct: number;
  gross_margin: number;
  gross_margin_pct: number;
}
interface Total {
  revenue: number; food_cost: number; food_cost_pct: number;
  gross_margin: number; gross_margin_pct: number;
  orders_count: number; portions: number;
}

// --- Helpers ---
const CONCEPT_META: Record<string, { name: string; accent: string; emoji: string }> = {
  "sunny-side": { name: "Prostě snídaně", accent: "#f59e0b", emoji: "🍳" },
  "dumply":     { name: "Dumply",          accent: "#ec4899", emoji: "🥟" },
  "smash":      { name: "L.T. Smash",      accent: "#f97316", emoji: "🍔" },
};

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function foodCostColor(pct: number) {
  if (pct < 25) return "#4ade80";
  if (pct < 35) return "#facc15";
  return "#f87171";
}

function Pct({ value, good = false }: { value: number; good?: boolean }) {
  const col = good
    ? value >= 65 ? "#4ade80" : value >= 50 ? "#facc15" : "#f87171"
    : foodCostColor(value);
  return <span style={{ color: col }}>{value.toFixed(1)} %</span>;
}

// --- Přepínač období ---
type Preset = "week" | "month" | "prevMonth" | "custom";

function getRange(preset: Preset, custom: { from: string; to: string }) {
  const today = new Date();
  if (preset === "week") {
    const mon = new Date(today);
    mon.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    return { from: isoDate(mon), to: isoDate(today) };
  }
  if (preset === "month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: isoDate(first), to: isoDate(today) };
  }
  if (preset === "prevMonth") {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last  = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: isoDate(first), to: isoDate(last) };
  }
  return custom;
}

// --- Karta souhrnu ---
function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

// --- Progress bar ---
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

export default function PnLPage() {
  const t = useT();
  const [preset, setPreset]         = useState<Preset>("month");
  const [custom, setCustom]         = useState({ from: "", to: "" });
  const [activeConcept, setActiveConcept] = useState<string | null>(null);

  const [concepts, setConcepts]     = useState<ConceptRow[]>([]);
  const [products, setProducts]     = useState<ProductRow[]>([]);
  const [total, setTotal]           = useState<Total | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const range = getRange(preset, custom);

  const load = useCallback(async () => {
    if (!range.from || !range.to) return;
    setLoading(true); setError("");
    const qs = new URLSearchParams({ from: range.from, to: range.to });
    if (activeConcept) qs.set("concept", activeConcept);
    const d = await fetch(`/api/admin/pnl?${qs}`).then(r => r.json());
    setLoading(false);
    if (d.error) { setError(d.error); return; }
    setConcepts(d.concepts ?? []);
    setProducts(d.products ?? []);
    setTotal(d.total ?? null);
  }, [range.from, range.to, activeConcept]);

  useEffect(() => { load(); }, [load]);

  const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
  const btnCls = (active: boolean) =>
    "rounded-lg px-3 py-1.5 text-sm font-medium transition " +
    (active ? "bg-white text-black" : "border border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-neutral-600");

  const visibleProducts = activeConcept
    ? products.filter(p => p.concept_slug === activeConcept)
    : products;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">{t("pnl.title")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("pnl.desc")}</p>
      </div>

      {/* Přepínač období */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["week", "month", "prevMonth"] as Preset[]).map(p => (
          <button key={p} onClick={() => setPreset(p)} className={btnCls(preset === p)}>
            {t(`pnl.preset.${p}`)}
          </button>
        ))}
        <button onClick={() => setPreset("custom")} className={btnCls(preset === "custom")}>
          {t("pnl.preset.custom")}
        </button>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={custom.from} onChange={e => setCustom({ ...custom, from: e.target.value })} className={inputCls} />
            <span className="text-[var(--muted)]">–</span>
            <input type="date" value={custom.to} onChange={e => setCustom({ ...custom, to: e.target.value })} className={inputCls} />
          </div>
        )}
        {loading && <span className="text-xs text-[var(--muted)]">{t("common.loading")}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      {/* Celkový souhrn */}
      {total && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label={t("pnl.total.revenue")} value={formatCzk(total.revenue)} sub={`${total.orders_count} ${t("pnl.orders")} · ${total.portions} ${t("pnl.portions")}`} />
          <SummaryCard label={t("pnl.total.foodCost")} value={formatCzk(total.food_cost)} sub={`${total.food_cost_pct.toFixed(1)} %`} />
          <SummaryCard label={t("pnl.total.grossMargin")} value={formatCzk(total.gross_margin)} sub={`${total.gross_margin_pct.toFixed(1)} %`} />
          <SummaryCard label={t("pnl.total.avgFoodCostPct")} value={`${total.food_cost_pct.toFixed(1)} %`} sub={total.food_cost_pct < 30 ? t("pnl.fcOk") : total.food_cost_pct < 35 ? t("pnl.fcWarn") : t("pnl.fcHigh")} />
        </div>
      )}

      {concepts.length === 0 && !loading && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
          {t("pnl.noData")}
        </div>
      )}

      {/* Per-koncept karty */}
      {concepts.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t("pnl.byConcept")}</h2>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {concepts.map(c => {
              const meta = CONCEPT_META[c.concept_slug] ?? { name: c.concept_slug, accent: "#888", emoji: "🍽" };
              const isActive = activeConcept === c.concept_slug;
              return (
                <button
                  key={c.concept_slug}
                  onClick={() => setActiveConcept(isActive ? null : c.concept_slug)}
                  className={"rounded-2xl border p-4 text-left transition " + (isActive ? "border-white bg-[var(--card)]" : "border-[var(--border)] bg-[var(--card)] hover:border-neutral-600")}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{meta.emoji}</span>
                    <span className="font-medium" style={{ color: meta.accent }}>{meta.name}</span>
                    <span className="ml-auto text-xs text-[var(--muted)]">{c.orders_count} {t("pnl.orders")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                    <div>
                      <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">{t("pnl.revenue")}</div>
                      <div className="font-semibold">{formatCzk(c.revenue)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">{t("pnl.grossMargin")}</div>
                      <div className="font-semibold">{formatCzk(c.gross_margin)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">{t("pnl.foodCostPct")}</div>
                      <div><Pct value={c.food_cost_pct} /></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">{t("pnl.marginPct")}</div>
                      <div><Pct value={c.gross_margin_pct} good /></div>
                    </div>
                  </div>
                  {/* Food cost progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-[var(--muted)]">
                      <span>{t("pnl.foodCostPct")}</span>
                      <span>{c.food_cost_pct.toFixed(1)} %</span>
                    </div>
                    <Bar pct={c.food_cost_pct} color={foodCostColor(c.food_cost_pct)} />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Produktová tabulka */}
      {visibleProducts.length > 0 && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              {activeConcept
                ? `${CONCEPT_META[activeConcept]?.name ?? activeConcept} — ${t("pnl.byProduct")}`
                : t("pnl.byProduct")}
            </h2>
            {activeConcept && (
              <button onClick={() => setActiveConcept(null)} className="text-xs text-[var(--muted)] hover:text-white">
                {t("pnl.allConcepts")} ×
              </button>
            )}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <tr>
                  <th className="p-3 font-medium">{t("pnl.col.product")}</th>
                  <th className="p-3 font-medium">{t("pnl.col.portions")}</th>
                  <th className="p-3 font-medium">{t("pnl.col.revenue")}</th>
                  <th className="p-3 font-medium">{t("pnl.col.foodCost")}</th>
                  <th className="p-3 font-medium">{t("pnl.col.foodCostPct")}</th>
                  <th className="p-3 font-medium">{t("pnl.col.margin")}</th>
                  <th className="p-3 font-medium">{t("pnl.col.marginPct")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map(p => {
                  const meta = CONCEPT_META[p.concept_slug];
                  return (
                    <tr key={p.product_id} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3">
                        <span className="font-medium">{p.product_name}</span>
                        {!activeConcept && meta && (
                          <span className="ml-2 text-xs" style={{ color: meta.accent }}>{meta.emoji}</span>
                        )}
                      </td>
                      <td className="p-3 text-[var(--muted)]">{p.portions}</td>
                      <td className="p-3">{formatCzk(p.revenue)}</td>
                      <td className="p-3 text-[var(--muted)]">{formatCzk(p.food_cost)}</td>
                      <td className="p-3"><Pct value={p.food_cost_pct} /></td>
                      <td className="p-3">{formatCzk(p.gross_margin)}</td>
                      <td className="p-3"><Pct value={p.gross_margin_pct} good /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">{t("pnl.footnote")}</p>
        </>
      )}
    </div>
  );
}
