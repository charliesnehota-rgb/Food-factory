"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useT } from "@/lib/i18n";

type Status = "new" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";

interface OrderItem { name: string; qty: number; note?: string }
interface Order {
  id: string;
  conceptSlug: string;
  channel: string;
  fulfilment: "delivery" | "pickup" | "dine_in";
  status: Status;
  items: OrderItem[];
  createdAt: string;
  customer: { name: string };
  payment?: { status: string };
}

const CONCEPT_META: Record<string, { name: string; accent: string; emoji: string }> = {
  "sunny-side": { name: "Prostě snídaně", accent: "#f59e0b", emoji: "🍳" },
  "dumply":     { name: "Dumply",          accent: "#ec4899", emoji: "🥟" },
  "smash":      { name: "L.T. Smash",      accent: "#f97316", emoji: "🍔" },
};

const FULFILMENT_ICON: Record<string, string> = { delivery: "🛵", pickup: "🥡", dine_in: "🍽" };

// KDS sloupce + akce
const COLUMNS: { status: Status; labelKey: string; next: Status | null; nextLabelKey: string }[] = [
  { status: "new",       labelKey: "kds.col.new",       next: "accepted",  nextLabelKey: "kds.action.accept" },
  { status: "accepted",  labelKey: "kds.col.accepted",  next: "preparing", nextLabelKey: "kds.action.start" },
  { status: "preparing", labelKey: "kds.col.preparing", next: "ready",     nextLabelKey: "kds.action.ready" },
  { status: "ready",     labelKey: "kds.col.ready",     next: null,        nextLabelKey: "" },
];

function minutesSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}
function ageColor(min: number) {
  if (min < 10) return "#4ade80";
  if (min < 20) return "#facc15";
  return "#f87171";
}

// Krátký beep přes Web Audio (nová objednávka)
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch { /* autoplay policy — ticho */ }
}

export default function KDSPage() {
  const t = useT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    const d = await fetch("/api/orders", { cache: "no-store" }).then(r => r.json()).catch(() => null);
    if (!Array.isArray(d)) return;
    // Beep na novou objednávku (ne při prvním načtení)
    if (!firstLoad.current) {
      const hasNew = d.some((o: Order) => o.status === "new" && !knownIds.current.has(o.id));
      if (hasNew) beep();
    }
    knownIds.current = new Set(d.map((o: Order) => o.id));
    firstLoad.current = false;
    setOrders(d);
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 8000);
    const tick = setInterval(() => forceTick(x => x + 1), 15000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [load]);

  async function advance(order: Order, next: Status) {
    setBusy(order.id);
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    setBusy(null);
    load();
  }

  // Hotové: pickup → delivered, delivery → out_for_delivery
  function readyNext(o: Order): { status: Status; label: string } {
    return o.fulfilment === "delivery"
      ? { status: "out_for_delivery", label: t("kds.action.dispatch") }
      : { status: "delivered", label: t("kds.action.pickedUp") };
  }

  const activeCount = orders.filter(o => ["new", "accepted", "preparing"].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 select-none">
      {/* Horní lišta */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">🍳 KDS</h1>
          <span className="text-sm text-[var(--muted)]">{t("kds.active", { count: activeCount })}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-green-500 opacity-60" />
              <span className="relative rounded-full h-2 w-2 bg-green-500" />
            </span>
            live
          </span>
          <a href="/admin" className="text-xs text-[var(--muted)] hover:text-white border border-[var(--border)] rounded-lg px-3 py-1.5">
            ← {t("kds.backToAdmin")}
          </a>
        </div>
      </div>

      {/* Sloupce */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
        {COLUMNS.map(col => {
          const colOrders = orders
            .filter(o => o.status === col.status)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return (
            <div key={col.status} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-sm font-semibold">{t(col.labelKey)}</span>
                <span className="text-xs rounded-full bg-[var(--bg)] px-2 py-0.5 text-[var(--muted)]">{colOrders.length}</span>
              </div>

              <div className="p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-140px)] overflow-y-auto">
                {colOrders.length === 0 && (
                  <div className="py-8 text-center text-xs text-[var(--muted)]">{t("kds.empty")}</div>
                )}
                {colOrders.map(o => {
                  const meta = CONCEPT_META[o.conceptSlug] ?? { name: o.conceptSlug, accent: "#888", emoji: "🍽" };
                  const min = minutesSince(o.createdAt);
                  const isBusy = busy === o.id;
                  const action = col.next
                    ? { status: col.next, label: t(col.nextLabelKey) }
                    : readyNext(o);
                  return (
                    <div key={o.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden">
                      {/* Hlavička karty */}
                      <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2">
                        <span style={{ color: meta.accent }} className="text-base leading-none">{meta.emoji}</span>
                        <span className="font-mono text-xs font-semibold truncate">{o.id.split("-").pop()}</span>
                        <span className="text-sm">{FULFILMENT_ICON[o.fulfilment]}</span>
                        {(o.channel === "web" || o.channel === "app") && o.payment?.status !== "paid" && (
                          <span className="text-[10px] font-bold rounded-md px-1.5 py-0.5 bg-red-500/15 text-red-400">{t("kds.unpaid")}</span>
                        )}
                        <span
                          className="ml-auto font-mono text-xs font-bold rounded-md px-1.5 py-0.5"
                          style={{ color: ageColor(min), background: `${ageColor(min)}18` }}
                        >
                          {min}′
                        </span>
                      </div>

                      {/* Položky */}
                      <div className="px-3 pb-2 space-y-0.5">
                        {o.items.map((it, i) => (
                          <div key={i} className="flex items-baseline gap-1.5 text-sm leading-snug">
                            <span className="font-bold" style={{ color: meta.accent }}>{it.qty}×</span>
                            <span className="truncate">{it.name}</span>
                          </div>
                        ))}
                        {o.items.some(it => it.note) && (
                          <div className="mt-1 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-1 text-[11px] text-amber-300">
                            {o.items.filter(it => it.note).map(it => it.note).join(" · ")}
                          </div>
                        )}
                      </div>

                      {/* Akce */}
                      <button
                        onClick={() => advance(o, action.status)}
                        disabled={isBusy}
                        className="w-full py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                        style={{ background: meta.accent }}
                      >
                        {isBusy ? "…" : action.label}
                      </button>
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
