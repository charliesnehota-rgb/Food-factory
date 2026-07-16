"use client";
// Import objednávek z reportů Wolt / Foodora (CSV z partnerských portálů).
// Sloupce se odhadnou z hlaviček a dají se ručně přemapovat; stornované
// řádky se přeskočí. Import je idempotentní — stejný soubor jde bezpečně
// nahrát znovu, existující objednávky se jen přeskočí.
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { parseCsv, parseAmount, parseReportDate, guessMapping, isCancelledStatus } from "@/lib/report-import";

const PLATFORMS = [
  { value: "wolt",    label: "Wolt" },
  { value: "foodora", label: "foodora" },
];
const CONCEPTS = [
  { slug: "sunny-side", name: "Prostě snídaně", emoji: "🍳" },
  { slug: "dumply",     name: "Dumply",          emoji: "🥟" },
  { slug: "smash",      name: "L.T. Smash",      emoji: "🍔" },
];
const NONE = -1;

interface Result { imported: number; skippedExisting: number; duplicatesInFile: number; invalid: number }

export default function ImportPage() {
  const t = useT();
  const { toast } = useToast();

  const [platform, setPlatform] = useState("wolt");
  const [concept, setConcept] = useState(CONCEPTS[0].slug);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [colId, setColId] = useState(NONE);
  const [colDate, setColDate] = useState(NONE);
  const [colTotal, setColTotal] = useState(NONE);
  const [colStatus, setColStatus] = useState(NONE);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onFile(f: File | null) {
    if (!f) return;
    setResult(null);
    try {
      const parsed = parseCsv(await f.text());
      if (parsed.length < 2) { toast(t("import.parseFailed"), "error"); return; }
      const g = guessMapping(parsed[0]);
      setFileName(f.name);
      setHeaders(parsed[0]);
      setRows(parsed.slice(1));
      setColId(g.id); setColDate(g.date); setColTotal(g.total); setColStatus(g.status);
    } catch {
      toast(t("import.parseFailed"), "error");
    }
  }

  // Vyhodnocení řádků podle aktuálního mapování
  const prepared = useMemo(() => {
    if (colId === NONE || colDate === NONE || colTotal === NONE) return null;
    const good: { externalId: string; createdAt: string; totalCzk: number }[] = [];
    let cancelled = 0, invalid = 0;
    for (const r of rows) {
      if (colStatus !== NONE && isCancelledStatus(r[colStatus] ?? "")) { cancelled++; continue; }
      const ext = (r[colId] ?? "").trim();
      const when = parseReportDate(r[colDate] ?? "");
      const total = parseAmount(r[colTotal] ?? "");
      if (!ext || !when || total === null || total < 0) { invalid++; continue; }
      good.push({ externalId: ext, createdAt: when.toISOString(), totalCzk: total });
    }
    return { good, cancelled, invalid };
  }, [rows, colId, colDate, colTotal, colStatus]);

  async function runImport() {
    if (!prepared || prepared.good.length === 0 || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/import-orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, concept, rows: prepared.good }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { toast(d.error ?? t("import.failed"), "error"); return; }
      setResult({ ...d, invalid: (d.invalid ?? 0) + prepared.invalid });
    } catch {
      toast(t("import.failed"), "error");
    } finally {
      setBusy(false);
    }
  }

  function resetFile() {
    setFileName(null); setHeaders([]); setRows([]); setResult(null);
    setColId(NONE); setColDate(NONE); setColTotal(NONE); setColStatus(NONE);
  }

  const colSelect = (label: string, value: number, set: (v: number) => void, optional = false) => (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--muted)]">{label}</span>
      <select value={value} onChange={e => set(Number(e.target.value))}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
        <option value={NONE}>{optional ? t("import.mapNone") : "—"}</option>
        {headers.map((h, i) => <option key={i} value={i}>{h || `(${i + 1})`}</option>)}
      </select>
    </label>
  );

  const platformLabel = PLATFORMS.find(p => p.value === platform)?.label ?? platform;

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <h1 className="text-xl font-semibold">⬆ {t("import.title")}</h1>
      <p className="mt-1 mb-5 text-sm text-[var(--muted)]">{t("import.desc")}</p>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">{t("import.platform")}</span>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">{t("import.concept")}</span>
            <select value={concept} onChange={e => setConcept(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
              {CONCEPTS.map(c => <option key={c.slug} value={c.slug}>{c.emoji} {c.name}</option>)}
            </select>
          </label>
        </div>

        {!fileName ? (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-sm text-[var(--muted)] hover:border-white/40 transition">
            <span>📄 {t("import.file")}</span>
            <span className="mt-1 text-xs">{t("import.fileHint")}</span>
            <input type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => onFile(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-3 py-2 text-sm">
            <span className="truncate">📄 {fileName} · {t("import.rows").replace("{{n}}", String(rows.length))}</span>
            <button onClick={resetFile} className="shrink-0 text-xs text-[var(--muted)] underline decoration-dotted hover:text-[var(--fg)]">
              {t("import.another")}
            </button>
          </div>
        )}

        {fileName && !result && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {colSelect(t("import.mapId"), colId, setColId)}
              {colSelect(t("import.mapDate"), colDate, setColDate)}
              {colSelect(t("import.mapTotal"), colTotal, setColTotal)}
              {colSelect(t("import.mapStatus"), colStatus, setColStatus, true)}
            </div>

            {prepared ? (
              <>
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-[var(--muted)]">
                        <th className="px-3 py-2">{t("import.previewId")}</th>
                        <th className="px-3 py-2">{t("import.previewDate")}</th>
                        <th className="px-3 py-2 text-right">{t("import.previewTotal")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prepared.good.slice(0, 5).map((g, i) => (
                        <tr key={i} className="border-t border-[var(--border)]">
                          <td className="px-3 py-1.5 font-mono text-xs">{platform.toUpperCase()}-{g.externalId.toUpperCase().replace(/[^A-Z0-9-]+/g, "").slice(0, 40)}</td>
                          <td className="px-3 py-1.5">{new Date(g.createdAt).toLocaleString("cs-CZ")}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{Math.round(g.totalCzk)} Kč</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {t("import.summary")
                    .replace("{{ok}}", String(prepared.good.length))
                    .replace("{{cancelled}}", String(prepared.cancelled))
                    .replace("{{invalid}}", String(prepared.invalid))}
                </p>
                <button onClick={runImport} disabled={busy || prepared.good.length === 0}
                  className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-40 transition">
                  {busy ? t("import.running") : `⬆ ${t("import.run")} (${prepared.good.length} · ${platformLabel})`}
                </button>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">{t("import.needMapping")}</p>
            )}
          </>
        )}

        {result && (
          <div className="rounded-xl bg-[var(--bg)] p-4 text-sm space-y-1">
            <div className="text-base font-semibold">✅ {t("import.done")}</div>
            <div>{t("import.resultImported")}: <strong>{result.imported}</strong></div>
            <div className="text-[var(--muted)]">{t("import.resultSkipped")}: {result.skippedExisting} · {t("import.resultDupes")}: {result.duplicatesInFile} · {t("import.resultInvalid")}: {result.invalid}</div>
            <button onClick={resetFile} className="mt-2 text-xs underline decoration-dotted text-[var(--muted)] hover:text-[var(--fg)]">
              {t("import.another")}
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">{t("import.footnote")}</p>
    </div>
  );
}
