"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCzk } from "@/lib/types";
import { baseUnitLabel, type BaseUnit } from "@/lib/stock/units";
import type { StockItem } from "@/lib/stock/types";
import { useT } from "@/lib/i18n";
import { useToast } from "@/lib/toast";

const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

const CONCEPTS = [
  { slug: "sunny-side", name: "Prostě snídaně" },
  { slug: "dumply", name: "Dumply" },
  { slug: "smash", name: "L.T. Smash" },
];

interface Product { id: string; concept_slug: string; name: string; price_czk: number; }

interface RecipeLine {
  id: string;
  stock_item_id: string;
  qty_per_portion: number;
  stock_item?: { name: string; base_unit: BaseUnit; avg_price_czk: number } | null;
}

export default function RecepturyPage() {
  const t = useT();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [concept, setConcept] = useState("");
  const [productId, setProductId] = useState("");
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);

  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/products?all=1").then((r) => r.json()),
      fetch("/api/sklad/items").then((r) => r.json()),
    ]).then(([p, i]) => {
      if (Array.isArray(p)) setProducts(p);
      if (Array.isArray(i)) setItems(i);
    }).finally(() => setLoading(false));
  }, []);

  const loadLines = useCallback(async (pid: string) => {
    if (!pid) { setLines([]); return; }
    setLoadingLines(true);
    const d = await fetch(`/api/sklad/recipes?product=${pid}`).then((r) => r.json());
    if (Array.isArray(d)) setLines(d);
    setLoadingLines(false);
  }, []);
  useEffect(() => { loadLines(productId); }, [productId, loadLines]);

  const product = products.find((p) => p.id === productId);
  const visibleProducts = concept ? products.filter((p) => p.concept_slug === concept) : products;
  const newItemObj = items.find((i) => i.id === newItem);

  async function addLine() {
    if (!productId || !newItem || !(Number(newQty) > 0)) return;
    setSaving(true);
    const r = await fetch("/api/sklad/recipes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, stock_item_id: newItem, qty_per_portion: Number(newQty) }),
    });
    setSaving(false);
    if (!r.ok) { const e = await r.json(); toast(e.error ?? "Chyba", "error"); return; }
    setNewItem(""); setNewQty(""); loadLines(productId);
  }

  async function saveEdit(id: string) {
    if (!(Number(editQty) > 0)) return;
    await fetch(`/api/sklad/recipes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty_per_portion: Number(editQty) }),
    });
    setEditId(null); loadLines(productId);
  }

  async function remove(id: string) {
    if (!confirm(t("receptury.removeConfirm"))) return;
    await fetch(`/api/sklad/recipes/${id}`, { method: "DELETE" });
    loadLines(productId);
  }

  async function copyRecipe() {
    if (!copyFrom || !productId) return;
    setCopying(true);
    const src: RecipeLine[] = await fetch(`/api/sklad/recipes?product=${copyFrom}`).then((r) => r.json());
    let added = 0, skipped = 0;
    for (const l of Array.isArray(src) ? src : []) {
      const r = await fetch("/api/sklad/recipes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, stock_item_id: l.stock_item_id, qty_per_portion: l.qty_per_portion }),
      });
      if (r.ok) added++; else skipped++;
    }
    setCopying(false); setCopyFrom("");
    loadLines(productId);
    toast(`Zkopírováno ${added} surovin.${skipped ? ` ${skipped} přeskočeno (už v receptuře, "error").` : ""}`);
  }

  const cost = lines.reduce((s, l) => s + Number(l.qty_per_portion) * Number(l.stock_item?.avg_price_czk ?? 0), 0);
  const price = product ? Number(product.price_czk) : 0;
  const margin = price - cost;
  const marginPct = price > 0 ? (margin / price) * 100 : 0;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">{t("receptury.title")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("receptury.desc")}</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <select value={concept} onChange={(e) => { setConcept(e.target.value); setProductId(""); }} className={inputCls}>
          <option value="">Všechny koncepty</option>
          {CONCEPTS.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls + " min-w-[220px]"}>
          <option value="">— vyber produkt —</option>
          {visibleProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {loading && <span className="self-center text-xs text-[var(--muted)]">{t("common.loading")}</span>}
      </div>

      {!productId ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
          {t("receptury.empty")}
        </div>
      ) : (
        <>
          {lines.length === 0 && products.filter((p) => p.id !== productId).length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
              <span className="text-sm text-[var(--muted)]">{t("receptury.copy")}:</span>
              <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={inputCls + " min-w-[200px]"}>
                <option value="">— produkt —</option>
                {products.filter((p) => p.id !== productId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={copyRecipe} disabled={!copyFrom || copying} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:text-white disabled:opacity-50">
                {copying ? t("receptury.copying") : t("receptury.copy")}
              </button>
            </div>
          )}
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <tr>
                  <th className="p-3 font-medium">{t("receptury.col.ing.name")}</th>
                  <th className="p-3 font-medium">{t("receptury.col.ing.qty")}</th>
                  <th className="p-3 font-medium">{t("receptury.col.cost")}</th>
                  <th className="p-3 font-medium"></th>
                  <th className="p-3 font-medium">{t("receptury.col.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const base = l.stock_item?.base_unit ?? "ks";
                  const avg = Number(l.stock_item?.avg_price_czk ?? 0);
                  const lineCost = Number(l.qty_per_portion) * avg;
                  const isE = editId === l.id;
                  return (
                    <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3 font-medium">{l.stock_item?.name ?? "—"}</td>
                      <td className="p-3">
                        {isE ? (
                          <span className="flex items-center gap-1">
                            <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} className={inputCls + " w-24"} />
                            <span className="text-[var(--muted)]">{baseUnitLabel(base)}</span>
                          </span>
                        ) : `${Number(l.qty_per_portion)} ${baseUnitLabel(base)}`}
                      </td>
                      <td className="p-3 text-[var(--muted)]">{avg > 0 ? formatCzk(avg) : "—"}</td>
                      <td className="p-3">{formatCzk(lineCost)}</td>
                      <td className="p-3">
                        {isE ? (
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(l.id)} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-neutral-200">{t("common.save")}</button>
                            <button onClick={() => setEditId(null)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => { setEditId(l.id); setEditQty(String(Number(l.qty_per_portion))); }} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">{t("common.edit")}</button>
                            <button onClick={() => remove(l.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">{t("receptury.col.ing.remove")}</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {lines.length === 0 && !loadingLines && <div className="p-6 text-center text-[var(--muted)]">{t("receptury.noRecipe")}</div>}
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <select value={newItem} onChange={(e) => setNewItem(e.target.value)} className={inputCls + " min-w-[200px]"}>
              <option value="">— {t("receptury.selectItem")} —</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.base_unit})</option>)}
            </select>
            <span className="flex items-center gap-1">
              <input type="number" placeholder={t("common.qtyPlaceholder")} value={newQty} onChange={(e) => setNewQty(e.target.value)} className={inputCls + " w-28"} />
              <span className="text-sm text-[var(--muted)]">{newItemObj ? baseUnitLabel(newItemObj.base_unit) : ""}</span>
            </span>
            <button onClick={addLine} disabled={saving} className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {saving ? t("receptury.saving") : t("receptury.addIngredient")}
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <Card title={t("receptury.col.cost")} value={formatCzk(cost)} hint="suroviny, bez DPH" />
            <Card title={t("receptury.col.price")} value={formatCzk(price)} hint="bez DPH" />
            <Card title={t("receptury.col.margin")} value={formatCzk(margin)} accent={margin < 0 ? "#f87171" : "#4ade80"} />
            <Card title={`${t("receptury.col.margin")} %`} value={price > 0 ? `${marginPct.toFixed(0)} %` : "—"} accent={margin < 0 ? "#f87171" : undefined} />
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">Náklad počítáme z aktuálního váženého průměru surovin. Suroviny zatím bez ceny (nikdy nenaskladněné) se do nákladu počítají nulou.</p>
        </>
      )}
    </div>
  );
}

function Card({ title, value, hint, accent }: { title: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{title}</div>
      <div className="mt-1 text-xl font-semibold" style={accent ? { color: accent } : undefined}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  );
}
