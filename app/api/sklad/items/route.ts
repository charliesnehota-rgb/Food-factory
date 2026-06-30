import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

const SELECT = "*, category:stock_categories!category_id(name, vat_rate), supplier:suppliers!default_supplier_id(name)";

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json([]);
  const showAll = req.nextUrl.searchParams.get("all") === "1";
  let q = supabaseAdmin.from("stock_items").select(SELECT).order("name");
  if (!showAll) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Chybí název" }, { status: 400 });
  if (!["g", "ml", "ks"].includes(body.base_unit)) {
    return NextResponse.json({ error: "Neplatná jednotka (g/ml/ks)" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("stock_items").insert({
    name: body.name,
    sku: body.sku || null,
    category_id: body.category_id || null,
    base_unit: body.base_unit,
    min_qty: body.min_qty ?? 0,
    default_supplier_id: body.default_supplier_id || null,
    note: body.note || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
