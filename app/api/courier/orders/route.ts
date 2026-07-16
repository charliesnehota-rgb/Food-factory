// GET /api/courier/orders — kurýr (nebo admin): pool hotových rozvozových
// objednávek + "moje rozvážka" (co právě vezu). Wolt/Foodora sem nepatří —
// jejich rozvoz dělají jejich kurýři.
//
// Základní optimalizace rozvozu:
//  - u objednávek se souřadnicemi se ukazuje čtvrť (a vzdálenost od kuchyně,
//    je-li známá adresa kuchyně — viz lib/geo.ts),
//  - "moje rozvážka" chodí seřazená po trase (nearest-neighbor řetěz),
//  - `suggestion` = návrh rozvážky: nejstarší objednávka + až 2 další poblíž.
// Objednávkám bez souřadnic (starší / neúspěšné geokódování) se poloha
// doplňuje líně — max 2 na jeden dotaz, ať se drží limit Nominatimu (1 req/s).
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";
import { geocodeAddress, getKitchenCoords, haversineKm, nnOrder, suggestRun } from "@/lib/geo";

const BASE_FIELDS = "id, concept_slug, customer_name, customer_phone, customer_address, note, total_czk, created_at, order_items(name, qty)";
const GEO_FIELDS = BASE_FIELDS + ", delivery_lat, delivery_lng, delivery_district";

interface CourierRow {
  id: string; concept_slug: string;
  customer_name: string; customer_phone: string; customer_address: string;
  note: string | null; total_czk: number; created_at: string;
  order_items: { name: string; qty: number }[];
  delivery_lat: number | null; delivery_lng: number | null; delivery_district: string | null;
  dist_km?: number | null;
}

function fetchLists(fields: string, userId: string) {
  if (!supabaseAdmin) throw new Error("DB nedostupná");
  return Promise.all([
    supabaseAdmin.from("orders")
      .select(fields)
      .eq("status", "ready")
      .eq("fulfilment", "delivery")
      .in("channel", ["web", "app", "pos"])
      .or("payment_status.eq.paid,channel.eq.pos")
      .is("courier_id", null)
      .order("created_at", { ascending: true }),
    supabaseAdmin.from("orders")
      .select(fields)
      .eq("status", "out_for_delivery")
      .eq("courier_id", userId)
      .order("created_at", { ascending: true }),
  ]);
}

export async function GET() {
  const user = await requireRole(["courier", "admin"]);
  if (!user) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  // Nejdřív se souřadnicemi; když geo sloupce ještě nejsou (migrace
  // migration_delivery_geo.sql), spadni na základní výběr — rozvoz
  // funguje dál, jen bez čtvrtí a návrhů.
  let geo = true;
  let [poolRes, mineRes] = await fetchLists(GEO_FIELDS, user.id);
  if (poolRes.error?.code === "42703" || mineRes.error?.code === "42703") {
    geo = false;
    [poolRes, mineRes] = await fetchLists(BASE_FIELDS, user.id);
    // 42703 i teď = chybí courier_id (migration_couriers.sql)
    if (poolRes.error?.code === "42703" || mineRes.error?.code === "42703") {
      return NextResponse.json({ pool: [], mine: [], migrationPending: true });
    }
  }
  const err = poolRes.error ?? mineRes.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const pool = (poolRes.data ?? []) as unknown as CourierRow[];
  let mine = (mineRes.data ?? []) as unknown as CourierRow[];

  if (!geo) {
    return NextResponse.json(
      { pool, mine, geoPending: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Líné dogeokódování starších objednávek (max 2 / dotaz, sekvenčně)
  const missing = [...mine, ...pool].filter(o => o.delivery_lat == null).slice(0, 2);
  for (const o of missing) {
    const g = await geocodeAddress(o.customer_address);
    if (!g) continue;
    o.delivery_lat = g.lat; o.delivery_lng = g.lng; o.delivery_district = g.district;
    await supabaseAdmin.from("orders")
      .update({ delivery_lat: g.lat, delivery_lng: g.lng, delivery_district: g.district })
      .eq("id", o.id);
  }

  const kitchen = await getKitchenCoords();
  if (kitchen) {
    for (const o of pool) {
      o.dist_km = o.delivery_lat != null && o.delivery_lng != null
        ? Math.round(haversineKm(kitchen, { lat: o.delivery_lat, lng: o.delivery_lng }) * 10) / 10
        : null;
    }
  }

  mine = nnOrder(mine, kitchen);
  const suggestion = suggestRun(pool, kitchen);

  return NextResponse.json(
    { pool, mine, suggestion },
    { headers: { "Cache-Control": "no-store" } },
  );
}
