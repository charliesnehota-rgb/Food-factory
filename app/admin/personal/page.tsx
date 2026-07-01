"use client";

import { useEffect, useState, useCallback } from "react";
import { useT } from "@/lib/i18n";

const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

interface Staff { id: string; email: string; name: string; role: string; created_at: string; }

export default function PersonalPage() {
  const t = useT();

  const ROLES = [
    { value: "staff", label: t("role.staff") },
    { value: "admin", label: t("role.admin") },
    { value: "accountant", label: t("role.accountant") },
  ];

  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "staff" });
  const [saving, setSaving] = useState(false);
  const [invited, setInvited] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/staff");
    const d = await r.json();
    if (Array.isArray(d)) setRows(d);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!form.email || !form.name) return;
    setSaving(true);
    const r = await fetch("/api/admin/staff", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { alert(d.error ?? t("common.error")); return; }
    setInvited(d.email);
    setForm({ email: "", name: "", role: "staff" });
    setOpen(false);
    load();
  }

  async function changeRole(id: string, role: string) {
    await fetch(`/api/admin/staff/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }),
    });
    load();
  }

  async function remove(s: Staff) {
    if (!confirm(t("personal.deleteConfirm", { name: s.name || s.email }))) return;
    const r = await fetch(`/api/admin/staff/${s.id}`, { method: "DELETE" });
    if (!r.ok) { const e = await r.json(); alert(e.error ?? t("common.error")); return; }
    load();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("personal.title")}</h1>
          <p className="text-sm text-[var(--muted)]">
            {t("personal.desc")} {t("personal.accounts", { count: rows.length })}
            {loading ? " · " + t("common.loading") : ""}
          </p>
        </div>
        <button
          onClick={() => { setOpen(!open); setInvited(null); }}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
        >
          {t("personal.add")}
        </button>
      </div>

      {invited && (
        <div className="mb-5 rounded-2xl border border-green-500/30 bg-green-500/5 p-5">
          <h2 className="mb-1 font-medium text-green-400">{t("personal.created.title")}</h2>
          <p className="text-sm text-[var(--muted)]">
            {t("personal.created.desc")} <span className="font-medium text-white">{invited}</span>
          </p>
          <button onClick={() => setInvited(null)} className="mt-3 text-xs text-[var(--muted)] hover:text-white">
            {t("common.close")}
          </button>
        </div>
      )}

      {open && (
        <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="mb-3 font-medium">{t("personal.newTitle")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-[var(--muted)]">{t("personal.labelName")}</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls + " w-full"} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">{t("personal.labelEmail")}</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls + " w-full"} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">{t("personal.labelRole")}</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls + " w-full"}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">{t("personal.hint")}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={submit} disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {saving ? t("personal.creating") : t("personal.createBtn")}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">{t("personal.col.name")}</th>
              <th className="p-3 font-medium">{t("personal.col.email")}</th>
              <th className="p-3 font-medium">{t("personal.col.role")}</th>
              <th className="p-3 font-medium">{t("personal.col.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3 font-medium">{s.name || "—"}</td>
                <td className="p-3 text-[var(--muted)]">{s.email}</td>
                <td className="p-3">
                  <select value={s.role} onChange={(e) => changeRole(s.id, e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <button onClick={() => remove(s)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">
                    {t("common.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && (
          <div className="p-8 text-center text-[var(--muted)]">{t("personal.empty")}</div>
        )}
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">{t("personal.rolesNote")}</p>
    </div>
  );
}
