"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STATUS_LABEL, formatCzk } from "@/lib/types";
import type { OrderStatus } from "@/lib/types";

interface DbOrder {
  id: string;
  status: OrderStatus;
  total_czk: number;
  payment_status: string;
  fulfilment: string;
  created_at: string;
  order_items: { name: string; qty: number }[];
}

const STATUS_STEPS: OrderStatus[] = ["new", "accepted", "preparing", "ready", "out_for_delivery", "delivered"];

function StatusBadge({ status }: { status: OrderStatus }) {
  const colors: Record<string, string> = {
    new: "bg-blue-500/20 text-blue-300",
    accepted: "bg-blue-500/20 text-blue-300",
    preparing: "bg-amber-500/20 text-amber-300",
    ready: "bg-green-500/20 text-green-300",
    out_for_delivery: "bg-purple-500/20 text-purple-300",
    delivered: "bg-neutral-600/30 text-neutral-300",
    cancelled: "bg-red-500/20 text-red-300",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colors[status] ?? ""}`}>{STATUS_LABEL[status]}</span>;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => fetch("/api/account/orders").then(r => r.json()).then(d => {
      if (d.error) { router.push("/ucet/prihlaseni?next=/ucet/objednavky"); return; }
      setOrders(d.orders ?? []);
      setLoading(false);
    });
    load();
    const t = setInterval(load, 20000); // auto-refresh stavu
    return () => clearInterval(t);
  }, [router]);

  if (loading) return <div className="px-4 py-20 text-center text-[var(--muted)]">Načítám…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Moje objednávky</h1>
        <Link href="/ucet/profil" className="text-sm text-[var(--muted)] hover:text-white">← Účet</Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10 text-center text-[var(--muted)]">
          Zatím žádné objednávky. <Link href="/" className="underline text-white">Začni objednávat →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => {
            const stepIdx = STATUS_STEPS.indexOf(o.status);
            return (
              <div key={o.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium">{o.id}</span>
                    <span className="text-xs text-[var(--muted)] ml-2">{new Date(o.created_at).toLocaleString("cs-CZ")}</span>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                <ul className="text-sm text-[var(--muted)] mb-3 space-y-0.5">
                  {o.order_items?.map((it, i) => <li key={i}>{it.qty}× {it.name}</li>)}
                </ul>

                {/* Progress bar stavu */}
                {o.status !== "cancelled" && (
                  <div className="flex gap-1 mb-3">
                    {STATUS_STEPS.slice(0, 5).map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-green-400" : "bg-[var(--border)]"}`} />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className={o.payment_status === "paid" ? "text-green-400" : "text-[var(--muted)]"}>
                    {o.payment_status === "paid" ? "✓ Zaplaceno" : "Platba při převzetí"}
                  </span>
                  <span className="font-semibold">{formatCzk(Number(o.total_czk))}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
