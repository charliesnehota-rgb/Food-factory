"use client";

import { useState, useEffect, useCallback } from "react";
import { STATUS_LABEL, formatCzk } from "@/lib/types";
import type { Order, OrderStatus } from "@/lib/types";

const FLOW: OrderStatus[] = ["new", "preparing", "ready", "out_for_delivery", "delivered"];

const CHANNEL_LABEL: Record<Order["channel"], string> = {
  web: "Web", wolt: "Wolt", foodora: "Foodora", pos: "POS",
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch {
      // ponech prázdné
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // auto-refresh každých 15 s pro kuchyni
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function setStatus(id: string, ns: OrderStatus) {
    setMenuOpen(null);
    // optimistický update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: ns } : o));
    // persist do DB
    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ns }),
      });
    } catch {
      load(); // při chybě znovu načti pravdu z DB
    }
  }

  function cancelOrder(id: string) {
    if (confirm(`Opravdu zrušit objednávku ${id}? Zákazníkovi přijde e-mail o zrušení.`)) {
      setStatus(id, "cancelled");
    } else {
      setMenuOpen(null);
    }
  }

  const columns: OrderStatus[] = ["new", "preparing", "ready", "out_for_delivery"];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Objednávky</h1>
        <span className="text-sm text-[var(--muted)]">
          {loading ? "Načítám…" : "živý board — auto-refresh 15 s"}
        </span>
      </div>

      {!loading && orders.length === 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10 text-center text-[var(--muted)]">
          Zatím žádné objednávky. Jakmile zákazník odešle objednávku, objeví se zde.
        </div>
      )}

      {/* zavření menu kliknutím mimo */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const items = orders.filter((o) => o.status === col);
          return (
            <div key={col} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-medium">{STATUS_LABEL[col]}</span>
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
                        <span className="rounded bg-[var(--card)] px-1.5 py-0.5 text-xs text-[var(--muted)]">{CHANNEL_LABEL[o.channel]}</span>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-sm text-[var(--muted)]">
                        {o.items.map((it, idx) => (
                          <li key={idx}>{it.qty}× {it.name}</li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-medium">{formatCzk(o.totalCzk)}</span>

                        {/* Akce dropdown */}
                        <div className="relative z-20">
                          <button
                            onClick={() => setMenuOpen(menuOpen === o.id ? null : o.id)}
                            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--border)] transition">
                            Akce ▾
                          </button>
                          {menuOpen === o.id && (
                            <div className="absolute right-0 mt-1 w-48 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg">
                              {ns && (
                                <button onClick={() => setStatus(o.id, ns)}
                                  className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg)] transition">
                                  Posunout vpřed → {STATUS_LABEL[ns]}
                                </button>
                              )}
                              {ps && (
                                <button onClick={() => setStatus(o.id, ps)}
                                  className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg)] transition">
                                  ← Vrátit zpět na {STATUS_LABEL[ps]}
                                </button>
                              )}
                              <button onClick={() => cancelOrder(o.id)}
                                className="block w-full border-t border-[var(--border)] px-3 py-2 text-left text-xs text-red-400 hover:bg-[var(--bg)] transition">
                                Zrušit objednávku
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
