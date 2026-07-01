"use client";

import { useState } from "react";
import { formatCzk } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { useToast } from "@/lib/toast";

const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

type ExportType = "vat" | "movements" | "stock";

const MOVE_LABEL_KEY: Record<string, string> = {
  consumption: "pohyby.type.consumption",
  write_off: "pohyby.type.write_off",
  stocktake: "pohyby.type.stocktake",
};

export default function ExportyPage() {
  const t = useT();
  const { toast } = useToast();
  const [type, setType] = useState<ExportType>("vat");
  const firstOfMonth = new Date(); firstOfMonth.setDate(1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const TYPES: { id: ExportType; label: string; desc: string; usesRange: boolean }[] = [
    { id: "vat", label: t("exporty.type.vat"), desc: t("exporty.type.vat.desc"), usesRange: true },
    { id: "movements", label: t("exporty.type.movements"), desc: t("exporty.type.movements.desc"), usesRange: true },
    { id: "stock", label: t("exporty.type.stock"), desc: t("exporty.type.stock.desc"), usesRange: false },
  ];

  const meta = TYPES.find((x) => x.id === type)!;

  async function loadPreview() {
    setLoading(true); setData(null);
    const qs = new URLSearchParams({ type });
    if (meta.usesRange) { qs.set("from", from); qs.set("to", to); }
    if (type === "stock") qs.set("as_of", asOf);
    const d = await fetch(`/api/sklad/exports?${qs}`).then((r) => r.json());
    setData(d.error ? null : d);
    if (d.error) toast(d.error, "error");
    setLoading(false);
  }

  function pick(id: ExportType) { setType(id); setData(null); }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">{t("exporty.title")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("exporty.desc")}</p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {TYPES.map((x) => (
          <button key={x.id} onClick={() => pick(x.id)}
            className={"rounded-2xl border p-4 text-left transition " + (type === x.id ? "border-white bg-[var(--card)]" : "border-[var(--border)] bg-[var(--card)] hover:border-neutral-600")}>
            <div className="font-medium">{x.label}</div>
            <div className="mt-1 text-xs text-[var(--muted)]">{x.desc}</div>
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2">
        {meta.usesRange && (
          <>
            <div>
              <label className="text-xs text-[var(--muted)]">{t("exporty.from")}</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">{t("exporty.to")}</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </div>
          </>
        )}
        {type === "stock" && (
          <div>
            <label className="text-xs text-[var(--muted)]">{t("exporty.asOf")}</label>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputCls} />
          </div>
        )}
        <button onClick={loadPreview} disabled={loading} className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
          {loading ? t("exporty.loading") : t("exporty.load")}
        </button>
      </div>

      {data && type === "vat" && <VatPreview data={data} />}
      {data && type === "movements" && <MovementsPreview data={data} moveLabelKey={MOVE_LABEL_KEY} />}
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
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary: any[] = data.summary ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data.rows ?? [];
  const tot = summary.reduce((a, s) => ({ net: a.net + s.base_net, vat: a.vat + s.vat, gross: a.gross + s.gross }), { net: 0, vat: 0, gross: 0 });

  function dlSummary() {
    downloadCsv(`dph-souhrn_${data.from}_${data.to}.csv`,
      [t("exporty.vat.col.rate"), t("exporty.vat.col.net"), t("exporty.vat.col.vat"), t("exporty.vat.col.gross"), t("exporty.vat.col.count")],
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
        <DownloadBtn onClick={dlSummary}>{t("exporty.vat.dlSummary")}</DownloadBtn>
        <DownloadBtn onClick={dlDetail}>{t("exporty.vat.dlDetail")}</DownloadBtn>
      </div>
      <div className={cardCls}>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className={thCls}>{t("exporty.vat.col.rate")}</th>
              <th className={thCls}>{t("exporty.vat.col.net")}</th>
              <th className={thCls}>{t("exporty.vat.col.vat")}</th>
              <th className={thCls}>{t("exporty.vat.col.gross")}</th>
              <th className={thCls}>{t("exporty.vat.col.count")}</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.vat_rate} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2">{Number(s.vat_rate)} %</td>
                <td className="p-2">{formatCzk(s.base_net)}</td>
                <td className="p-2">{formatCzk(s.vat)}</td>
                <td className="p-2">{formatCzk(s.gross)}</td>
                <td className="p-2 text-[var(--muted)]">{s.count}</td>
              </tr>
            ))}
            {summary.length > 0 && (
              <tr className="font-semibold">
                <td className="p-2">{t("exporty.vat.total")}</td>
                <td className="p-2">{formatCzk(tot.net)}</td>
                <td className="p-2">{formatCzk(tot.vat)}</td>
                <td className="p-2">{formatCzk(tot.gross)}</td>
                <td className="p-2"></td>
              </tr>
            )}
          </tbody>
        </table>
        {summary.length === 0 && <div className="p-6 text-center text-[var(--muted)]">{t("exporty.vat.empty")}</div>}
      </div>
    </div>
  );
}

// ---------- Movements ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MovementsPreview({ data, moveLabelKey }: { data: any; moveLabelKey: Record<string, string> }) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data.rows ?? [];
  const total = rows.reduce((s, r) => s + Number(r.value), 0);
  function dl() {
    downloadCsv(`spotreba-ztraty_${data.from}_${data.to}.csv`,
      ["Datum", "Typ", "Surovina", "Kategorie", "Změna", "Jednotka", "Cena/j.", "Hodnota", "Důvod"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows.map((r: any) => [new Date(r.date).toLocaleString("cs-CZ"), t(moveLabelKey[r.type] ?? r.type), r.item, r.category, num(r.qty_change), r.unit, num(r.unit_price), num(r.value), r.reason]));
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <DownloadBtn onClick={dl}>{t("exporty.mov.dl")}</DownloadBtn>
        <span className="text-sm text-[var(--muted)]">{t("exporty.mov.summary", { count: rows.length, value: formatCzk(total) })}</span>
      </div>
      <div className={cardCls}>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className={thCls}>{t("exporty.mov.col.date")}</th>
              <th className={thCls}>{t("exporty.mov.col.type")}</th>
              <th className={thCls}>{t("exporty.mov.col.item")}</th>
              <th className={thCls}>{t("exporty.mov.col.qty")}</th>
              <th className={thCls}>{t("exporty.mov.col.value")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((r, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2 text-[var(--muted)]">{new Date(r.date).toLocaleDateString("cs-CZ")}</td>
                <td className="p-2">{t(moveLabelKey[r.type] ?? r.type)}</td>
                <td className="p-2">{r.item}</td>
                <td className="p-2">{num(r.qty_change)} {r.unit}</td>
                <td className="p-2">{formatCzk(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="p-6 text-center text-[var(--muted)]">{t("exporty.mov.empty")}</div>}
        {rows.length > 50 && <div className="p-3 text-center text-xs text-[var(--muted)]">{t("exporty.mov.preview", { total: rows.length })}</div>}
      </div>
    </div>
  );
}

// ---------- Stock ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StockPreview({ data }: { data: any }) {
  const t = useT();
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
        <DownloadBtn onClick={dl}>{t("exporty.stock.dl")}</DownloadBtn>
        <span className="text-sm text-[var(--muted)]">{t("exporty.stock.summary", { date: data.as_of, value: formatCzk(data.total_value) })}</span>
      </div>
      <div className={cardCls}>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className={thCls}>{t("exporty.stock.col.name")}</th>
              <th className={thCls}>{t("exporty.stock.col.cat")}</th>
              <th className={thCls}>Množství</th>
              <th className={thCls}>Ø cena</th>
              <th className={thCls}>Hodnota</th>
            </tr>
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
        {rows.length === 0 && <div className="p-6 text-center text-[var(--muted)]">{t("exporty.stock.empty")}</div>}
      </div>
    </div>
  );
}
