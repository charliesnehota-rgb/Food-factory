"use client";

import { getOrders } from "@/lib/orders";
import { concepts, allMenuItems } from "@/lib/data/concepts";
import { formatCzk } from "@/lib/types";
import { useT } from "@/lib/i18n";

export default function AdminDashboard() {
  const t = useT();
  const orders = getOrders();
  const revenue = orders
    .filter((o) => o.payment?.status === "paid")
    .reduce((sum, o) => sum + o.totalCzk, 0);
  const active = orders.filter((o) =>
    ["new", "accepted", "preparing", "ready", "out_for_delivery"].includes(o.status)
  ).length;

  const stats = [
    { label: t("overview.ordersToday"), value: String(orders.length) },
    { label: t("overview.revenue"), value: formatCzk(revenue) },
    { label: t("overview.activeOrders"), value: String(active) },
    { label: t("overview.productsOnMenu"), value: String(allMenuItems().length) },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("overview.title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="text-sm text-[var(--muted)]">{s.label}</div>
            <div className="mt-2 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">{t("overview.concepts")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {concepts.map((c) => (
          <div
            key={c.slug}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <span className="text-2xl">{c.emoji}</span>
            <div>
              <div className="font-medium" style={{ color: c.accent }}>{c.name}</div>
              <div className="text-xs text-[var(--muted)]">{t("overview.items", { count: c.menu.length })}</div>
            </div>
            <span className="ml-auto h-2 w-2 rounded-full bg-green-500" title={t("overview.active")} />
          </div>
        ))}
      </div>
    </div>
  );
}
