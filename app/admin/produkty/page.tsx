"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCzk } from "@/lib/types";

interface Product {
  id: string;
  concept_slug: string;
  name: string;
  description: string;
  price_czk: number;
  category: string;
  tags: string[];
  available: boolean;
  sort_order: number;
}

const CONCEPTS = [
  { slug: "sunny-side", name: "Prostě snídaně", accent: "#f59e0b" },
  { slug: "dumply", name: "Dumply", accent: "#ef4444" },
  { slug: "smash", name: "L.T. Smash", accent: "#f97316" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [showNew, setShowNew] = useState(false);
  const [newData, setNewData] = useState<Partial<Product>>({ concept_slug: "dumply", available: true, sort_order: 99 });
  const [saving, setSaving] = useState(false);

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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !p.available }),
    });
  }

  function startEdit(p: Product) {
    setEditing(p.id);
    setEditData({ name: p.name, description: p.description, price_czk: p.price_czk, category: p.category });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    setEditing(null);
    setSaving(false);
    load();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Opravdu smazat tuto položku?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  }

  async function createProduct() {
    if (!newData.name || !newData.price_czk) return;
    setSaving(true);
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newData),
    });
    setShowNew(false);
    setNewData({ concept_slug: "dumply", available: true, sort_order: 99 });
    setSaving(false);
    load();
  }

  const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produkty</h1>
          <p className="text-sm text-[var(--muted)]">{products.length} položek · {loading ? "načítám…" : "živá data"}</p>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
            <option value="">Všechny koncepty</option>
            {CONCEPTS.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <button onClick={() => setShowNew(!showNew)}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 transition">
            + Přidat produkt
          </button>
        </div>
      </div>

      {/* Nový produkt */}
      {showNew && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
          <h2 className="font-medium">Nový produkt</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--muted)]">Koncept</label>
              <select value={newData.concept_slug} onChange={e => setNewData({ ...newData, concept_slug: e.target.value })} className={inputCls}>
                {CONCEPTS.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Kategorie</label>
              <input value={newData.category ?? ""} onChange={e => setNewData({ ...newData, category: e.target.value })} placeholder="Jídlo" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Název *</label>
              <input value={newData.name ?? ""} onChange={e => setNewData({ ...newData, name: e.target.value })} placeholder="Nová položka" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Cena (Kč) *</label>
              <input type="number" value={newData.price_czk ?? ""} onChange={e => setNewData({ ...newData, price_czk: Number(e.target.value) })} placeholder="149" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--muted)]">Popis</label>
              <input value={newData.description ?? ""} onChange={e => setNewData({ ...newData, description: e.target.value })} placeholder="Stručný popis" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={createProduct} disabled={saving}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {saving ? "Ukládám…" : "Vytvořit"}
            </button>
            <button onClick={() => setShowNew(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white">
              Zrušit
            </button>
          </div>
        </div>
      )}

      {/* Tabulka produktů */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">Položka</th>
              <th className="p-3 font-medium">Koncept</th>
              <th className="p-3 font-medium">Kategorie</th>
              <th className="p-3 font-medium">Cena</th>
              <th className="p-3 font-medium">Stav</th>
              <th className="p-3 font-medium">Akce</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const concept = CONCEPTS.find(c => c.slug === p.concept_slug);
              const isEditing = editing === p.id;
              return (
                <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input value={editData.name ?? ""} onChange={e => setEditData({ ...editData, name: e.target.value })} className={inputCls} />
                        <input value={editData.description ?? ""} onChange={e => setEditData({ ...editData, description: e.target.value })} className={inputCls} placeholder="Popis" />
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <div className="text-xs text-[var(--muted)]">{p.description}</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <span style={{ color: concept?.accent }}>{concept?.name ?? p.concept_slug}</span>
                  </td>
                  <td className="p-3 text-[var(--muted)]">
                    {isEditing ? (
                      <input value={editData.category ?? ""} onChange={e => setEditData({ ...editData, category: e.target.value })} className={inputCls} />
                    ) : p.category}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <input type="number" value={editData.price_czk ?? ""} onChange={e => setEditData({ ...editData, price_czk: Number(e.target.value) })} className={inputCls + " w-20"} />
                    ) : formatCzk(p.price_czk)}
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleAvail(p)}
                      className={"rounded-full px-3 py-1 text-xs font-medium " + (p.available ? "bg-green-500/15 text-green-400" : "bg-neutral-800 text-[var(--muted)]")}>
                      {p.available ? "V prodeji" : "Skryto"}
                    </button>
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(p.id)} disabled={saving}
                          className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
                          {saving ? "…" : "Uložit"}
                        </button>
                        <button onClick={() => setEditing(null)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">✕</button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(p)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">Upravit</button>
                        <button onClick={() => deleteProduct(p.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">Smazat</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
          <div className="p-10 text-center text-[var(--muted)]">Zatím žádné produkty. Klikni &quot;Přidat produkt&quot; nebo spusť seed migraci.</div>
        )}
      </div>
    </div>
  );
}
