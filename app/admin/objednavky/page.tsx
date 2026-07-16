"use client";

import { useState, useEffect, useCallback } from "react";
import { STATUS_LABEL, formatCzk } from "@/lib/types";
import type { Order, OrderStatus } from "@/lib/types";
import { useT } from "@/lib/i18n";

// Pořadí kuchyňského toku pro šipky vpřed/vzad. Musí sedět s KDS: zaplacené
// web/app objednávky přicházejí ze Stripe webhooku rovnou jako "accepted" —
// dokud tu tenhle stav chyběl, v boardu se vůbec nezobrazovaly.
const FLOW: OrderStatus[] = ["new", "accepted", "preparing", "ready", "out_for_delivery", "delivered"];

const CHANNEL_LABEL: Record<Order["channel"], string> = {
  web: "Web", app: "App", wolt: "Wolt", foodora: "Foodora", pos: "POS",
};

function nextStatus(o: Order): OrderStatus | null {
  // Odběr / na místě nikdy neprochází rozvozem: ready → delivered rovnou.
  if (o.status === "ready" && o.fulfilment !== "delivery") return "delivered";
  const i = FLOW.indexOf(o.status);
  if (i === -1 || i === FLOW.length - 1) return null;
  return FLOW[i + 1];
}
function prevStatus(o: Order): OrderStatus | null {
  if (o.status === "delivered" && o.fulfilment !== "delivery") return "ready";
  const i = FLOW.indexOf(o.status);
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
      // Board je provozní pohled: jen posledních 24 h, starší patří do historie.
      const res = await fetch("/api/orders?hours=24", { cache: "no-store" });
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
    accepted: t("orders.status.accepted"),
    preparing: t("orders.status.preparing"),
    ready: t("orders.status.ready"),
    out_for_delivery: t("orders.status.out_for_delivery"),
    delivered: t("orders.status.delivered"),
    cancelled: t("orders.status.cancelled"),
  };

  // Sloupce = celý tok + Zrušené (kvůli auto-stornu nezaplacených je manažer
  // musí mít na očích; do kuchyně se nedostanou tak jako tak).
  const columns: OrderStatus[] = [...FLOW, "cancelled"];

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {columns.map((col) => {
          const items = orders.filter((o) => o.status === col);
          return (
            <div key={col} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-medium">{STATUS_T[col] ?? STATUS_LABEL[col]}</span>
                <span className="rounded-md bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--muted)]">{items.length}</span>
              </div>
              <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-0.5">
                {items.map((o) => {
                  const ns = nextStatus(o);
                  const ps = prevStatus(o);
                  return (
                    <div key={o.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{o.id}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {(o.channel === "web" || o.channel === "app") && o.payment?.status !== "paid" && o.status !== "cancelled" && (
                            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">{t("orders.unpaid")}</span>
                          )}
                          <span className="rounded bg-[var(--card)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">{CHANNEL_LABEL[o.channel]}</span>
                        </div>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-sm text-[var(--muted)]">
                        {o.items.map((it, idx) => (
                          <li key={idx}>{it.qty}× {it.name}</li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{formatCzk(o.totalCzk)}</span>
                        <button
                          onClick={() => setMenuOpen(menuOpen === o.id ? null : o.id)}
                          className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--border)] transition">
                          {t("common.actions")} ▾
                        </button>
                      </div>
                      {menuOpen === o.id && (
                            <div className="relative z-20 mt-2 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg">
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
