import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  let name = body.name;
  let base_unit = body.base_unit ?? null;
  if (body.stock_item_id) {
    const { data: it } = await supabaseAdmin
      .from("stock_items").select("name, base_unit").eq("id", body.stock_item_id).single();
    if (it) { name = name || it.name; base_unit = it.base_unit; }
  }
  if (!name) return NextResponse.json({ error: "Chybí název položky" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("shopping_list_items").insert({
    list_id: id,
    stock_item_id: body.stock_item_id || null,
    name,
    base_unit,
    order_qty: body.order_qty != null ? Number(body.order_qty) : null,
    note: body.note || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
