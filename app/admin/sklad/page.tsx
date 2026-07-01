"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCzk } from "@/lib/types";
import { formatQty, type BaseUnit } from "@/lib/stock/units";
import { useMe } from "@/lib/auth/use-me";

interface Overview {
  stock_value_czk: number;
  items_count: number;
  below_min_count: number;
  receipts_30d_count: number;
  receipts_30d_net_czk: number;
  receipts_30d_gross_czk: number;
  revenue_30d_czk: number;
  cogs_30d_czk: number;
  margin_30d_czk: number;
  write_offs_30d_czk: number;
  stocktake_30d_czk: number;
  negative_count: number;
  products_total: number;
  products_with_recipe: number;
  no_price_count: number;
  days: number;
}

interface ShopItem {
  id: string;
  name: string;
  base_unit: string;
  current_qty: number;
  min_qty: number;
  suggested_base: number;
}

interface ExpiringItem {
  stock_item_id: string;
  name: string;
  base_unit: string;
  current_qty: number;
  avg_price_czk: number;
  nearest_expiry: string;
  days_until_expiry: number;
}

export default function SkladPrehledPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [low, setLow] = useState<ShopItem[]>([]);
  const [expiring, setExpiring] = useState<ExpiringItem[]>([]);
  const [writingOff, setWritingOff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    Promise.all([
      fetch(`/api/sklad/overview?days=${days}`).then((r) => r.json()),
      fetch("/api/sklad/shopping").then((r) => r.json()),
      fetch("/api/sklad/expiring?days=7").then((r) => r.json()),
    ]).then(([d, s, ex]) => {
      if (!d.error) setData(d);
      if (Array.isArray(s.items)) setLow(s.items);
      if (Array.isArray(ex)) setExpiring(ex);
    }).finally(() => setLoading(false));
  }, [days]);

  async function quickWriteOff(item: ExpiringItem) {
    if (item.current_qty <= 0) return;
    if (!confirm(`Odepsat celý stav „${item.name}" (${formatQty(item.current_qty, item.base_unit as BaseUnit)}) jako expiraci?`)) return;
    setWritingOff(item.stock_item_id);
    const r = await fetch("/api/sklad/writeoffs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock_item_id: item.stock_item_id, qty: item.current_qty, reason: "expirace", note: `Expirace ${item.nearest_expiry}` }),
    });
    setWritingOff(null);
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Odpis selhal"); return; }
    const ex = await fetch("/api/sklad/expiring?days=7").then((x) => x.json());
    if (Array.isArray(ex)) setExpiring(ex);
    const ov = await fetch(`/api/sklad/overview?days=${days}`).then((x) => x.json());
    if (!ov.error) setData(ov);
  }

  const { me } = useMe();
  const isAdmin = me?.role === "admin";

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sklad — přehled</h1>
          <p className="text-sm text-[var(--muted)]">
            {loading ? "načítám…" : "Hospodaření skladu."}
          </p>
        </div>
        {isAdmin && (
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
            <option value={7}>7 dní</option>
            <option value={30}>30 dní</option>
            <option value={90}>90 dní</option>
          </select>
        )}
      </div>

      {data && (low.length > 0 || expiring.length > 0 || data.negative_count > 0 || data.no_price_count > 0 || (data.products_total > data.products_with_recipe)) && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Co řešit</h2>
            {low.length > 0 && <Link href="/admin/sklad/nakup" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200">Otevřít nákup →</Link>}
          </div>

          {expiring.length > 0 && (
            <div className="mb-4">
              <div className="mb-1 text-sm text-[var(--muted)]">
                Blíží se expirace ({expiring.length}) — doporučujeme odepsat:
              </div>
              <ul className="space-y-1 text-sm">
                {expiring.map((it) => (
                  <li key={it.stock_item_id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-1 last:border-0">
                    <span>
                      <span className="font-medium">{it.name}</span>
                      <span className="ml-2 text-[var(--muted)]">
                        {it.days_until_expiry < 0
                          ? <span className="text-red-400">expirováno {it.nearest_expiry}</span>
                          : it.days_until_expiry === 0
                            ? <span className="text-red-400">vyprší dnes ({it.nearest_expiry})</span>
                            : <span className={it.days_until_expiry <= 3 ? "text-amber-400" : "text-[var(--muted)]"}>
                                za {it.days_until_expiry} {it.days_until_expiry === 1 ? "den" : it.days_until_expiry <= 4 ? "dny" : "dní"} ({it.nearest_expiry})
                              </span>
                        }
                      </span>
                      {it.current_qty > 0 && (
                        <span className="ml-2 text-xs text-[var(--muted)]">
                          stav {formatQty(it.current_qty, it.base_unit as BaseUnit)}
                        </span>
                      )}
                    </span>
                    {it.current_qty > 0 ? (
                      <button
                        onClick={() => quickWriteOff(it)}
                        disabled={writingOff === it.stock_item_id}
                        className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
                      >
                        {writingOff === it.stock_item_id ? "…" : "Odepsat"}
                      </button>
                    ) : (
                      <span className="shrink-0 text-xs text-[var(--muted)]">stav 0</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {low.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 text-sm text-[var(--muted)]">Dochází ({low.length}) — návrh k doplnění:</div>
              <ul className="space-y-1 text-sm">
                {low.slice(0, 8).map((it) => (
                  <li key={it.id} className="flex justify-between gap-3 border-b border-[var(--border)] py-1 last:border-0">
                    <span className="font-medium">{it.name}</span>
                    <span className="text-[var(--muted)]">stav {formatQty(it.current_qty, it.base_unit as BaseUnit)} · koupit ~{formatQty(it.suggested_base, it.base_unit as BaseUnit)}</span>
                  </li>
                ))}
              </ul>
              {low.length > 8 && <div className="mt-1 text-xs text-[var(--muted)]">+{low.length - 8} dalších v nákupu</div>}
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            {data.products_total > data.products_with_recipe && (
              <Link href="/admin/sklad/receptury" className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-400 hover:bg-amber-500/25">
                Receptury: {data.products_with_recipe}/{data.products_total} produktů — {data.products_total - data.products_with_recipe} bez receptury
              </Link>
            )}
            {data.no_price_count > 0 && (
              <Link href="/admin/sklad/prijem" className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-400 hover:bg-amber-500/25">
                {data.no_price_count} surovin v recepturách bez ceny
              </Link>
            )}
            {data.negative_count > 0 && (
              <Link href="/admin/sklad/karty" className="rounded-full bg-red-500/15 px-3 py-1 text-red-400 hover:bg-red-500/25">
                {data.negative_count} položek v záporném stavu
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Skladové karty" value={data ? String(data.items_count) : "—"}
          hint="aktivní položky" />
        <Card title="Dochází" value={data ? String(data.below_min_count) : "—"}
          hint="pod minimem" accent={data && data.below_min_count > 0 ? "#f59e0b" : undefined} />
        {isAdmin && (
          <Card title="Hodnota skladu" value={data ? formatCzk(data.stock_value_czk) : "—"}
            hint="vážený průměr × stav, bez DPH" />
        )}
        {isAdmin && (
          <Card title={`Příjem (${days} dní)`} value={data ? formatCzk(data.receipts_30d_net_czk) : "—"}
            hint={`bez DPH · ${data?.receipts_30d_count ?? 0} příjemek`} />
        )}
        {isAdmin && (
          <Card title={`Příjem s DPH (${days} dní)`} value={data ? formatCzk(data.receipts_30d_gross_czk) : "—"}
            hint="vč. DPH" />
        )}
      </div>

      {isAdmin && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Náklady a marže ({days} dní)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card title="Tržby" value={data ? formatCzk(data.revenue_30d_czk) : "—"}
              hint="předané a hotové objednávky" />
            <Card title="Náklady surovin" value={data ? formatCzk(data.cogs_30d_czk) : "—"}
              hint="spotřeba dle receptur" />
            <Card title="Hrubá marže" value={data ? formatCzk(data.margin_30d_czk) : "—"}
              hint="tržby − suroviny"
              accent={data && data.margin_30d_czk < 0 ? "#f87171" : "#4ade80"} />
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">Marže pokrývá jen suroviny (ne práci, energie, nájem). Funguje pro produkty, které mají recepturu.</p>

          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Ztráty ({days} dní)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Odpisy" value={data ? formatCzk(data.write_offs_30d_czk) : "—"}
              hint="expirace, poškození…" accent={data && data.write_offs_30d_czk > 0 ? "#f59e0b" : undefined} />
            <Card title="Inventurní rozdíl" value={data ? formatCzk(data.stocktake_30d_czk) : "—"}
              hint="− manko / + přebytek"
              accent={data && data.stocktake_30d_czk < 0 ? "#f87171" : undefined} />
          </div>
        </>
      )}

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-3 font-medium">Rychlé akce</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/sklad/prijem" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">
            + Nový příjem
          </Link>
          <Link href="/admin/sklad/karty" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white hover:border-neutral-600">
            Skladové karty
          </Link>
          <Link href="/admin/sklad/pohyby" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white hover:border-neutral-600">
            Kniha pohybů
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, hint, accent }: { title: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{title}</div>
      <div className="mt-2 text-2xl font-semibold" style={accent ? { color: accent } : undefined}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  );
}
