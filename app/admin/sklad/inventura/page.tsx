"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCzk } from "@/lib/types";
import { formatQty, baseUnitLabel, type BaseUnit } from "@/lib/stock/units";
import type { Stocktake, StocktakeItem, StockCategory } from "@/lib/stock/types";

const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

export default function InventuraPage() {
  const [takes, setTakes] = useState<Stocktake[]>([]);
  const [cats, setCats] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNew, setShowNew] = useState(false);
  const [selCats, setSelCats] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Stocktake | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const [t, c] = await Promise.all([
      fetch("/api/sklad/stocktakes").then((r) => r.json()),
      fetch("/api/sklad/categories").then((r) => r.json()),
    ]);
    if (Array.isArray(t)) setTakes(t);
    if (Array.isArray(c)) setCats(c);
    setLoading(false);
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = useCallback(async (id: string) => {
    setOpenId(id);
    setDetail(null);
    const d: Stocktake = await fetch(`/api/sklad/stocktakes/${id}`).then((r) => r.json());
    setDetail(d);
    const init: Record<string, string> = {};
    for (const it of d.items ?? []) init[it.id] = it.counted_qty != null ? String(Number(it.counted_qty)) : "";
    setCounts(init);
  }, []);

  function toggleCat(id: string) {
    setSelCats((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  async function createTake() {
    setCreating(true);
    const r = await fetch("/api/sklad/stocktakes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_ids: selCats, note }),
    });
    setCreating(false);
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Chyba"); return; }
    const t = await r.json();
    setShowNew(false); setSelCats([]); setNote("");
    await loadList();
    openDetail(t.id);
  }

  async function saveCounts() {
    if (!detail) return;
    const payload: Record<string, number | null> = {};
    for (const [itemId, v] of Object.entries(counts)) payload[itemId] = v === "" ? null : Number(v);
    await fetch(`/api/sklad/stocktakes/${detail.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counts: payload }),
    });
  }

  async function handleSave() {
    setBusy(true); await saveCounts(); setBusy(false); alert("Počty uloženy.");
  }

  async function handleClose() {
    if (!detail) return;
    if (!confirm("Uzavřít inventuru? Stav skladu se srovná na napočítaná čísla a doklad se uzamkne.")) return;
    setBusy(true);
    await saveCounts();
    const r = await fetch(`/api/sklad/stocktakes/${detail.id}/close`, { method: "POST" });
    setBusy(false);
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Chyba"); return; }
    await loadList();
    openDetail(detail.id);
  }

  async function deleteTake(id: string) {
    if (!confirm("Smazat koncept inventury?")) return;
    const r = await fetch(`/api/sklad/stocktakes/${id}`, { method: "DELETE" });
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Chyba"); return; }
    if (openId === id) { setOpenId(null); setDetail(null); }
    loadList();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inventura</h1>
          <p className="text-sm text-[var(--muted)]">Napočítaný stav vs. účetní. Uzavřením se rozdíly srovnají pohybem typu inventura.</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">+ Nová inventura</button>
      </div>

      {showNew && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-2 text-sm font-medium">Které kategorie zahrnout? (nic = všechny aktivní karty)</div>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <label key={c.id} className={"flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm cursor-pointer " + (selCats.includes(c.id) ? "border-white" : "border-[var(--border)] text-[var(--muted)]")}>
                <input type="checkbox" checked={selCats.includes(c.id)} onChange={() => toggleCat(c.id)} />
                {c.name}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <input placeholder="poznámka (volitelně)" value={note} onChange={(e) => setNote(e.target.value)} className={inputCls + " min-w-[240px]"} />
            <button onClick={createTake} disabled={creating} className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">{creating ? "Zakládám…" : "Založit a počítat"}</button>
            <button onClick={() => setShowNew(false)} className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] hover:text-white">Zrušit</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr><th className="p-3 font-medium">Inventura</th><th className="p-3 font-medium">Založeno</th><th className="p-3 font-medium">Stav</th><th className="p-3 font-medium">Akce</th></tr>
          </thead>
          <tbody>
            {takes.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3"><button onClick={() => openDetail(t.id)} className="font-medium hover:underline">{t.stocktake_number}</button>{t.note && <div className="text-xs text-[var(--muted)]">{t.note}</div>}</td>
                <td className="p-3 text-[var(--muted)]">{new Date(t.created_at).toLocaleDateString("cs-CZ")}</td>
                <td className="p-3"><span className={"rounded-full px-3 py-1 text-xs font-medium " + (t.status === "closed" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>{t.status === "closed" ? "Uzavřená" : "Koncept"}</span></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => openDetail(t.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">{t.status === "closed" ? "Detail" : "Počítat"}</button>
                    {t.status === "draft" && <button onClick={() => deleteTake(t.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">Smazat</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {takes.length === 0 && !loading && <div className="p-8 text-center text-[var(--muted)]">Zatím žádné inventury.</div>}
      </div>

      {openId && detail && <Detail take={detail} counts={counts} setCounts={setCounts} busy={busy} onSave={handleSave} onClose={handleClose} />}
    </div>
  );
}

function Detail({ take, counts, setCounts, busy, onSave, onClose }: {
  take: Stocktake;
  counts: Record<string, string>;
  setCounts: (c: Record<string, string>) => void;
  busy: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const closed = take.status === "closed";
  const items = take.items ?? [];
  const [q, setQ] = useState("");
  const filtered = q ? items.filter((it) => (it.stock_item?.name ?? "").toLowerCase().includes(q.toLowerCase())) : items;

  function valueOf(it: StocktakeItem, diff: number) {
    const avg = Number(it.unit_price_czk ?? it.stock_item?.avg_price_czk ?? 0);
    return diff * avg;
  }

  let totalDiffValue = 0;
  for (const it of items) {
    const base: BaseUnit = it.stock_item?.base_unit ?? "ks";
    void base;
    const sys = closed ? Number(it.system_qty ?? 0) : Number(it.stock_item?.current_qty ?? 0);
    const cv = closed ? it.counted_qty : (counts[it.id] === "" || counts[it.id] == null ? null : Number(counts[it.id]));
    if (cv != null) totalDiffValue += valueOf(it, Number(cv) - sys);
  }

  return (
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-medium">{take.stocktake_number} {closed && <span className="ml-2 text-xs text-green-400">(uzavřená)</span>}</h2>
        {!closed && (
          <div className="flex gap-2">
            <button onClick={onSave} disabled={busy} className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--muted)] hover:text-white disabled:opacity-50">Uložit počty</button>
            <button onClick={onClose} disabled={busy} className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">{busy ? "…" : "Uzavřít inventuru"}</button>
          </div>
        )}
      </div>

      <div className="mb-3">
        <input placeholder="hledat surovinu…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-2 font-medium">Surovina</th>
              <th className="p-2 font-medium">Účetní stav</th>
              <th className="p-2 font-medium">Napočítáno</th>
              <th className="p-2 font-medium">Rozdíl</th>
              <th className="p-2 font-medium">Hodnota</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => {
              const base: BaseUnit = it.stock_item?.base_unit ?? "ks";
              const sys = closed ? Number(it.system_qty ?? 0) : Number(it.stock_item?.current_qty ?? 0);
              const countedStr = closed ? (it.counted_qty != null ? String(Number(it.counted_qty)) : "") : (counts[it.id] ?? "");
              const counted = countedStr === "" ? null : Number(countedStr);
              const diff = counted == null ? null : counted - sys;
              return (
                <tr key={it.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-2 font-medium">{it.stock_item?.name ?? "—"}</td>
                  <td className="p-2 text-[var(--muted)]">{formatQty(sys, base)}</td>
                  <td className="p-2">
                    {closed ? (counted != null ? `${counted} ${baseUnitLabel(base)}` : <span className="text-[var(--muted)]">nepočítáno</span>)
                      : <span className="flex items-center gap-1">
                          <input type="number" value={counts[it.id] ?? ""} onChange={(e) => setCounts({ ...counts, [it.id]: e.target.value })} className={inputCls + " w-24"} placeholder="—" />
                          <span className="text-[var(--muted)]">{baseUnitLabel(base)}</span>
                        </span>}
                  </td>
                  <td className={"p-2 " + (diff == null ? "text-[var(--muted)]" : diff < 0 ? "text-red-400" : diff > 0 ? "text-green-400" : "")}>
                    {diff == null ? "—" : `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${formatQty(Math.abs(diff), base)}`}
                  </td>
                  <td className="p-2 text-[var(--muted)]">{diff == null || diff === 0 ? "—" : formatCzk(valueOf(it, diff))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-sm text-[var(--muted)]">
        Souhrn rozdílů: <span className={totalDiffValue < 0 ? "text-red-400" : "text-green-400"}>{formatCzk(totalDiffValue)}</span>
        {!closed && <span> · po uzavření se stav srovná na napočítaná čísla</span>}
      </div>
    </div>
  );
}
