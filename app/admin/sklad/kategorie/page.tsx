"use client";

import { useEffect, useState, useCallback } from "react";
import type { StockCategory } from "@/lib/stock/types";
import { useT } from "@/lib/i18n";

const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

export default function KategoriePage() {
  const t = useT();
  const [rows, setRows] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<StockCategory>>({});
  const [showNew, setShowNew] = useState(false);
  const [neu, setNeu] = useState<Partial<StockCategory>>({ vat_rate: 12, sort_order: 99 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/sklad/categories");
    const d = await r.json();
    if (Array.isArray(d)) setRows(d);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!neu.name) return;
    setSaving(true);
    await fetch("/api/sklad/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(neu) });
    setNeu({ vat_rate: 12, sort_order: 99 }); setShowNew(false); setSaving(false); load();
  }
  async function save(id: string) {
    setSaving(true);
    await fetch(`/api/sklad/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) });
    setEditing(null); setSaving(false); load();
  }
  async function remove(id: string) {
    if (!confirm(t("kategorie.deleteConfirm"))) return;
    const r = await fetch(`/api/sklad/categories/${id}`, { method: "DELETE" });
    if (!r.ok) { const e = await r.json(); alert(e.error ?? t("common.error")); return; }
    load();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("kategorie.title")}</h1>
          <p className="text-sm text-[var(--muted)]">DPH sazba se nastavuje zde dle zákona. Karty ji dědí.</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">{t("kategorie.add")}</button>
      </div>

      {showNew && (
        <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-[var(--muted)]">{t("kategorie.labelName")}</label>
              <input value={neu.name ?? ""} onChange={(e) => setNeu({ ...neu, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">{t("products.col.vat")}</label>
              <input type="number" value={neu.vat_rate ?? 12} onChange={(e) => setNeu({ ...neu, vat_rate: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">{t("kategorie.labelOrder")}</label>
              <input type="number" value={neu.sort_order ?? 99} onChange={(e) => setNeu({ ...neu, sort_order: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={create} disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {saving ? t("common.saving") : t("common.save")}
            </button>
            <button onClick={() => setShowNew(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white">{t("common.cancel")}</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">{t("kategorie.col.name")}</th>
              <th className="p-3 font-medium">{t("products.col.vat")}</th>
              <th className="p-3 font-medium">{t("kategorie.col.order")}</th>
              <th className="p-3 font-medium">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const isE = editing === c.id;
              return (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3">{isE ? <input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} /> : <span className="font-medium">{c.name}</span>}</td>
                  <td className="p-3">{isE ? <input type="number" value={edit.vat_rate ?? 0} onChange={(e) => setEdit({ ...edit, vat_rate: Number(e.target.value) })} className={inputCls + " w-20"} /> : `${Number(c.vat_rate)} %`}</td>
                  <td className="p-3 text-[var(--muted)]">{isE ? <input type="number" value={edit.sort_order ?? 0} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} className={inputCls + " w-20"} /> : c.sort_order}</td>
                  <td className="p-3">
                    {isE ? (
                      <div className="flex gap-1">
                        <button onClick={() => save(c.id)} disabled={saving} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50">{saving ? "…" : t("common.save")}</button>
                        <button onClick={() => setEditing(null)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">✕</button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(c.id); setEdit({ name: c.name, vat_rate: c.vat_rate, sort_order: c.sort_order }); }} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">{t("common.edit")}</button>
                        <button onClick={() => remove(c.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">{t("common.delete")}</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && !loading && <div className="p-8 text-center text-[var(--muted)]">{t("kategorie.empty")}</div>}
      </div>
    </div>
  );
}
