import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json([]);
  const { data, error } = await supabaseAdmin
    .from("shopping_lists").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// Vytvoří seznam a naseeduje ho z položek pod minimem (návrh do cíle/minima).
export async function POST(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json().catch(() => ({}));

  const { data: items } = await supabaseAdmin
    .from("stock_items").select("id, name, base_unit, current_qty, min_qty, target_qty")
    .eq("is_active", true).order("name");

  const seed = [];
  for (const it of items ?? []) {
    const min = Number(it.min_qty);
    const cur = Number(it.current_qty);
    if (!(min > 0) || cur > min) continue;
    const target = Number(it.target_qty) > 0 ? Number(it.target_qty) : min;
    const suggested = Math.max(0, Math.ceil(target - cur));
    if (suggested <= 0) continue;
    seed.push({ stock_item_id: it.id, name: it.name, base_unit: it.base_unit, suggested_qty: suggested, order_qty: suggested });
  }

  const { data: list, error } = await supabaseAdmin.from("shopping_lists").insert({
    note: body.note || null,
    created_by: staff.email ?? staff.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (seed.length > 0) {
    const rows = seed.map((s) => ({ ...s, list_id: list.id }));
    await supabaseAdmin.from("shopping_list_items").insert(rows);
  }

  return NextResponse.json(list, { status: 201 });
}
