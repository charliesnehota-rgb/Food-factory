// GET /api/pos/closeout?date=YYYY-MM-DD — denní uzávěrka pokladny.
// Sečte pultovní (channel=pos) objednávky za pražský den: hotově vs. kartou
// na terminálu, počty, storna zvlášť. Jen ke srovnání se šuplíkem a s výpisem
// z terminálu — nic nezapisuje.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

const TZ = "Europe/Prague";

/** Offset zóny (minuty východně od UTC) v daný okamžik — DST-safe. */
function tzOffsetMin(at: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(at).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  return (asUtc - at.getTime()) / 60000;
}

/** Půlnoc pražského dne v UTC. */
function pragueMidnightUtc(dateStr: string): Date {
  const guess = new Date(`${dateStr}T00:00:00Z`);
  return new Date(guess.getTime() - tzOffsetMin(guess) * 60000);
}

export async function GET(req: NextRequest) {
  if (!(await requireRole(["admin", "staff"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Vyžadováno date=YYYY-MM-DD." }, { status: 400 });
  }
  const start = pragueMidnightUtc(date);
  const next = new Date(start.getTime() + 26 * 3600_000); // přes DST hranu
  const end = pragueMidnightUtc(next.toISOString().slice(0, 10));

  const { data, error } = await supabaseAdmin.from("orders")
    .select("total_czk, payment_provider, status")
    .eq("channel", "pos")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sum = { cash: { count: 0, total: 0 }, card: { count: 0, total: 0 }, cancelled: { count: 0, total: 0 } };
  for (const o of data ?? []) {
    const total = Number(o.total_czk);
    if (o.status === "cancelled") { sum.cancelled.count++; sum.cancelled.total += total; continue; }
    const key = o.payment_provider === "card_terminal" ? "card" : "cash";
    sum[key].count++; sum[key].total += total;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return NextResponse.json({
    date,
    cash: { count: sum.cash.count, total: r2(sum.cash.total) },
    card: { count: sum.card.count, total: r2(sum.card.total) },
    cancelled: { count: sum.cancelled.count, total: r2(sum.cancelled.total) },
    total: { count: sum.cash.count + sum.card.count, total: r2(sum.cash.total + sum.card.total) },
  });
}
