// PATCH /api/courier/orders/[id] — kurýrní akce nad objednávkou.
// body: { action: "take" | "deliver" | "release" }
//   take    — vezmu ji na rozvoz (ready → out_for_delivery + přiřazení na mě)
//   deliver — doručeno (out_for_delivery → delivered)
//   release — vracím do poolu (omyl; out_for_delivery → ready, bez notifikací)
// Všechny přechody jsou atomické přes podmíněný UPDATE — dva kurýři si nikdy
// nevezmou stejnou objednávku, doručit jde jen to, co skutečně vezu.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";
import { applyStatusSideEffects } from "@/lib/order-side-effects";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["courier", "admin"]);
  if (!user) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { action } = await req.json();
  const by = user.email ?? user.id;

  if (action === "take") {
    // Jen hotové, zaplacené (u POS stačí, že existuje), rozvozové a nikým nevzaté.
    const { data, error } = await supabaseAdmin.from("orders")
      .update({ status: "out_for_delivery", courier_id: user.id })
      .eq("id", id)
      .eq("status", "ready")
      .eq("fulfilment", "delivery")
      .in("channel", ["web", "app", "pos"])
      .or("payment_status.eq.paid,channel.eq.pos")
      .is("courier_id", null)
      .select("id");
    if (error?.code === "42703") {
      return NextResponse.json({ error: "Chybí sloupec courier_id — běžela migrace migration_couriers.sql?" }, { status: 500 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: "Objednávku už vzal někdo jiný, nebo není připravená k rozvozu." }, { status: 409 });
    await applyStatusSideEffects(id, "out_for_delivery", by);
    return NextResponse.json({ ok: true });
  }

  if (action === "deliver") {
    const { data, error } = await supabaseAdmin.from("orders")
      .update({ status: "delivered" })
      .eq("id", id)
      .eq("courier_id", user.id)
      .eq("status", "out_for_delivery")
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: "Tahle objednávka není na tvé rozvážce." }, { status: 409 });
    await applyStatusSideEffects(id, "delivered", by);
    return NextResponse.json({ ok: true });
  }

  if (action === "release") {
    // Tichý návrat do poolu — bez notifikací (zákazníkovi by přišlo „připraveno" podruhé).
    const { data, error } = await supabaseAdmin.from("orders")
      .update({ status: "ready", courier_id: null })
      .eq("id", id)
      .eq("courier_id", user.id)
      .eq("status", "out_for_delivery")
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: "Tahle objednávka není na tvé rozvážce." }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Neznámá akce." }, { status: 400 });
}
