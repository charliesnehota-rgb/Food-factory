"use client";

import { useState } from "react";
import { formatCzk } from "@/lib/types";

const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

type ExportType = "vat" | "movements" | "stock";

const TYPES: { id: ExportType; label: string; desc: string; usesRange: boolean }[] = [
  { id: "vat", label: "Podklad DPH", desc: "Nákup surovin rozpadený po sazbách (DPH na vstupu).", usesRange: true },
  { id: "movements", label: "Spotřeba a ztráty", desc: "Výdeje (spotřeba, odpisy, inventura) za období, oceněné.", usesRange: true },
  { id: "stock", label: "Stav skladu", desc: "Ocenění skladu k vybranému datu (vážený průměr).", usesRange: false },
];

const MOVE_LABEL: Record<string, string> = { consumption: "Spotřeba", write_off: "Odpis", stocktake: "Inventura" };

export default function ExportyPage() {
  const [type, setType] = useState<ExportType>("vat");
  const firstOfMonth = new Date(); firstOfMonth.setDate(1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const meta = TYPES.find((t) => t.id === type)!;

  async function loadPreview() {
    setLoading(true); setData(null);
    const qs = new URLSearchParams({ type });
    if (meta.usesRange) { qs.set("from", from); qs.set("to", to); }
    if (type === "stock") qs.set("as_of", asOf);
    const d = await fetch(`/api/sklad/exports?${qs}`).then((r) => r.json());
    setData(d.error ? null : d);
    if (d.error) alert(d.error);
    setLoading(false);
  }

  function pick(t: ExportType) { setType(t); setData(null); }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Účetní exporty</h1>
        <p className="text-sm text-[var(--muted)]">Podklady pro DPH, výkazy a přiznání. Stažené CSV se otevře přímo v Excelu (středník, desetinná čárka).</p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => pick(t.id)}
            className={"rounded-2xl border p-4 text-left transition " + (type === t.id ? "border-white bg-[var(--card)]" : "border-[var(--border)] bg-[var(--card)] hover:border-neutral-600")}>
            <div className="font-medium">{t.label}</div>
            <div className="mt-1 text-xs text-[var(--muted)]">{t.desc}</div>
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2">
        {meta.usesRange && (
          <>
            <div>
              <label className="text-xs text-[var(--muted)]">Od</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Do</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </div>
          </>
        )}
        {type === "stock" && (
          <div>
            <label className="text-xs text-[var(--muted)]">Stav k datu</label>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputCls} />
          </div>
        )}
        <button onClick={loadPreview} disabled={loading} className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">{loading ? "Načítám…" : "Načíst náhled"}</button>
      </div>

      {data && type === "vat" && <VatPreview data={data} />}
      {data && type === "movements" && <MovementsPreview data={data} />}
      {data && type === "stock" && <StockPreview data={data} />}
    </div>
  );
}

// ---------- CSV helpers (české Excel CSV) ----------
function num(n: number | null | undefined) {
  if (n == null) return "";
  return (Math.round(Number(n) * 100) / 100).toString().replace(".", ",");
}
function cell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const body = [headers.join(";"), ...rows.map((r) => r.map(cell).join(";"))].join("\r\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function DownloadBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200">{children}</button>;
}
const thCls = "p-2 font-medium";
const cardCls = "overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]";

// ---------- VAT ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VatPreview({ data }: { data: any }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary: any[] = data.summary ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data.rows ?? [];
  const tot = summary.reduce((a, s) => ({ net: a.net + s.base_net, vat: a.vat + s.vat, gross: a.gross + s.gross }), { net: 0, vat: 0, gross: 0 });

  function dlSummary() {
    downloadCsv(`dph-souhrn_${data.from}_${data.to}.csv`,
      ["Sazba DPH %", "Základ (bez DPH)", "DPH", "Celkem", "Počet řádků"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      summary.map((s: any) => [num(s.vat_rate), num(s.base_net), num(s.vat), num(s.gross), s.count]));
  }
  function dlDetail() {
    downloadCsv(`dph-detail_${data.from}_${data.to}.csv`,
      ["Datum", "Příjemka", "Dodavatel", "Č. faktury", "Surovina", "Množství", "Jednotka", "Základ", "Sazba %", "DPH", "Celkem"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows.map((r: any) => [r.date, r.receipt_number, r.supplier, r.invoice_no, r.item, num(r.qty), r.unit, num(r.net), num(r.vat_rate), num(r.vat), num(r.gross)]));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <DownloadBtn onClick={dlSummary}>Stáhnout souhrn po sazbách</DownloadBtn>
        <DownloadBtn onClick={dlDetail}>Stáhnout detail (řádky)</DownloadBtn>
      </div>
      <div className={cardCls}>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr><th className={thCls}>Sazba DPH</th><th className={thCls}>Základ (bez DPH)</th><th className={thCls}>DPH</th><th className={thCls}>Celkem</th><th className={thCls}>Řádků</th></tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.vat_rate} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2">{Number(s.vat_rate)} %</td><td className="p-2">{formatCzk(s.base_net)}</td><td className="p-2">{formatCzk(s.vat)}</td><td className="p-2">{formatCzk(s.gross)}</td><td className="p-2 text-[var(--muted)]">{s.count}</td>
              </tr>
            ))}
            {summary.length > 0 && (
              <tr className="font-semibold"><td className="p-2">Celkem</td><td className="p-2">{formatCzk(tot.net)}</td><td className="p-2">{formatCzk(tot.vat)}</td><td className="p-2">{formatCzk(tot.gross)}</td><td className="p-2"></td></tr>
            )}
          </tbody>
        </table>
        {summary.length === 0 && <div className="p-6 text-center text-[var(--muted)]">V tomto období nejsou žádné naskladněné příjmy.</div>}
      </div>
    </div>
  );
}

// ---------- Movements ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MovementsPreview({ data }: { data: any }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data.rows ?? [];
  const total = rows.reduce((s, r) => s + Number(r.value), 0);
  function dl() {
    downloadCsv(`spotreba-ztraty_${data.from}_${data.to}.csv`,
      ["Datum", "Typ", "Surovina", "Kategorie", "Změna", "Jednotka", "Cena/j.", "Hodnota", "Důvod"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows.map((r: any) => [new Date(r.date).toLocaleString("cs-CZ"), MOVE_LABEL[r.type] ?? r.type, r.item, r.category, num(r.qty_change), r.unit, num(r.unit_price), num(r.value), r.reason]));
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <DownloadBtn onClick={dl}>Stáhnout CSV</DownloadBtn>
        <span className="text-sm text-[var(--muted)]">{rows.length} pohybů · hodnota {formatCzk(total)}</span>
      </div>
      <div className={cardCls}>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr><th className={thCls}>Datum</th><th className={thCls}>Typ</th><th className={thCls}>Surovina</th><th className={thCls}>Změna</th><th className={thCls}>Hodnota</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((r, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2 text-[var(--muted)]">{new Date(r.date).toLocaleDateString("cs-CZ")}</td>
                <td className="p-2">{MOVE_LABEL[r.type] ?? r.type}</td>
                <td className="p-2">{r.item}</td>
                <td className="p-2">{num(r.qty_change)} {r.unit}</td>
                <td className="p-2">{formatCzk(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="p-6 text-center text-[var(--muted)]">V tomto období nejsou žádné výdeje.</div>}
        {rows.length > 50 && <div className="p-3 text-center text-xs text-[var(--muted)]">Náhled prvních 50 z {rows.length}. Celé je v CSV.</div>}
      </div>
    </div>
  );
}

// ---------- Stock ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StockPreview({ data }: { data: any }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data.rows ?? [];
  function dl() {
    downloadCsv(`stav-skladu_${data.as_of}.csv`,
      ["Kód", "Surovina", "Kategorie", "Jednotka", "Množství", "Ø cena/j.", "Hodnota", "Sazba DPH %"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows.map((r: any) => [r.sku, r.item, r.category, r.unit, num(r.qty), num(r.avg_price), num(r.value), r.vat_rate != null ? num(r.vat_rate) : ""]));
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <DownloadBtn onClick={dl}>Stáhnout CSV</DownloadBtn>
        <span className="text-sm text-[var(--muted)]">k {data.as_of} · celková hodnota {formatCzk(data.total_value)}</span>
      </div>
      <div className={cardCls}>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr><th className={thCls}>Surovina</th><th className={thCls}>Kategorie</th><th className={thCls}>Množství</th><th className={thCls}>Ø cena</th><th className={thCls}>Hodnota</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2 font-medium">{r.item}</td>
                <td className="p-2 text-[var(--muted)]">{r.category}</td>
                <td className="p-2">{num(r.qty)} {r.unit}</td>
                <td className="p-2 text-[var(--muted)]">{formatCzk(r.avg_price)}</td>
                <td className="p-2">{formatCzk(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="p-6 text-center text-[var(--muted)]">Sklad je prázdný.</div>}
      </div>
    </div>
  );
}
