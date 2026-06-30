import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

const SELECT = "*, stock_item:stock_items!stock_item_id(name, base_unit)";

export async function GET(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json([]);

  const item = req.nextUrl.searchParams.get("item");
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 100);
  let q = supabaseAdmin.from("stock_movements").select(SELECT)
    .order("created_at", { ascending: false }).limit(limit);
  if (item) q = q.eq("stock_item_id", item);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// Ruční korekce stavu (adjustment). Pro fázi 1 — drobné srovnání.
// type 'adjustment' neovlivní vážený průměr, jen množství.
export async function POST(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json();
  if (!body.stock_item_id || body.qty_change == null || Number(body.qty_change) === 0) {
    return NextResponse.json({ error: "Chybí karta nebo množství" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("stock_movements").insert({
    stock_item_id: body.stock_item_id,
    type: "adjustment",
    qty_change: Number(body.qty_change),
    reason: body.reason || "korekce",
    note: body.note || null,
    created_by: staff.email ?? staff.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
