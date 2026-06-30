"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { formatCzk } from "@/lib/types";
import { displayUnitsFor, toBaseQty, toBaseUnitPrice } from "@/lib/stock/units";
import type { GoodsReceipt, StockItem, Supplier, ReceiptItem } from "@/lib/stock/types";

const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

interface DraftLine {
  stock_item_id: string;
  displayUnit: string;
  qty: string;
  price: string;   // za displayUnit, bez DPH
  vat_rate: string;
}

const emptyLine: DraftLine = { stock_item_id: "", displayUnit: "", qty: "", price: "", vat_rate: "12" };

export default function PrijemPage() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [sups, setSups] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, ReceiptItem[]>>({});

  const [head, setHead] = useState({ supplier_id: "", supplier_invoice_no: "", received_at: today(), note: "" });
  const [lines, setLines] = useState<DraftLine[]>([{ ...emptyLine }]);
  const [pricesGross, setPricesGross] = useState(false);
  const [invoiceTotal, setInvoiceTotal] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, i, s] = await Promise.all([
      fetch("/api/sklad/receipts").then((x) => x.json()),
      fetch("/api/sklad/items").then((x) => x.json()),
      fetch("/api/sklad/suppliers").then((x) => x.json()),
    ]);
    if (Array.isArray(r)) setReceipts(r);
    if (Array.isArray(i)) setItems(i);
    if (Array.isArray(s)) setSups(s);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function itemById(id: string) { return items.find((x) => x.id === id); }

  function setLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function onPickItem(idx: number, id: string) {
    const it = itemById(id);
    const du = it ? displayUnitsFor(it.base_unit)[0].unit : "";
    const vat = it?.category?.vat_rate != null ? String(Number(it.category.vat_rate)) : "12";
    setLine(idx, { stock_item_id: id, displayUnit: du, vat_rate: vat });
  }
  function addLine() { setLines((p) => [...p, { ...emptyLine }]); }
  function removeLine(idx: number) { setLines((p) => p.filter((_, i) => i !== idx)); }

  const validLines = lines.filter((l) => l.stock_item_id && Number(l.qty) > 0 && l.price !== "");
  // cena na řádku v Kč bez DPH (z displeje); když se zadává s DPH, odečteme daň
  function lineNetDisplayPrice(l: DraftLine) {
    const p = Number(l.price);
    return pricesGross ? p / (1 + Number(l.vat_rate) / 100) : p;
  }
  const previewNet = validLines.reduce((s, l) => s + Number(l.qty) * lineNetDisplayPrice(l), 0);
  const previewVat = validLines.reduce((s, l) => s + Number(l.qty) * lineNetDisplayPrice(l) * Number(l.vat_rate) / 100, 0);
  const previewGross = previewNet + previewVat;
  const invoiceDiff = invoiceTotal === "" ? null : Number(invoiceTotal) - previewGross;

  function buildItemsPayload() {
    return validLines.map((l) => {
      const it = itemById(l.stock_item_id)!;
      const du = displayUnitsFor(it.base_unit).find((u) => u.unit === l.displayUnit) ?? displayUnitsFor(it.base_unit)[0];
      return {
        stock_item_id: l.stock_item_id,
        qty: toBaseQty(Number(l.qty), du.factor),
        unit_price_net_czk: toBaseUnitPrice(lineNetDisplayPrice(l), du.factor),
        vat_rate: Number(l.vat_rate),
      };
    });
  }

  function resetForm() {
    setHead({ supplier_id: "", supplier_invoice_no: "", received_at: today(), note: "" });
    setLines([{ ...emptyLine }]);
    setPricesGross(false);
    setInvoiceTotal("");
    setEditingId(null);
    setOpen(false);
  }

  async function save(thenPost: boolean) {
    if (validLines.length === 0) { alert("Přidej aspoň jednu položku."); return; }
    setSaving(true);
    const payload = { ...head, supplier_id: head.supplier_id || null, items: buildItemsPayload() };
    const url = editingId ? `/api/sklad/receipts/${editingId}` : "/api/sklad/receipts";
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const saved = await res.json();
    if (!res.ok) { setSaving(false); alert(saved.error ?? "Chyba"); return; }
    const targetId = editingId ?? saved.id;
    if (thenPost && targetId) {
      const pr = await fetch(`/api/sklad/receipts/${targetId}/post`, { method: "POST" });
      if (!pr.ok) { const e = await pr.json(); alert(e.error ?? "Naskladnění selhalo"); }
    }
    setSaving(false); resetForm(); load();
  }

  async function editDraft(id: string) {
    const d = await fetch(`/api/sklad/receipts/${id}`).then((x) => x.json());
    setEditingId(id);
    setPricesGross(false);
    setInvoiceTotal("");
    setHead({
      supplier_id: d.supplier_id ?? "",
      supplier_invoice_no: d.supplier_invoice_no ?? "",
      received_at: d.received_at ?? today(),
      note: d.note ?? "",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dlines: DraftLine[] = (d.items ?? []).map((it: any) => {
      const base = it.stock_item?.base_unit ?? "g";
      const du = displayUnitsFor(base)[0];
      return {
        stock_item_id: it.stock_item_id,
        displayUnit: du.unit,
        qty: String(Math.round((Number(it.qty) / du.factor) * 1000) / 1000),
        price: String(Math.round(Number(it.unit_price_net_czk) * du.factor * 10000) / 10000),
        vat_rate: String(Number(it.vat_rate)),
      };
    });
    setLines(dlines.length ? dlines : [{ ...emptyLine }]);
    setOpen(true);
  }

  async function postReceipt(id: string) {
    if (!confirm("Naskladnit příjemku? Tím se navýší stav skladu a příjemka se uzamkne.")) return;
    const r = await fetch(`/api/sklad/receipts/${id}/post`, { method: "POST" });
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Chyba"); return; }
    load();
  }
  async function deleteReceipt(id: string) {
    if (!confirm("Smazat koncept příjemky?")) return;
    const r = await fetch(`/api/sklad/receipts/${id}`, { method: "DELETE" });
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Chyba"); return; }
    load();
  }
  async function toggleDetail(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!detail[id]) {
      const r = await fetch(`/api/sklad/receipts/${id}`).then((x) => x.json());
      setDetail((p) => ({ ...p, [id]: r.items ?? [] }));
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Příjem zásob</h1>
          <p className="text-sm text-[var(--muted)]">Ceny zadávej bez DPH. Po „Naskladnit" se navýší stav.</p>
        </div>
        <button onClick={() => { if (open) { resetForm(); } else { resetForm(); setOpen(true); } }} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">+ Nový příjem</button>
      </div>

      {open && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">{editingId ? "Upravit koncept příjemky" : "Nová příjemka"}</h2>
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input type="checkbox" checked={pricesGross} onChange={(e) => setPricesGross(e.target.checked)} />
              ceny zadávám s DPH
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--muted)]">Dodavatel</label>
              <select value={head.supplier_id} onChange={(e) => setHead({ ...head, supplier_id: e.target.value })} className={inputCls}>
                <option value="">— vyber —</option>
                {sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Č. faktury</label>
              <input value={head.supplier_invoice_no} onChange={(e) => setHead({ ...head, supplier_invoice_no: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Datum příjmu</label>
              <input type="date" value={head.received_at} onChange={(e) => setHead({ ...head, received_at: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="hidden gap-2 text-xs text-[var(--muted)] sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
              <span>Surovina</span><span>Množství</span><span>Jednotka</span><span>{pricesGross ? "Cena/j. (s DPH)" : "Cena/j. (bez DPH)"}</span><span>DPH %</span><span></span>
            </div>
            {lines.map((l, idx) => {
              const it = itemById(l.stock_item_id);
              const units = it ? displayUnitsFor(it.base_unit) : [];
              return (
                <div key={idx} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                  <select value={l.stock_item_id} onChange={(e) => onPickItem(idx, e.target.value)} className={inputCls}>
                    <option value="">— vyber surovinu —</option>
                    {items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  <input type="number" placeholder="0" value={l.qty} onChange={(e) => setLine(idx, { qty: e.target.value })} className={inputCls} />
                  <select value={l.displayUnit} onChange={(e) => setLine(idx, { displayUnit: e.target.value })} className={inputCls} disabled={!it}>
                    {units.map((u) => <option key={u.unit} value={u.unit}>{u.unit}</option>)}
                  </select>
                  <input type="number" placeholder="0" value={l.price} onChange={(e) => setLine(idx, { price: e.target.value })} className={inputCls} />
                  <input type="number" value={l.vat_rate} onChange={(e) => setLine(idx, { vat_rate: e.target.value })} className={inputCls} />
                  <button onClick={() => removeLine(idx)} className="rounded-lg border border-[var(--border)] px-2 text-xs text-[var(--muted)] hover:text-red-400" title="Odebrat řádek">✕</button>
                </div>
              );
            })}
            <button onClick={addLine} className="text-sm text-[var(--muted)] hover:text-white">+ přidat řádek</button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
            <div className="text-sm text-[var(--muted)]">
              Bez DPH: <span className="text-white">{formatCzk(previewNet)}</span> · DPH: <span className="text-white">{formatCzk(previewVat)}</span> · Celkem: <span className="font-semibold text-white">{formatCzk(previewGross)}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--muted)]">Fakturováno (s DPH)</label>
              <input type="number" placeholder="kontrola" value={invoiceTotal} onChange={(e) => setInvoiceTotal(e.target.value)} className={inputCls + " w-28"} />
              {invoiceDiff !== null && (
                Math.abs(invoiceDiff) < 0.5
                  ? <span className="rounded-full bg-green-500/15 px-2 py-1 text-xs text-green-400">sedí ✓</span>
                  : <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs text-red-400" title="rozdíl proti součtu řádků">rozdíl {formatCzk(invoiceDiff)}</span>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => save(false)} disabled={saving} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white disabled:opacity-50">{saving ? "…" : "Uložit koncept"}</button>
            <button onClick={() => save(true)} disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">{saving ? "Ukládám…" : "Uložit a naskladnit"}</button>
            <button onClick={resetForm} className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:text-white">Zrušit</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">Příjemka</th>
              <th className="p-3 font-medium">Dodavatel</th>
              <th className="p-3 font-medium">Datum</th>
              <th className="p-3 font-medium">Bez DPH</th>
              <th className="p-3 font-medium">Celkem</th>
              <th className="p-3 font-medium">Stav</th>
              <th className="p-3 font-medium">Akce</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3"><button onClick={() => toggleDetail(r.id)} className="font-medium hover:underline">{r.receipt_number}</button>{r.supplier_invoice_no && <div className="text-xs text-[var(--muted)]">fa: {r.supplier_invoice_no}</div>}</td>
                  <td className="p-3 text-[var(--muted)]">{r.supplier?.name ?? "—"}</td>
                  <td className="p-3 text-[var(--muted)]">{r.received_at}</td>
                  <td className="p-3">{formatCzk(Number(r.total_net_czk))}</td>
                  <td className="p-3">{formatCzk(Number(r.total_gross_czk))}</td>
                  <td className="p-3">
                    <span className={"rounded-full px-3 py-1 text-xs font-medium " + (r.status === "posted" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>
                      {r.status === "posted" ? "Naskladněno" : "Koncept"}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.status === "draft" ? (
                      <div className="flex gap-1">
                        <button onClick={() => editDraft(r.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">Upravit</button>
                        <button onClick={() => postReceipt(r.id)} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-neutral-200">Naskladnit</button>
                        <button onClick={() => deleteReceipt(r.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">Smazat</button>
                      </div>
                    ) : (
                      <button onClick={() => toggleDetail(r.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">Detail</button>
                    )}
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr className="bg-[var(--bg)]/40">
                    <td colSpan={7} className="p-3">
                      <div className="rounded-lg border border-[var(--border)] p-3">
                        {(detail[r.id] ?? []).length === 0 ? (
                          <p className="text-xs text-[var(--muted)]">Načítám položky…</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="text-left text-[var(--muted)]"><tr><th className="p-1.5">Surovina</th><th className="p-1.5">Množství</th><th className="p-1.5">Cena/j.</th><th className="p-1.5">DPH</th><th className="p-1.5">Bez DPH</th></tr></thead>
                            <tbody>
                              {(detail[r.id] ?? []).map((li) => (
                                <tr key={li.id}>
                                  <td className="p-1.5">{li.stock_item?.name ?? "—"}</td>
                                  <td className="p-1.5">{Number(li.qty)} {li.stock_item?.base_unit}</td>
                                  <td className="p-1.5">{formatCzk(Number(li.unit_price_net_czk))}</td>
                                  <td className="p-1.5">{Number(li.vat_rate)} %</td>
                                  <td className="p-1.5">{formatCzk(Number(li.line_net_czk ?? 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {receipts.length === 0 && !loading && <div className="p-8 text-center text-[var(--muted)]">Zatím žádné příjemky.</div>}
      </div>
    </div>
  );
}

function today() { return new Date().toISOString().slice(0, 10); }
