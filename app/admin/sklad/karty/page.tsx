"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCzk } from "@/lib/types";
import { formatQty, pricePerBigUnit, type BaseUnit } from "@/lib/stock/units";
import type { StockItem, StockCategory, Supplier } from "@/lib/stock/types";

const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const UNITS: BaseUnit[] = ["g", "ml", "ks"];

const emptyForm: Partial<StockItem> = { name: "", base_unit: "g", min_qty: 0 };

export default function KartyPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [cats, setCats] = useState<StockCategory[]>([]);
  const [sups, setSups] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<StockItem>>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [i, c, s] = await Promise.all([
      fetch("/api/sklad/items?all=1").then((r) => r.json()),
      fetch("/api/sklad/categories").then((r) => r.json()),
      fetch("/api/sklad/suppliers").then((r) => r.json()),
    ]);
    if (Array.isArray(i)) setItems(i);
    if (Array.isArray(c)) setCats(c);
    if (Array.isArray(s)) setSups(s);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = items.filter((it) => showInactive || it.is_active);

  function startNew() { setForm(emptyForm); setEditingId(null); setOpen(true); }
  function startEdit(it: StockItem) {
    setForm({ name: it.name, sku: it.sku, category_id: it.category_id, base_unit: it.base_unit, min_qty: it.min_qty, default_supplier_id: it.default_supplier_id, note: it.note });
    setEditingId(it.id); setOpen(true);
  }

  async function submit() {
    if (!form.name) return;
    setSaving(true);
    const url = editingId ? `/api/sklad/items/${editingId}` : "/api/sklad/items";
    const r = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Chyba"); return; }
    setOpen(false); setForm(emptyForm); setEditingId(null); load();
  }

  async function remove(it: StockItem) {
    if (!confirm(`Smazat kartu "${it.name}"? Pokud má pohyby, jen se deaktivuje.`)) return;
    await fetch(`/api/sklad/items/${it.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Skladové karty</h1>
          <p className="text-sm text-[var(--muted)]">{visible.length} položek{loading ? " · načítám…" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> i neaktivní
          </label>
          <button onClick={startNew} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">+ Nová karta</button>
        </div>
      </div>

      {open && (
        <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="mb-3 font-medium">{editingId ? "Upravit kartu" : "Nová skladová karta"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--muted)]">Název *</label>
              <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="např. Hovězí mleté 20 %" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Kategorie (sazba DPH)</label>
              <select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })} className={inputCls}>
                <option value="">— bez kategorie —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name} ({Number(c.vat_rate)} %)</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Základní jednotka</label>
              <select value={form.base_unit ?? "g"} onChange={(e) => setForm({ ...form, base_unit: e.target.value as BaseUnit })} disabled={!!editingId} className={inputCls}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              {editingId && <p className="mt-1 text-[10px] text-[var(--muted)]">Jednotku u existující karty neměníme (kvůli stavu).</p>}
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Minimum (v {form.base_unit})</label>
              <input type="number" value={form.min_qty ?? 0} onChange={(e) => setForm({ ...form, min_qty: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Výchozí dodavatel</label>
              <select value={form.default_supplier_id ?? ""} onChange={(e) => setForm({ ...form, default_supplier_id: e.target.value || null })} className={inputCls}>
                <option value="">—</option>
                {sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Kód (SKU)</label>
              <input value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--muted)]">Poznámka</label>
              <input value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submit} disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">{saving ? "Ukládám…" : "Uložit"}</button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white">Zrušit</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">Surovina</th>
              <th className="p-3 font-medium">Kategorie</th>
              <th className="p-3 font-medium">Stav</th>
              <th className="p-3 font-medium">Ø cena</th>
              <th className="p-3 font-medium">Hodnota</th>
              <th className="p-3 font-medium">Akce</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((it) => {
              const low = Number(it.min_qty) > 0 && Number(it.current_qty) <= Number(it.min_qty);
              const big = pricePerBigUnit(Number(it.avg_price_czk), it.base_unit);
              const value = Number(it.current_qty) * Number(it.avg_price_czk);
              return (
                <tr key={it.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3">
                    <span className="font-medium">{it.name}</span>{!it.is_active && <span className="ml-2 text-xs text-[var(--muted)]">(neaktivní)</span>}
                    {it.sku && <div className="text-xs text-[var(--muted)]">{it.sku}</div>}
                  </td>
                  <td className="p-3 text-[var(--muted)]">{it.category?.name ?? "—"}{it.category ? ` · ${Number(it.category.vat_rate)} %` : ""}</td>
                  <td className="p-3">
                    <span className={low ? "text-amber-400 font-medium" : ""}>{formatQty(Number(it.current_qty), it.base_unit)}</span>
                    {low && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-400">dochází</span>}
                  </td>
                  <td className="p-3 text-[var(--muted)]">{Number(it.avg_price_czk) > 0 ? `${formatCzk(big.value)}/${big.unit}` : "—"}</td>
                  <td className="p-3">{formatCzk(value)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(it)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">Upravit</button>
                      <button onClick={() => remove(it)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">Smazat</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && !loading && <div className="p-8 text-center text-[var(--muted)]">Zatím žádné karty. Přidej první surovinu.</div>}
      </div>
    </div>
  );
}
