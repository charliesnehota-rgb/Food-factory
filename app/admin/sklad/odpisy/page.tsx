"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCzk } from "@/lib/types";
import { formatQty, type BaseUnit } from "@/lib/stock/units";
import type { StockItem } from "@/lib/stock/types";
import { useT } from "@/lib/i18n";

const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

interface WriteOff {
  id: string; qty_change: number; unit_price_czk: number | null; reason: string | null;
  note: string | null; created_by: string; created_at: string;
  stock_item?: { name: string; base_unit: BaseUnit } | null;
}

export default function OdpisyPage() {
  const t = useT();

  const REASONS = [
    { key: "expirace", label: t("odpisy.reason.expiry") },
    { key: "poškození", label: t("odpisy.reason.damage") },
    { key: "ztráta/krádež", label: t("odpisy.reason.loss") },
    { key: "jiné", label: t("odpisy.reason.other") },
  ];

  const [items, setItems] = useState<StockItem[]>([]);
  const [rows, setRows] = useState<WriteOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("expirace");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [w, i] = await Promise.all([
      fetch("/api/sklad/writeoffs").then(r => r.json()),
      fetch("/api/sklad/items").then(r => r.json()),
    ]);
    if (Array.isArray(w)) setRows(w);
    if (Array.isArray(i)) setItems(i);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const itemObj = items.find(i => i.id === item);

  async function submit() {
    if (!item || !(Number(qty) > 0)) return;
    setSaving(true);
    const r = await fetch("/api/sklad/writeoffs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock_item_id: item, qty: Number(qty), reason, note }),
    });
    setSaving(false);
    if (!r.ok) { const e = await r.json(); alert(e.error ?? t("common.error")); return; }
    setItem(""); setQty(""); setNote(""); setReason("expirace"); load();
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">{t("odpisy.title")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("odpisy.desc")}</p>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-end gap-2">
          <select value={item} onChange={e => setItem(e.target.value)} className={inputCls + " min-w-[200px]"}>
            <option value="">{t("odpisy.selectItem")}</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.base_unit})</option>)}
          </select>
          <span className="flex items-center gap-1">
            <input type="number" placeholder={t("odpisy.labelQty")} value={qty} onChange={e => setQty(e.target.value)} className={inputCls + " w-28"} />
            <span className="text-sm text-[var(--muted)]">{itemObj?.base_unit ?? ""}</span>
          </span>
          <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
            {REASONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <input placeholder={t("common.note")} value={note} onChange={e => setNote(e.target.value)} className={inputCls} />
          <button onClick={submit} disabled={saving} className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
            {saving ? "…" : t("odpisy.save")}
          </button>
        </div>
        {itemObj && Number(qty) > 0 && (
          <p className="mt-2 text-xs text-[var(--muted)]">≈ {formatCzk(Number(qty) * Number(itemObj.avg_price_czk))}</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">{t("odpisy.col.date")}</th>
              <th className="p-3 font-medium">{t("odpisy.col.item")}</th>
              <th className="p-3 font-medium">{t("odpisy.col.qty")}</th>
              <th className="p-3 font-medium">{t("odpisy.col.value")}</th>
              <th className="p-3 font-medium">{t("odpisy.col.reason")}</th>
              <th className="p-3 font-medium">{t("personal.col.email")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              const base = w.stock_item?.base_unit ?? "ks";
              const val = Math.abs(Number(w.qty_change)) * Number(w.unit_price_czk ?? 0);
              return (
                <tr key={w.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3 text-[var(--muted)]">{new Date(w.created_at).toLocaleString("cs-CZ")}</td>
                  <td className="p-3 font-medium">{w.stock_item?.name ?? "—"}</td>
                  <td className="p-3 text-amber-400">−{formatQty(Math.abs(Number(w.qty_change)), base)}</td>
                  <td className="p-3">{formatCzk(val)}</td>
                  <td className="p-3 text-[var(--muted)]">{w.reason ?? "—"}{w.note ? ` · ${w.note}` : ""}</td>
                  <td className="p-3 text-[var(--muted)]">{w.created_by}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && !loading && <div className="p-8 text-center text-[var(--muted)]">{t("odpisy.empty")}</div>}
      </div>
    </div>
  );
}
