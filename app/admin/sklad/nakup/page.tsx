"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { displayUnitsFor, toBaseQty, type BaseUnit } from "@/lib/stock/units";
import type { StockItem } from "@/lib/stock/types";

const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

interface Line {
  key: string;
  stock_item_id: string | null; // null = ruční (mimo kartu)
  name: string;
  base_unit: BaseUnit;
  unit: string;        // zobrazovací jednotka (kg/l/ks)
  factor: number;      // base za 1 zobrazovací
  qty: string;         // v zobrazovací jednotce
  vat_rate: number;
  unit_price_base: number | null; // poslední nákupní cena za base jednotku
  supplier: string | null;
  checked: boolean;
  auto: boolean;       // přišlo automaticky (pod minimem)
}

let counter = 0;
const uid = () => `l${++counter}`;

export default function NakupPage() {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addId, setAddId] = useState("");
  const [customName, setCustomName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [shop, all] = await Promise.all([
      fetch("/api/sklad/shopping").then((r) => r.json()),
      fetch("/api/sklad/items").then((r) => r.json()),
    ]);
    if (Array.isArray(all)) setItems(all);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base: Line[] = (shop.items ?? []).map((it: any) => {
      const du = displayUnitsFor(it.base_unit)[0];
      return {
        key: uid(), stock_item_id: it.id, name: it.name, base_unit: it.base_unit,
        unit: du.unit, factor: du.factor,
        qty: String(Math.round((it.suggested_base / du.factor) * 100) / 100),
        vat_rate: it.vat_rate, unit_price_base: it.last_purchase_price_czk,
        supplier: it.supplier_name, checked: true, auto: true,
      };
    });
    setLines(base);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function setLine(key: string, patch: Partial<Line>) {
    setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function removeLine(key: string) { setLines((p) => p.filter((l) => l.key !== key)); }

  function addExisting() {
    if (!addId) return;
    const it = items.find((x) => x.id === addId);
    if (!it) return;
    if (lines.some((l) => l.stock_item_id === it.id)) { setAddId(""); return; }
    const du = displayUnitsFor(it.base_unit)[0];
    setLines((p) => [...p, {
      key: uid(), stock_item_id: it.id, name: it.name, base_unit: it.base_unit,
      unit: du.unit, factor: du.factor, qty: "",
      vat_rate: it.category?.vat_rate != null ? Number(it.category.vat_rate) : 12,
      unit_price_base: it.last_purchase_price_czk ?? null,
      supplier: it.supplier?.name ?? null, checked: true, auto: false,
    }]);
    setAddId("");
  }
  function addCustom() {
    if (!customName.trim()) return;
    setLines((p) => [...p, {
      key: uid(), stock_item_id: null, name: customName.trim(), base_unit: "ks",
      unit: "ks", factor: 1, qty: "", vat_rate: 12, unit_price_base: null,
      supplier: null, checked: true, auto: false,
    }]);
    setCustomName("");
  }

  const chosen = lines.filter((l) => l.checked && Number(l.qty) > 0);

  function printList() {
    const rows = chosen.map((l) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #ddd">${esc(l.name)}</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${l.qty} ${l.unit}</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${esc(l.supplier ?? "")}</td><td style="padding:6px 10px;border-bottom:1px solid #ddd;width:120px"></td></tr>`).join("");
    const html = `<html><head><meta charset="utf-8"><title>Nákupní seznam</title></head><body style="font-family:system-ui,sans-serif;padding:24px">
      <h1 style="font-size:20px">Nákupní seznam</h1>
      <p style="color:#666">${new Date().toLocaleDateString("cs-CZ")} · ${chosen.length} položek</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Surovina</th><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Množství</th><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Dodavatel</th><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Koupeno</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  }

  function downloadCsv() {
    const header = ["Surovina", "Množství", "Jednotka", "Dodavatel"];
    const body = [header.join(";"), ...chosen.map((l) => [csv(l.name), String(l.qty).replace(".", ","), l.unit, csv(l.supplier ?? "")].join(";"))].join("\r\n");
    const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nakupni-seznam_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function createReceipt() {
    const forReceipt = chosen.filter((l) => l.stock_item_id);
    if (forReceipt.length === 0) { alert("Pro příjemku vyber aspoň jednu položku se skladovou kartou."); return; }
    if (!confirm("Založit koncept příjemky z vybraných položek? Ceny doplníš po nákupu podle faktury.")) return;
    setBusy(true);
    const payload = {
      items: forReceipt.map((l) => ({
        stock_item_id: l.stock_item_id,
        qty: toBaseQty(Number(l.qty), l.factor),
        unit_price_net_czk: l.unit_price_base ?? 0,
        vat_rate: l.vat_rate,
      })),
    };
    const r = await fetch("/api/sklad/receipts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Chyba"); return; }
    router.push("/admin/sklad/prijem");
  }

  const availableToAdd = items.filter((i) => !lines.some((l) => l.stock_item_id === i.id));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Nákup</h1>
        <p className="text-sm text-[var(--muted)]">Základ se doplní sám z položek pod minimem (návrh do cílového stavu). Uprav množství, přidej co dál potřebuješ, a vyjeď si seznam nebo rovnou založ příjemku.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-2 font-medium w-8"></th>
              <th className="p-2 font-medium">Surovina</th>
              <th className="p-2 font-medium">Stav / min</th>
              <th className="p-2 font-medium">Koupit</th>
              <th className="p-2 font-medium">Dodavatel</th>
              <th className="p-2 font-medium w-8"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const it = items.find((x) => x.id === l.stock_item_id);
              return (
                <tr key={l.key} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-2"><input type="checkbox" checked={l.checked} onChange={(e) => setLine(l.key, { checked: e.target.checked })} /></td>
                  <td className="p-2">
                    <span className="font-medium">{l.name}</span>
                    {l.auto && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-400">dochází</span>}
                    {!l.stock_item_id && <span className="ml-2 text-[10px] text-[var(--muted)]">(mimo kartu)</span>}
                  </td>
                  <td className="p-2 text-[var(--muted)]">{it ? `${Number(it.current_qty)} / ${Number(it.min_qty)} ${it.base_unit}` : "—"}</td>
                  <td className="p-2">
                    <span className="flex items-center gap-1">
                      <input type="number" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} className={inputCls + " w-24"} />
                      <span className="text-[var(--muted)]">{l.unit}</span>
                    </span>
                  </td>
                  <td className="p-2 text-[var(--muted)]">{l.supplier ?? "—"}</td>
                  <td className="p-2"><button onClick={() => removeLine(l.key)} className="rounded-lg border border-[var(--border)] px-2 text-xs text-[var(--muted)] hover:text-red-400" title="Odebrat">✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lines.length === 0 && !loading && <div className="p-8 text-center text-[var(--muted)]">Nic pod minimem. Přidej položky ručně níže, nebo nastav minima u skladových karet.</div>}
      </div>

      {/* přidání položek */}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <span className="flex items-end gap-1">
          <select value={addId} onChange={(e) => setAddId(e.target.value)} className={inputCls + " min-w-[200px]"}>
            <option value="">— přidat surovinu z karet —</option>
            {availableToAdd.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <button onClick={addExisting} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:text-white">Přidat</button>
        </span>
        <span className="flex items-end gap-1">
          <input placeholder="ruční položka (mimo sklad)" value={customName} onChange={(e) => setCustomName(e.target.value)} className={inputCls} />
          <button onClick={addCustom} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:text-white">Přidat</button>
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
        <span className="mr-2 text-sm text-[var(--muted)]">Vybráno {chosen.length} položek</span>
        <button onClick={printList} disabled={chosen.length === 0} className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">Vytisknout seznam</button>
        <button onClick={downloadCsv} disabled={chosen.length === 0} className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--muted)] hover:text-white disabled:opacity-50">Stáhnout CSV</button>
        <button onClick={createReceipt} disabled={busy || chosen.length === 0} className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--muted)] hover:text-white disabled:opacity-50">{busy ? "…" : "Vytvořit příjemku z košíku"}</button>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">Příjemka se založí jako koncept jen z položek se skladovou kartou; ceny doplníš po nákupu. Ruční položky (mimo sklad) jsou jen pro seznam k nákupu.</p>
    </div>
  );
}

function esc(s: string) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c)); }
function csv(v: string) { return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }
