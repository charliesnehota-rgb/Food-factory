"use client";

import { useState } from "react";
import { getOrders } from "@/lib/orders";
import { STATUS_LABEL, formatCzk } from "@/lib/types";
import type { Order, OrderStatus } from "@/lib/types";

// Tok stavů na boardu
const FLOW: OrderStatus[] = ["new", "preparing", "ready", "out_for_delivery", "delivered"];

const CHANNEL_LABEL: Record<Order["channel"], string> = {
  web: "Web", wolt: "Wolt", foodora: "Foodora", pos: "POS",
};

function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = FLOW.indexOf(s);
  if (i === -1 || i === FLOW.length - 1) return null;
  return FLOW[i + 1];
}

export default function OrdersBoard() {
  const [orders, setOrders] = useState<Order[]>(getOrders());

  function advance(id: string) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const ns = nextStatus(o.status);
        return ns ? { ...o, status: ns } : o;
      })
    );
  }

  const columns: OrderStatus[] = ["new", "preparing", "ready", "out_for_delivery"];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Objednávky</h1>
        <span className="text-sm text-[var(--muted)]">
          živý board (demo) — klikni „Posunout“ pro další stav
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const items = orders.filter((o) => o.status === col);
          return (
            <div key={col} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-medium">{STATUS_LABEL[col]}</span>
                <span className="rounded-full bg-neutral-800 px-2 text-xs text-[var(--muted)]">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-[var(--muted)]">prázdné</p>
                )}
                {items.map((o) => (
                  <div key={o.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{o.id}</span>
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-[var(--muted)]">
                        {CHANNEL_LABEL[o.channel]}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-0.5 text-sm text-[var(--muted)]">
                      {o.items.map((it, idx) => (
                        <li key={idx}>{it.qty}× {it.name}</li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{formatCzk(o.totalCzk)}</span>
                      {nextStatus(o.status) && (
                        <button
                          onClick={() => advance(o.id)}
                          className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-neutral-200"
                        >
                          Posunout →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
