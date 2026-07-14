"use client";

import { useState, useEffect, useCallback } from "react";
import { STATUS_LABEL, formatCzk } from "@/lib/types";
import type { Order, OrderStatus } from "@/lib/types";
import { useT } from "@/lib/i18n";

const FLOW: OrderStatus[] = ["new", "preparing", "ready", "out_for_delivery", "delivered"];

const CHANNEL_LABEL: Record<Order["channel"], string> = {
  web: "Web", app: "App", wolt: "Wolt", foodora: "Foodora", pos: "POS",
};

function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = FLOW.indexOf(s);
  if (i === -1 || i === FLOW.length - 1) return null;
  return FLOW[i + 1];
}
function prevStatus(s: OrderStatus): OrderStatus | null {
  const i = FLOW.indexOf(s);
  if (i <= 0) return null;
  return FLOW[i - 1];
}

export default function OrdersBoard() {
  const t = useT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch { /* ponech prázdné */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  async function setStatus(id: string, ns: OrderStatus) {
    setMenuOpen(null);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: ns } : o));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ns }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? t("orders.updateFailed"));
        load();
      }
    } catch { load(); }
  }

  function cancelOrder(id: string) {
    if (confirm(t("orders.cancelConfirm", { id }))) {
      setStatus(id, "cancelled");
    } else {
      setMenuOpen(null);
    }
  }

  const STATUS_T: Partial<Record<OrderStatus, string>> = {
    new: t("orders.status.new"),
    preparing: t("orders.status.preparing"),
    ready: t("orders.status.ready"),
    out_for_delivery: t("orders.status.out_for_delivery"),
    delivered: t("orders.status.delivered"),
    cancelled: t("orders.status.cancelled"),
  };

  const columns: OrderStatus[] = ["new", "preparing", "ready", "out_for_delivery", "delivered"];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("orders.title")}</h1>
        <span className="text-sm text-[var(--muted)]">
          {loading ? t("common.loading") : "auto-refresh 15 s"}
        </span>
      </div>

      {!loading && orders.length === 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10 text-center text-[var(--muted)]">
          {t("orders.empty")}
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {columns.map((col) => {
          const items = orders.filter((o) => o.status === col);
          return (
            <div key={col} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-medium">{STATUS_T[col] ?? STATUS_LABEL[col]}</span>
                <span className="rounded-md bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--muted)]">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((o) => {
                  const ns = nextStatus(o.status);
                  const ps = prevStatus(o.status);
                  return (
                    <div key={o.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{o.id}</span>
                        <span className="flex items-center gap-1.5">
                          {(o.channel === "web" || o.channel === "app") && o.payment?.status !== "paid" && o.status !== "cancelled" && (
                            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-xs font-bold text-red-400">{t("orders.unpaid")}</span>
                          )}
                          <span className="rounded bg-[var(--card)] px-1.5 py-0.5 text-xs text-[var(--muted)]">{CHANNEL_LABEL[o.channel]}</span>
                        </span>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-sm text-[var(--muted)]">
                        {o.items.map((it, idx) => (
                          <li key={idx}>{it.qty}× {it.name}</li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-medium">{formatCzk(o.totalCzk)}</span>
                        <div className="relative z-20">
                          <button
                            onClick={() => setMenuOpen(menuOpen === o.id ? null : o.id)}
                            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--border)] transition">
                            {t("common.actions")} ▾
                          </button>
                          {menuOpen === o.id && (
                            <div className="absolute right-0 mt-1 w-48 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg">
                              {ns && (
                                <button onClick={() => setStatus(o.id, ns)}
                                  className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg)] transition">
                                  {STATUS_T[ns] ?? STATUS_LABEL[ns]} →
                                </button>
                              )}
                              {ps && (
                                <button onClick={() => setStatus(o.id, ps)}
                                  className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg)] transition">
                                  ← {STATUS_T[ps] ?? STATUS_LABEL[ps]}
                                </button>
                              )}
                              <button onClick={() => cancelOrder(o.id)}
                                className="block w-full border-t border-[var(--border)] px-3 py-2 text-left text-xs text-red-400 hover:bg-[var(--bg)] transition">
                                {t("orders.action.cancel")}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
