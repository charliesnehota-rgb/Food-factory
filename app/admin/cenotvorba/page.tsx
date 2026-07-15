"use client";
// Cenotvorba — hodinová křivka marže per koncept. price_czk u produktu je
// základní (průměrná) cena; tady se nastavuje, jak se od ní cena v appce
// a na webu odchyluje během dne (přirážka ve špičce, sleva mimo špičku).
import { useEffect, useState, useCallback } from "react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { WeekHours, DayHours } from "@/lib/opening-hours";
import type { MarginCurve } from "@/lib/pricing";

const CONCEPTS = [
  { slug: "sunny-side", name: "Prostě snídaně", emoji: "🍳" },
  { slug: "dumply",     name: "Dumply",          emoji: "🥟" },
  { slug: "smash",      name: "L.T. Smash",      emoji: "🍔" },
];

// Po–Ne pořadí zobrazení → JS getDay klíče (stejně jako /admin/provoz)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Hodiny v provozní době daného dne, po celých hodinách (od otevření, do zavření). */
function hoursRange(h?: DayHours): number[] {
  if (!h || h.closed || !h.open || !h.close) return [];
  const start = parseInt(h.open.slice(0, 2), 10);
  let end = parseInt(h.close.slice(0, 2), 10);
  if (h.close.slice(3) !== "00") end += 1;      // zavírá např. 14:30 → počítej i 14. hodinu
  if (end <= start) end = 24;                   // přes půlnoc — zjednodušeně do konce dne
  const out: number[] = [];
  for (let hh = start; hh < end; hh++) out.push(hh);
  return out;
}

export default function CenotvorbaPage() {
  const t = useT();
  const { toast } = useToast();
  const [hoursData, setHoursData] = useState<Record<string, WeekHours>>({});
  const [curveData, setCurveData] = useState<Record<string, MarginCurve>>({});
  const [activeDay, setActiveDay] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  const now = new Date();
  const nowDay = now.getDay();
  const nowHour = now.getHours();

  const load = useCallback(async () => {
    const results = await Promise.all(CONCEPTS.map(async c => {
      const [h, p] = await Promise.all([
        fetch(`/api/concepts/${c.slug}/hours`).then(r => r.json()).catch(() => null),
        fetch(`/api/concepts/${c.slug}/pricing`).then(r => r.json()).catch(() => null),
      ]);
      return [c.slug, h, p] as const;
    }));
    const hMap: Record<string, WeekHours> = {};
    const cMap: Record<string, MarginCurve> = {};
    const dayMap: Record<string, number> = {};
    for (const [slug, h, p] of results) {
      hMap[slug] = h?.hours ?? {};
      cMap[slug] = p?.curve ?? {};
      dayMap[slug] = nowDay;
    }
    setHoursData(hMap);
    setCurveData(cMap);
    setActiveDay(dayMap);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  function setPct(slug: string, day: number, hour: number, pct: number) {
    setCurveData(prev => {
      const curve = { ...(prev[slug] ?? {}) };
      curve[String(day)] = { ...(curve[String(day)] ?? {}), [String(hour)]: pct };
      return { ...prev, [slug]: curve };
    });
  }

  function copyToAllDays(slug: string, fromDay: number) {
    setCurveData(prev => {
      const curve = { ...(prev[slug] ?? {}) };
      const src = curve[String(fromDay)] ?? {};
      for (const d of DAY_ORDER) curve[String(d)] = { ...src };
      return { ...prev, [slug]: curve };
    });
    toast(t("cenotvorba.copied"), "success");
  }

  async function save(slug: string) {
    setSavingSlug(slug);
    const r = await fetch(`/api/concepts/${slug}/pricing`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ curve: curveData[slug] ?? {} }),
    });
    const d = await r.json();
    setSavingSlug(null);
    if (d.error) { toast(d.error, "error"); return; }
    toast(t("cenotvorba.saved"), "success");
    load();
  }

  const dayLabel = (d: number) => t(`provoz.day.${d}`);

  if (loading) return <div className="p-6 text-sm text-[var(--muted)]">{t("common.loading")}</div>;

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <h1 className="text-xl font-semibold">📈 {t("cenotvorba.title")}</h1>
      <p className="mt-1 mb-6 text-sm text-[var(--muted)]">{t("cenotvorba.desc")}</p>

      <div className="space-y-6">
        {CONCEPTS.map(c => {
          const day = activeDay[c.slug] ?? nowDay;
          const hours = hoursRange(hoursData[c.slug]?.[String(day)]);
          const curve = curveData[c.slug]?.[String(day)] ?? {};

          return (
            <div key={c.slug} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-medium">{c.emoji} {c.name}</h2>
                <button onClick={() => copyToAllDays(c.slug, day)}
                  className="text-xs text-[var(--muted)] underline decoration-dotted hover:text-[var(--fg)]">
                  {t("cenotvorba.copyToAll")}
                </button>
              </div>

              <div className="mb-4 flex gap-1 flex-wrap">
                {DAY_ORDER.map(d => (
                  <button key={d} onClick={() => setActiveDay(prev => ({ ...prev, [c.slug]: d }))}
                    className={"rounded-lg px-2.5 py-1 text-xs font-medium transition " +
                      (d === day ? "bg-white text-black" : "bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--fg)]") +
                      (d === nowDay ? " ring-1 ring-white/40" : "")}>
                    {dayLabel(d).slice(0, 2)}
                  </button>
                ))}
              </div>

              {hours.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">{t("provoz.closed")}</p>
              ) : (
                <div className="space-y-2.5">
                  {hours.map(h => {
                    const pct = curve[String(h)] ?? 0;
                    const isNow = day === nowDay && h === nowHour;
                    return (
                      <div key={h} className="flex items-center gap-3">
                        <span className={"w-16 text-sm tabular-nums " + (isNow ? "font-medium text-white" : "text-[var(--muted)]")}>
                          {String(h).padStart(2, "0")}:00{isNow ? " ●" : ""}
                        </span>
                        <input type="range" min={-50} max={50} step={5} value={pct}
                          onChange={e => setPct(c.slug, day, h, Number(e.target.value))}
                          className="w-full accent-white" />
                        <span className={"w-14 shrink-0 text-right text-sm tabular-nums " +
                          (pct > 0 ? "text-orange-400" : pct < 0 ? "text-emerald-400" : "text-[var(--muted)]")}>
                          {pct > 0 ? "+" : ""}{pct} %
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button onClick={() => save(c.slug)} disabled={savingSlug === c.slug}
                className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50 transition">
                {savingSlug === c.slug ? t("common.saving") : t("common.save")}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">{t("cenotvorba.footnote")}</p>
    </div>
  );
}
