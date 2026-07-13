"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { formatCzk } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { ALLERGENS } from "@/lib/allergens";

interface Product {
  id: string; concept_slug: string; name: string; description: string;
  price_czk: number; category: string; tags: string[]; available: boolean; sort_order: number;
  allergens: number[];
}

// Chips 1–14 pro výběr alergenů (EU 1169/2011)
function AllergenChips({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const toggle = (n: number) =>
    onChange(value.includes(n) ? value.filter(x => x !== n) : [...value, n].sort((a, b) => a - b));
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 14 }, (_, i) => i + 1).map(n => (
        <button key={n} type="button" onClick={() => toggle(n)}
          title={ALLERGENS[n]}
          className={"h-7 w-7 rounded-full text-xs font-semibold border transition " +
            (value.includes(n)
              ? "bg-white text-black border-white"
              : "border-[var(--border)] text-[var(--muted)] hover:border-neutral-500")}>
          {n}
        </button>
      ))}
    </div>
  );
}

interface Customization {
  id: string; product_id: string; name: string;
  price_czk: number; available: boolean; sort_order: number;
}

const CONCEPTS = [
  { slug: "sunny-side", name: "Prostě snídaně", accent: "#f59e0b" },
  { slug: "dumply", name: "Dumply", accent: "#ef4444" },
  { slug: "smash", name: "L.T. Smash", accent: "#f97316" },
];

export default function ProductsPage() {
  const t = useT();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [showNew, setShowNew] = useState(false);
  const [newData, setNewData] = useState<Partial<Product>>({ concept_slug: "dumply", available: true, sort_order: 99 });
  const [saving, setSaving] = useState(false);

  // ── Customizace (přídavky per produkt) ──
  const [custOpen, setCustOpen] = useState<string | null>(null);         // rozbalený produkt
  const [custs, setCusts] = useState<Record<string, Customization[]>>({});
  const [custLoading, setCustLoading] = useState(false);
  const [custNew, setCustNew] = useState({ name: "", price_czk: "", available: true });
  const [custSaving, setCustSaving] = useState(false);

  const loadCusts = useCallback(async (productId: string) => {
    setCustLoading(true);
    const res = await fetch(`/api/products/${productId}/customizations?all=1`);
    const data = await res.json();
    setCusts(prev => ({ ...prev, [productId]: Array.isArray(data) ? data : [] }));
    setCustLoading(false);
  }, []);

  function toggleCustSection(productId: string) {
    if (custOpen === productId) { setCustOpen(null); return; }
    setCustOpen(productId);
    setCustNew({ name: "", price_czk: "", available: true });
    if (!custs[productId]) loadCusts(productId);
  }

  async function createCust(productId: string) {
    if (!custNew.name.trim()) return;
    setCustSaving(true);
    await fetch(`/api/products/${productId}/customizations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: custNew.name.trim(),
        price_czk: Number(custNew.price_czk) || 0,
        available: custNew.available,
        sort_order: (custs[productId]?.length ?? 0) + 1,
      }),
    });
    setCustNew({ name: "", price_czk: "", available: true });
    setCustSaving(false);
    loadCusts(productId);
  }

  async function toggleCustAvail(c: Customization) {
    setCusts(prev => ({
      ...prev,
      [c.product_id]: (prev[c.product_id] ?? []).map(x => x.id === c.id ? { ...x, available: !x.available } : x),
    }));
    await fetch(`/api/customizations/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !c.available }),
    });
  }

  async function deleteCust(c: Customization) {
    if (!confirm(t("customizations.deleteConfirm"))) return;
    await fetch(`/api/customizations/${c.id}`, { method: "DELETE" });
    loadCusts(c.product_id);
  }

  const load = useCallback(async () => {
    const res = await fetch("/api/products?all=1");
    const data = await res.json();
    if (Array.isArray(data)) setProducts(data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = filter ? products.filter(p => p.concept_slug === filter) : products;

  async function toggleAvail(p: Product) {
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, available: !x.available } : x));
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !p.available }),
    });
  }
  function startEdit(p: Product) {
    setEditing(p.id);
    setEditData({ name: p.name, description: p.description, price_czk: p.price_czk, category: p.category });
  }
  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editData) });
    setEditing(null); setSaving(false); load();
  }
  async function deleteProduct(id: string) {
    if (!confirm(t("products.deleteConfirm"))) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" }); load();
  }
  async function createProduct() {
    if (!newData.name || !newData.price_czk) return;
    setSaving(true);
    await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newData) });
    setShowNew(false); setNewData({ concept_slug: "dumply", available: true, sort_order: 99 }); setSaving(false); load();
  }

  const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("products.title")}</h1>
          <p className="text-sm text-[var(--muted)]">{products.length} · {loading ? t("common.loading") : "live"}</p>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
            <option value="">{t("common.all")}</option>
            {CONCEPTS.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <button onClick={() => setShowNew(!showNew)}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 transition">
            {t("products.add")}
          </button>
        </div>
      </div>

      {showNew && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
          <h2 className="font-medium">{t("products.newTitle")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--muted)]">{t("products.labelConcept")}</label>
              <select value={newData.concept_slug} onChange={e => setNewData({ ...newData, concept_slug: e.target.value })} className={inputCls}>
                {CONCEPTS.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">{t("common.name")}</label>
              <input value={newData.category ?? ""} onChange={e => setNewData({ ...newData, category: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">{t("products.labelName")}</label>
              <input value={newData.name ?? ""} onChange={e => setNewData({ ...newData, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">{t("products.labelPrice")}</label>
              <input type="number" value={newData.price_czk ?? ""} onChange={e => setNewData({ ...newData, price_czk: Number(e.target.value) })} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--muted)]">{t("products.labelDesc")}</label>
              <input value={newData.description ?? ""} onChange={e => setNewData({ ...newData, description: e.target.value })} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--muted)] block mb-1">{t("products.labelAllergens")}</label>
              <AllergenChips value={newData.allergens ?? []} onChange={v => setNewData({ ...newData, allergens: v })} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={createProduct} disabled={saving}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {saving ? t("common.saving") : t("common.save")}
            </button>
            <button onClick={() => setShowNew(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">{t("products.col.name")}</th>
              <th className="p-3 font-medium">{t("products.labelConcept")}</th>
              <th className="p-3 font-medium">{t("common.name")}</th>
              <th className="p-3 font-medium">{t("products.col.price")}</th>
              <th className="p-3 font-medium">{t("products.col.available")}</th>
              <th className="p-3 font-medium">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const concept = CONCEPTS.find(c => c.slug === p.concept_slug);
              const isEditing = editing === p.id;
              const isCustOpen = custOpen === p.id;
              const pCusts = custs[p.id] ?? [];
              return (
                <Fragment key={p.id}>
                <tr className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input value={editData.name ?? ""} onChange={e => setEditData({ ...editData, name: e.target.value })} className={inputCls} />
                        <input value={editData.description ?? ""} onChange={e => setEditData({ ...editData, description: e.target.value })} className={inputCls} />
                        <AllergenChips value={editData.allergens ?? []} onChange={v => setEditData({ ...editData, allergens: v })} />
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <div className="text-xs text-[var(--muted)]">{p.description}</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3"><span style={{ color: concept?.accent }}>{concept?.name ?? p.concept_slug}</span></td>
                  <td className="p-3 text-[var(--muted)]">
                    {isEditing ? <input value={editData.category ?? ""} onChange={e => setEditData({ ...editData, category: e.target.value })} className={inputCls} /> : p.category}
                  </td>
                  <td className="p-3">
                    {isEditing ? <input type="number" value={editData.price_czk ?? ""} onChange={e => setEditData({ ...editData, price_czk: Number(e.target.value) })} className={inputCls + " w-20"} /> : formatCzk(p.price_czk)}
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleAvail(p)}
                      className={"rounded-full px-3 py-1 text-xs font-medium " + (p.available ? "bg-green-500/15 text-green-400" : "bg-neutral-800 text-[var(--muted)]")}>
                      {p.available ? t("products.available.yes") : t("products.available.no")}
                    </button>
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(p.id)} disabled={saving}
                          className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
                          {saving ? "…" : t("common.save")}
                        </button>
                        <button onClick={() => setEditing(null)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">✕</button>
                      </div>
                    ) : (
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => toggleCustSection(p.id)}
                          className={"rounded-lg border px-2.5 py-1 text-xs transition " + (isCustOpen ? "border-neutral-400 text-white bg-neutral-800" : "border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-neutral-600")}>
                          {t("customizations.button")}{pCusts.length > 0 ? ` (${pCusts.length})` : ""}
                        </button>
                        <button onClick={() => startEdit(p)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">{t("common.edit")}</button>
                        <button onClick={() => deleteProduct(p.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">{t("common.delete")}</button>
                      </div>
                    )}
                  </td>
                </tr>

                {/* ── Customizace produktu (rozbalovací sekce) ── */}
                {isCustOpen && (
                  <tr className="border-b border-[var(--border)] last:border-0">
                    <td colSpan={6} className="p-0">
                      <div className="bg-[var(--bg)] px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium">{t("customizations.title")} · <span className="text-[var(--muted)]">{p.name}</span></h3>
                        </div>

                        {custLoading && pCusts.length === 0 ? (
                          <p className="text-sm text-[var(--muted)]">{t("common.loading")}</p>
                        ) : pCusts.length === 0 ? (
                          <p className="text-sm text-[var(--muted)] mb-3">{t("customizations.empty")}</p>
                        ) : (
                          <div className="overflow-x-auto mb-3 rounded-xl border border-[var(--border)]">
                            <table className="w-full text-sm">
                              <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                                <tr>
                                  <th className="p-2.5 font-medium">{t("customizations.col.name")}</th>
                                  <th className="p-2.5 font-medium">{t("customizations.col.price")}</th>
                                  <th className="p-2.5 font-medium">{t("products.col.available")}</th>
                                  <th className="p-2.5 font-medium">{t("common.actions")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pCusts.map(c => (
                                  <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                                    <td className="p-2.5">{c.name}</td>
                                    <td className="p-2.5">+{formatCzk(c.price_czk)}</td>
                                    <td className="p-2.5">
                                      <button onClick={() => toggleCustAvail(c)}
                                        className={"rounded-full px-2.5 py-0.5 text-xs font-medium " + (c.available ? "bg-green-500/15 text-green-400" : "bg-neutral-800 text-[var(--muted)]")}>
                                        {c.available ? t("products.available.yes") : t("products.available.no")}
                                      </button>
                                    </td>
                                    <td className="p-2.5">
                                      <button onClick={() => deleteCust(c)}
                                        className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">
                                        {t("common.delete")}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Nová customizace */}
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex-1 min-w-[150px]">
                            <label className="text-xs text-[var(--muted)]">{t("customizations.labelName")}</label>
                            <input value={custNew.name} onChange={e => setCustNew({ ...custNew, name: e.target.value })}
                              placeholder={t("customizations.namePlaceholder")} className={inputCls} />
                          </div>
                          <div className="w-28">
                            <label className="text-xs text-[var(--muted)]">{t("customizations.labelPrice")}</label>
                            <input type="number" min={0} value={custNew.price_czk}
                              onChange={e => setCustNew({ ...custNew, price_czk: e.target.value })}
                              placeholder="0" className={inputCls} />
                          </div>
                          <label className="flex items-center gap-2 text-sm pb-1.5 cursor-pointer select-none">
                            <input type="checkbox" checked={custNew.available}
                              onChange={e => setCustNew({ ...custNew, available: e.target.checked })}
                              className="h-4 w-4 accent-white" />
                            {t("products.labelAvailable")}
                          </label>
                          <button onClick={() => createCust(p.id)} disabled={custSaving || !custNew.name.trim()}
                            className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50 transition">
                            {custSaving ? t("common.saving") : t("customizations.add")}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
          <div className="p-10 text-center text-[var(--muted)]">{t("common.noData")}</div>
        )}
      </div>
    </div>
  );
}
