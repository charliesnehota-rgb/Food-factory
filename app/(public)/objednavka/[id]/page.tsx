"use client";

import { useEffect, useState, useCallback, use } from "react";

type Status = "new" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";

interface OrderStatus {
  id: string;
  status: Status;
  payment_status: string;
  fulfilment: "delivery" | "pickup" | "dine_in";
  concept_slug: string;
  created_at: string;
  updated_at: string;
}

const CONCEPT_META: Record<string, { name: string; accent: string; emoji: string }> = {
  "sunny-side": { name: "Prostě snídaně", accent: "#f59e0b", emoji: "🍳" },
  "dumply":     { name: "Dumply",          accent: "#ec4899", emoji: "🥟" },
  "smash":      { name: "L.T. Smash",      accent: "#f97316", emoji: "🍔" },
};

// Kroky per typ výdeje
function stepsFor(fulfilment: string): { key: Status | Status[]; label: string; emoji: string }[] {
  const base = [
    { key: ["new", "accepted"] as Status[], label: "Přijato",      emoji: "📥" },
    { key: "preparing" as Status,           label: "Připravujeme", emoji: "👨‍🍳" },
    { key: "ready" as Status,               label: "Hotovo",       emoji: "✅" },
  ];
  if (fulfilment === "delivery") {
    return [...base,
      { key: "out_for_delivery" as Status, label: "Na cestě",  emoji: "🛵" },
      { key: "delivered" as Status,        label: "Doručeno",  emoji: "🎉" },
    ];
  }
  return [...base, { key: "delivered" as Status, label: "Vyzvednuto", emoji: "🎉" }];
}

function stepIndex(steps: ReturnType<typeof stepsFor>, status: Status): number {
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i].key;
    if (Array.isArray(k) ? k.includes(status) : k === status) return i;
  }
  return 0;
}

function minutesSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function OrderTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [, forceTick] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch(`/api/orders/${id}/status`, { cache: "no-store" });
    if (r.status === 404) { setNotFound(true); return; }
    const d = await r.json();
    if (d?.id) setOrder(d);
  }, [id]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 10000);      // poll stav každých 10 s
    const tick = setInterval(() => forceTick(x => x + 1), 30000); // refresh timeru
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [load]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-2xl font-semibold mb-2">Objednávka nenalezena</h1>
        <p className="text-sm text-[var(--muted)]">Zkontroluj číslo objednávky.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="animate-pulse text-[var(--muted)]">Načítám stav objednávky…</div>
      </div>
    );
  }

  const meta = CONCEPT_META[order.concept_slug] ?? { name: order.concept_slug, accent: "#888", emoji: "🍽" };

  // Zrušená objednávka
  if (order.status === "cancelled") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="text-6xl mb-6">😔</div>
        <h1 className="text-2xl font-semibold mb-2">Objednávka zrušena</h1>
        <p className="text-[var(--muted)] mb-1">Číslo: <span className="text-white font-medium">{order.id}</span></p>
        <p className="text-sm text-[var(--muted)] mb-8">Pokud jsi platil/a kartou, peníze se vrátí do pár dnů.</p>
        <a href="/" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-200 transition">
          Zpět na hlavní stránku
        </a>
      </div>
    );
  }

  const steps = stepsFor(order.fulfilment);
  const current = stepIndex(steps, order.status);
  const isDone = order.status === "delivered";
  const elapsed = minutesSince(order.created_at);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      {/* Hlavička */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">{isDone ? "🎉" : steps[current].emoji}</div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-lg" style={{ color: meta.accent }}>{meta.emoji}</span>
          <span className="text-sm font-medium" style={{ color: meta.accent }}>{meta.name}</span>
        </div>
        <h1 className="text-2xl font-semibold mb-1">
          {isDone
            ? (order.fulfilment === "delivery" ? "Doručeno. Dobrou chuť!" : "Vyzvednuto. Dobrou chuť!")
            : steps[current].label}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Objednávka <span className="text-white font-medium">{order.id}</span>
          {!isDone && <> · {elapsed} min</>}
        </p>
      </div>

      {/* Progress kroky */}
      <div className="relative mb-12">
        {/* Spojnice */}
        <div className="absolute left-0 right-0 top-[15px] h-0.5 bg-[var(--border)]" />
        <div
          className="absolute left-0 top-[15px] h-0.5 transition-all duration-700"
          style={{
            background: meta.accent,
            width: `${(current / (steps.length - 1)) * 100}%`,
          }}
        />
        <div className="relative flex justify-between">
          {steps.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <div key={s.label} className="flex flex-col items-center gap-2" style={{ width: `${100 / steps.length}%` }}>
                <div
                  className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all " +
                    (active ? "scale-110" : "")}
                  style={{
                    background: done || active ? meta.accent : "var(--card)",
                    color: done || active ? "#fff" : "var(--muted)",
                    border: done || active ? "none" : "2px solid var(--border)",
                    boxShadow: active ? `0 0 0 6px ${meta.accent}22` : "none",
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span className={"text-[11px] text-center leading-tight " + (active ? "text-white font-medium" : "text-[var(--muted)]")}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live indikátor */}
      {!isDone && (
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted)] mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: meta.accent }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: meta.accent }} />
          </span>
          Stav se aktualizuje automaticky
        </div>
      )}

      <div className="text-center">
        <a href="/" className="text-sm text-[var(--muted)] hover:text-white transition">← Zpět na hlavní stránku</a>
      </div>
    </div>
  );
}
