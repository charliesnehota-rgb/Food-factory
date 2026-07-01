"use client";

import { useEffect, useState, useCallback } from "react";
import type { Supplier } from "@/lib/stock/types";
import { useT } from "@/lib/i18n";

const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
const empty: Partial<Supplier> = { name: "", ico: "", dic: "", email: "", phone: "", address: "", note: "" };

export default function DodavatelePage() {
  const t = useT();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Supplier>>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/sklad/suppliers");
    const d = await r.json();
    if (Array.isArray(d)) setRows(d);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function startNew() { setForm(empty); setEditingId(null); setOpen(true); }
  function startEdit(s: Supplier) { setForm(s); setEditingId(s.id); setOpen(true); }
  async function submit() {
    if (!form.name) return;
    setSaving(true);
    const url = editingId ? `/api/sklad/suppliers/${editingId}` : "/api/sklad/suppliers";
    await fetch(url, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setOpen(false); setForm(empty); setEditingId(null); setSaving(false); load();
  }
  async function remove(id: string) {
    if (!confirm(t("dodavatele.deleteConfirm"))) return;
    await fetch(`/api/sklad/suppliers/${id}`, { method: "DELETE" }); load();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("dodavatele.title")}</h1>
          <p className="text-sm text-[var(--muted)]">{rows.length}{loading ? " · " + t("common.loading") : ""}</p>
        </div>
        <button onClick={startNew} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">{t("dodavatele.add")}</button>
      </div>

      {open && (
        <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="mb-3 font-medium">{editingId ? t("dodavatele.editTitle") : t("dodavatele.newTitle")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label={t("dodavatele.labelName")}><input value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} /></F>
            <F label={t("dodavatele.labelIco")}><input value={form.ico ?? ""} onChange={e => setForm({ ...form, ico: e.target.value })} className={inputCls} /></F>
            <F label={t("dodavatele.labelDic")}><input value={form.dic ?? ""} onChange={e => setForm({ ...form, dic: e.target.value })} className={inputCls} /></F>
            <F label={t("dodavatele.labelEmail")}><input value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} /></F>
            <F label={t("dodavatele.labelPhone")}><input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} /></F>
            <F label={t("dodavatele.labelAddress")}><input value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls} /></F>
            <div className="sm:col-span-2"><F label={t("common.note")}><input value={form.note ?? ""} onChange={e => setForm({ ...form, note: e.target.value })} className={inputCls} /></F></div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submit} disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">{saving ? t("common.saving") : t("common.save")}</button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white">{t("common.cancel")}</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">{t("dodavatele.col.name")}</th>
              <th className="p-3 font-medium">{t("dodavatele.col.ico")}</th>
              <th className="p-3 font-medium">{t("dodavatele.col.email")}</th>
              <th className="p-3 font-medium">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3"><span className="font-medium">{s.name}</span>{s.address && <div className="text-xs text-[var(--muted)]">{s.address}</div>}</td>
                <td className="p-3 text-[var(--muted)]">{s.ico || "—"}{s.dic ? ` / ${s.dic}` : ""}</td>
                <td className="p-3 text-[var(--muted)]">{s.email || s.phone || "—"}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(s)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">{t("common.edit")}</button>
                    <button onClick={() => remove(s.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">{t("common.delete")}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && <div className="p-8 text-center text-[var(--muted)]">{t("dodavatele.empty")}</div>}
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-[var(--muted)]">{label}</label>{children}</div>;
}
