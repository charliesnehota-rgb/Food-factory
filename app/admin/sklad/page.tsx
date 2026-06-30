"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCzk } from "@/lib/types";

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
}

export default function SkladPrehledPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sklad/overview")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sklad — přehled</h1>
        <p className="text-sm text-[var(--muted)]">
          {loading ? "načítám…" : "Hospodaření skladu. Náklady a marže přibudou s recepturami (fáze 2)."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Hodnota skladu" value={data ? formatCzk(data.stock_value_czk) : "—"}
          hint="vážený průměr × stav, bez DPH" />
        <Card title="Skladové karty" value={data ? String(data.items_count) : "—"}
          hint="aktivní položky" />
        <Card title="Dochází" value={data ? String(data.below_min_count) : "—"}
          hint="pod minimem" accent={data && data.below_min_count > 0 ? "#f59e0b" : undefined} />
        <Card title="Příjem (30 dní)" value={data ? formatCzk(data.receipts_30d_net_czk) : "—"}
          hint={`bez DPH · ${data?.receipts_30d_count ?? 0} příjemek`} />
        <Card title="Příjem s DPH (30 dní)" value={data ? formatCzk(data.receipts_30d_gross_czk) : "—"}
          hint="vč. DPH" />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Náklady a marže (30 dní)</h2>
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

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Ztráty (30 dní)</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Odpisy" value={data ? formatCzk(data.write_offs_30d_czk) : "—"}
          hint="expirace, poškození…" accent={data && data.write_offs_30d_czk > 0 ? "#f59e0b" : undefined} />
        <Card title="Inventurní rozdíl" value={data ? formatCzk(data.stocktake_30d_czk) : "—"}
          hint="− manko / + přebytek"
          accent={data && data.stocktake_30d_czk < 0 ? "#f87171" : undefined} />
      </div>

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
