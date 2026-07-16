// GET /api/courier/orders — kurýr (nebo admin): pool hotových rozvozových
// objednávek + "moje rozvážka" (co právě vezu). Wolt/Foodora sem nepatří —
// jejich rozvoz dělají jejich kurýři.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

const FIELDS = "id, concept_slug, customer_name, customer_phone, customer_address, note, total_czk, created_at, order_items(name, qty)";

export async function GET() {
  const user = await requireRole(["courier", "admin"]);
  if (!user) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const [poolRes, mineRes] = await Promise.all([
    supabaseAdmin.from("orders")
      .select(FIELDS)
      .eq("status", "ready")
      .eq("fulfilment", "delivery")
      .in("channel", ["web", "app", "pos"])
      .or("payment_status.eq.paid,channel.eq.pos")
      .is("courier_id", null)
      .order("created_at", { ascending: true }),
    supabaseAdmin.from("orders")
      .select(FIELDS)
      .eq("status", "out_for_delivery")
      .eq("courier_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  // 42703 = sloupec courier_id ještě neexistuje (migrace migration_couriers.sql
  // se aplikuje ručně) — stránka ať to řekne srozumitelně, ne pádem.
  if (poolRes.error?.code === "42703" || mineRes.error?.code === "42703") {
    return NextResponse.json({ pool: [], mine: [], migrationPending: true });
  }
  const err = poolRes.error ?? mineRes.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  return NextResponse.json(
    { pool: poolRes.data ?? [], mine: mineRes.data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
