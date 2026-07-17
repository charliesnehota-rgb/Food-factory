"use client";
// Kurýrní rozhraní — mobile-first, používá se v autě. Kurýr si z poolu vezme
// jednu nebo víc hotových objednávek, u každé má Waze navigaci a telefon na
// zákazníka, po předání odklikne „Doručeno". Pořadí rozvozu si určuje sám
// podle adres — jedna kuchyně, auta jezdí tam a zpět, žádná auto-optimalizace.
import { useEffect, useState, useCallback } from "react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/lib/toast";

const BRAND: Record<string, { name: string; emoji: string }> = {
  "sunny-side": { name: "Prostě snídaně", emoji: "🍳" },
  "dumply":     { name: "Dumply",          emoji: "🥟" },
  "smash":      { name: "L.T. Smash",      emoji: "🍔" },
};

interface CourierOrder {
  id: string; concept_slug: string;
  customer_name: string; customer_phone: string; customer_address: string;
  note: string | null; total_czk: number; created_at: string;
  order_items: { name: string; qty: number }[];
  delivery_district?: string | null; dist_km?: number | null;
}

interface RunSuggestion { ids: string[]; district: string | null }

const formatCzk = (n: number) => `${Math.round(n)} Kč`;
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
const wazeUrl = (addr: string) => `https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`;
const mapsUrl = (addr: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;

export default function KurierPage() {
  const t = useT();
  const { toast } = useToast();
  const [pool, setPool] = useState<CourierOrder[]>([]);
  const [mine, setMine] = useState<CourierOrder[]>([]);
  const [suggestion, setSuggestion] = useState<RunSuggestion | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await fetch("/api/courier/orders").then(r => r.json());
      if (d.error) { toast(d.error, "error"); return; }
      setPool(d.pool ?? []);
      setMine(d.mine ?? []);
      setSuggestion(d.suggestion && d.suggestion.ids?.length >= 2 ? d.suggestion : null);
      setMigrationPending(!!d.migrationPending);
    } catch { /* polling to zkusí znovu */ }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 10_000);
    return () => clearInterval(iv);
  }, [load]);

  async function act(id: string, action: "take" | "deliver" | "release") {
    setBusyId(id);
    const r = await fetch(`/api/courier/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const d = await r.json();
    setBusyId(null);
    if (d.error) { toast(d.error, "error"); load(); return; }
    if (action === "deliver") toast(t("kurier.deliveredToast"), "success");
    load();
  }

  // Návrh rozvážky se bere po jedné (atomicky) — když nějakou mezitím
  // vzal jiný kurýr, vezme se zbytek a řekneme to.
  async function takeRun(ids: string[]) {
    setBusyId("__run__");
    let missed = 0;
    for (const id of ids) {
      const r = await fetch(`/api/courier/orders/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "take" }),
      });
      if (!r.ok) missed++;
    }
    setBusyId(null);
    if (missed > 0) toast(t("kurier.runPartial"), "error");
    load();
  }

  function Card({ o, inRun, seq, groupInfo }: { o: CourierOrder; inRun: boolean; seq?: number; groupInfo?: string }) {
    const b = BRAND[o.concept_slug] ?? { name: o.concept_slug, emoji: "🍴" };
    const items = (o.order_items ?? []).map(i => `${i.qty}× ${i.name}`).join(", ");
    const busy = busyId === o.id;
    const geoBadge = [
      groupInfo ? `🧺 ${groupInfo}` : null,
      o.delivery_district ? `📍 ${o.delivery_district}` : null,
      o.dist_km != null ? `${String(o.dist_km).replace(".", ",")} km` : null,
    ].filter(Boolean).join(" · ");
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex items-start gap-2.5">
            {seq != null ? (
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-black">{seq}</span>
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-medium">{b.emoji} {o.id}</div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">{timeOf(o.created_at)} · {formatCzk(Number(o.total_czk))}{geoBadge ? ` · ${geoBadge}` : ""}</div>
            </div>
          </div>
          {inRun ? (
            <button onClick={() => act(o.id, "release")} disabled={busy}
              className="shrink-0 text-xs text-[var(--muted)] underline decoration-dotted hover:text-[var(--fg)] disabled:opacity-50">
              {t("kurier.release")}
            </button>
          ) : null}
        </div>

        <div className="mt-2 text-sm">{o.customer_address}</div>
        <div className="mt-0.5 text-xs text-[var(--muted)]">{o.customer_name} · <a href={`tel:${o.customer_phone}`} className="underline">{o.customer_phone}</a></div>
        {items ? <div className="mt-1.5 text-xs text-[var(--muted)] line-clamp-2">{items}</div> : null}
        {o.note ? <div className="mt-1 text-xs text-amber-400">📝 {o.note}</div> : null}

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {inRun ? (
            <>
              <a href={wazeUrl(o.customer_address)} target="_blank" rel="noopener noreferrer"
                className="rounded-lg bg-[#33ccff]/15 px-3.5 py-2 text-sm font-medium text-[#33ccff] hover:bg-[#33ccff]/25 transition">
                🧭 {t("kurier.waze")}
              </a>
              <a href={mapsUrl(o.customer_address)} target="_blank" rel="noopener noreferrer"
                className="rounded-lg px-2.5 py-2 text-xs text-[var(--muted)] hover:text-[var(--fg)] transition">
                {t("kurier.map")}
              </a>
              <button onClick={() => act(o.id, "deliver")} disabled={busy}
                className="ml-auto rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50 transition">
                ✓ {t("kurier.delivered")}
              </button>
            </>
          ) : (
            <button onClick={() => act(o.id, "take")} disabled={busy}
              className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50 transition">
              🚚 {t("kurier.take")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6 text-sm text-[var(--muted)]">{t("common.loading")}</div>;

  // Objednávky ze společného košíku (jedna platba, víc kuchyní) sdílí
  // zákazníka i adresu — kurýr je veze najednou, tak ať je vidí jako 🧺 1/2, 2/2.
  const groupKey = (o: CourierOrder) => `${o.customer_phone}|${o.customer_address}`;
  const groupOf = (list: CourierOrder[]) => {
    const counts = new Map<string, number>();
    for (const o of list) counts.set(groupKey(o), (counts.get(groupKey(o)) ?? 0) + 1);
    const seen = new Map<string, number>();
    return (o: CourierOrder): string | undefined => {
      const k = groupKey(o);
      if ((counts.get(k) ?? 0) < 2) return undefined;
      const idx = (seen.get(k) ?? 0) + 1;
      seen.set(k, idx);
      return `${idx}/${counts.get(k)}`;
    };
  };
  const mineGroup = groupOf(mine);
  const poolGroup = groupOf(pool);

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <h1 className="text-xl font-semibold">🚚 {t("kurier.title")}</h1>
      <p className="mt-1 mb-5 text-sm text-[var(--muted)]">{t("kurier.desc")}</p>

      {migrationPending ? (
        <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          {t("kurier.migration")}
        </div>
      ) : null}

      <h2 className="mb-2 text-sm font-medium text-[var(--muted)]">{t("kurier.mine")} {mine.length ? `(${mine.length})` : ""}</h2>
      {mine.length === 0
        ? <p className="mb-6 text-sm text-[var(--muted)]">{t("kurier.emptyMine")}</p>
        : <div className="mb-6 space-y-3">{mine.map((o, i) => <Card key={o.id} o={o} inRun seq={mine.length > 1 ? i + 1 : undefined} groupInfo={mineGroup(o)} />)}</div>}

      {suggestion ? (
        <div className="mb-4 rounded-2xl border border-white/25 bg-white/5 p-4">
          <div className="text-sm font-medium">✨ {t("kurier.suggestTitle")}</div>
          <div className="mt-0.5 text-xs text-[var(--muted)]">
            {suggestion.ids.length}× {suggestion.district ? `· 📍 ${suggestion.district}` : ""} — {t("kurier.suggestDesc")}
          </div>
          <button onClick={() => takeRun(suggestion.ids)} disabled={busyId === "__run__"}
            className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50 transition">
            🚚 {t("kurier.takeRun")} ({suggestion.ids.length})
          </button>
        </div>
      ) : null}

      <h2 className="mb-2 text-sm font-medium text-[var(--muted)]">{t("kurier.pool")} {pool.length ? `(${pool.length})` : ""}</h2>
      {pool.length === 0
        ? <p className="text-sm text-[var(--muted)]">{t("kurier.emptyPool")}</p>
        : <div className="space-y-3">{pool.map(o => <Card key={o.id} o={o} inRun={false} groupInfo={poolGroup(o)} />)}</div>}
    </div>
  );
}
