import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

const SELECT = "*, stock_item:stock_items!stock_item_id(name, base_unit, avg_price_czk)";

export async function GET(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json([]);

  const product = req.nextUrl.searchParams.get("product");
  let q = supabaseAdmin.from("product_recipe_items").select(SELECT).order("created_at");
  if (product) q = q.eq("product_id", product);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json();
  if (!body.product_id || !body.stock_item_id || !(Number(body.qty_per_portion) > 0)) {
    return NextResponse.json({ error: "Chybí produkt, surovina nebo množství" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("product_recipe_items").insert({
    product_id: body.product_id,
    stock_item_id: body.stock_item_id,
    qty_per_portion: body.qty_per_portion,
    note: body.note || null,
  }).select(SELECT).single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Tato surovina už v receptuře je" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
