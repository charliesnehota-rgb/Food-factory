"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCzk } from "@/lib/types";
import { formatQty } from "@/lib/stock/units";
import type { StockMovement, StockItem } from "@/lib/stock/types";

const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

const TYPE_LABEL: Record<string, string> = {
  receipt: "Příjem", consumption: "Spotřeba", write_off: "Odpis", adjustment: "Korekce", stocktake: "Inventura",
};

export default function PohybyPage() {
  const [moves, setMoves] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // ruční korekce
  const [adjItem, setAdjItem] = useState("");
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (item?: string) => {
    const url = item ? `/api/sklad/movements?item=${item}` : "/api/sklad/movements";
    const [m, i] = await Promise.all([
      fetch(url).then((r) => r.json()),
      items.length ? Promise.resolve(items) : fetch("/api/sklad/items?all=1").then((r) => r.json()),
    ]);
    if (Array.isArray(m)) setMoves(m);
    if (Array.isArray(i)) setItems(i);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(filter); }, [filter, load]);

  async function saveAdjustment() {
    if (!adjItem || !adjQty || Number(adjQty) === 0) return;
    setSaving(true);
    const r = await fetch("/api/sklad/movements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock_item_id: adjItem, qty_change: Number(adjQty), reason: adjReason || "korekce" }),
    });
    setSaving(false);
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Chyba"); return; }
    setAdjItem(""); setAdjQty(""); setAdjReason("");
    load(filter);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Kniha pohybů</h1>
          <p className="text-sm text-[var(--muted)]">Každý příjem, výdej i korekce. Needituje se — oprava = nový pohyb.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls}>
          <option value="">Všechny suroviny</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Ruční korekce stavu</div>
        <div className="flex flex-wrap items-end gap-2">
          <select value={adjItem} onChange={(e) => setAdjItem(e.target.value)} className={inputCls}>
            <option value="">— surovina —</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.base_unit})</option>)}
          </select>
          <input type="number" placeholder="změna (+/− v zákl. jednotce)" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} className={inputCls + " w-56"} />
          <input placeholder="důvod" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} className={inputCls} />
          <button onClick={saveAdjustment} disabled={saving} className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">{saving ? "…" : "Zapsat korekci"}</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">Datum</th>
              <th className="p-3 font-medium">Surovina</th>
              <th className="p-3 font-medium">Typ</th>
              <th className="p-3 font-medium">Změna</th>
              <th className="p-3 font-medium">Cena/j.</th>
              <th className="p-3 font-medium">Důvod</th>
              <th className="p-3 font-medium">Kdo</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m) => {
              const base = m.stock_item?.base_unit ?? "ks";
              const pos = Number(m.qty_change) >= 0;
              return (
                <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3 text-[var(--muted)]">{new Date(m.created_at).toLocaleString("cs-CZ")}</td>
                  <td className="p-3 font-medium">{m.stock_item?.name ?? "—"}</td>
                  <td className="p-3 text-[var(--muted)]">{TYPE_LABEL[m.type] ?? m.type}</td>
                  <td className={"p-3 " + (pos ? "text-green-400" : "text-amber-400")}>{pos ? "+" : "−"}{formatQty(Math.abs(Number(m.qty_change)), base)}</td>
                  <td className="p-3 text-[var(--muted)]">{m.unit_price_czk != null ? formatCzk(Number(m.unit_price_czk)) : "—"}</td>
                  <td className="p-3 text-[var(--muted)]">{m.reason ?? "—"}</td>
                  <td className="p-3 text-[var(--muted)]">{m.created_by}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {moves.length === 0 && !loading && <div className="p-8 text-center text-[var(--muted)]">Zatím žádné pohyby.</div>}
      </div>
    </div>
  );
}
