import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

const SELECT = "*, stock_item:stock_items!stock_item_id(name, base_unit)";

export async function GET(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json([]);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 100);
  const { data, error } = await supabaseAdmin
    .from("stock_movements").select(SELECT)
    .eq("type", "write_off").order("created_at", { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// Odpis: výdej ze skladu mimo prodej. Oceněn aktuálním váženým průměrem,
// aby šla vyčíslit korunová ztráta. Záporný stav neblokujeme.
export async function POST(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json();
  const qty = Number(body.qty);
  if (!body.stock_item_id || !(qty > 0)) {
    return NextResponse.json({ error: "Chybí surovina nebo kladné množství" }, { status: 400 });
  }

  const { data: item } = await supabaseAdmin
    .from("stock_items").select("avg_price_czk").eq("id", body.stock_item_id).single();

  const { data, error } = await supabaseAdmin.from("stock_movements").insert({
    stock_item_id: body.stock_item_id,
    type: "write_off",
    qty_change: -qty,
    unit_price_czk: item ? Number(item.avg_price_czk) : null,
    reason: body.reason || "odpis",
    note: body.note || null,
    created_by: staff.email ?? staff.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
