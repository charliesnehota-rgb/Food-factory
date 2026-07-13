"use client";
// Provozní doba per koncept — mimo otevírací dobu web blokuje objednávky.
import { useEffect, useState, useCallback } from "react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { WeekHours, DayHours } from "@/lib/opening-hours";

const CONCEPTS = [
  { slug: "sunny-side", name: "Prostě snídaně", emoji: "🍳" },
  { slug: "dumply",     name: "Dumply",          emoji: "🥟" },
  { slug: "smash",      name: "L.T. Smash",      emoji: "🍔" },
];

// Po–Ne pořadí zobrazení → JS getDay klíče
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_DAY: DayHours = { open: "10:00", close: "20:00", closed: false };
const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

export default function ProvozPage() {
  const t = useT();
  const { toast } = useToast();
  const [data, setData] = useState<Record<string, WeekHours>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [openState, setOpenState] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const results = await Promise.all(CONCEPTS.map(async c => {
      const d = await fetch(`/api/concepts/${c.slug}/hours`).then(r => r.json()).catch(() => null);
      return [c.slug, d] as const;
    }));
    const hoursMap: Record<string, WeekHours> = {};
    const openMap: Record<string, boolean> = {};
    for (const [slug, d] of results) {
      const h: WeekHours = d?.hours ?? {};
      // Doplň chybějící dny defaultem, ať je grid kompletní
      for (const day of DAY_ORDER) if (!h[String(day)]) h[String(day)] = { ...DEFAULT_DAY };
      hoursMap[slug] = h;
      openMap[slug] = d?.isOpen ?? true;
    }
    setData(hoursMap);
    setOpenState(openMap);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function setDay(slug: string, day: number, patch: Partial<DayHours>) {
    setData(prev => ({
      ...prev,
      [slug]: { ...prev[slug], [String(day)]: { ...prev[slug][String(day)], ...patch } },
    }));
  }

  async function save(slug: string) {
    setSavingSlug(slug);
    const r = await fetch(`/api/concepts/${slug}/hours`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: data[slug] }),
    });
    const d = await r.json();
    setSavingSlug(null);
    if (d.error) { toast(d.error, "error"); return; }
    toast(t("provoz.saved"), "success");
    load();
  }

  const dayLabel = (d: number) => t(`provoz.day.${d}`);

  if (loading) return <div className="p-6 text-sm text-[var(--muted)]">{t("common.loading")}</div>;

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <h1 className="text-xl font-semibold">🕐 {t("provoz.title")}</h1>
      <p className="mt-1 mb-6 text-sm text-[var(--muted)]">{t("provoz.desc")}</p>

      <div className="space-y-6">
        {CONCEPTS.map(c => (
          <div key={c.slug} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-medium">{c.emoji} {c.name}</h2>
              <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium " +
                (openState[c.slug] ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400")}>
                {openState[c.slug] ? t("provoz.openNow") : t("provoz.closedNow")}
              </span>
            </div>

            <div className="space-y-2">
              {DAY_ORDER.map(day => {
                const h = data[c.slug]?.[String(day)] ?? DEFAULT_DAY;
                return (
                  <div key={day} className="flex items-center gap-3 flex-wrap">
                    <span className="w-20 text-sm text-[var(--muted)]">{dayLabel(day)}</span>
                    <input type="time" value={h.open} disabled={h.closed}
                      onChange={e => setDay(c.slug, day, { open: e.target.value })}
                      className={inputCls + (h.closed ? " opacity-40" : "")} />
                    <span className="text-[var(--muted)]">–</span>
                    <input type="time" value={h.close} disabled={h.closed}
                      onChange={e => setDay(c.slug, day, { close: e.target.value })}
                      className={inputCls + (h.closed ? " opacity-40" : "")} />
                    <label className="flex items-center gap-1.5 text-sm text-[var(--muted)] cursor-pointer select-none">
                      <input type="checkbox" checked={h.closed}
                        onChange={e => setDay(c.slug, day, { closed: e.target.checked })}
                        className="h-4 w-4 accent-white" />
                      {t("provoz.closed")}
                    </label>
                  </div>
                );
              })}
            </div>

            <button onClick={() => save(c.slug)} disabled={savingSlug === c.slug}
              className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50 transition">
              {savingSlug === c.slug ? t("common.saving") : t("common.save")}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">{t("provoz.footnote")}</p>
    </div>
  );
}
