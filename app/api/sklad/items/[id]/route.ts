import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

// current_qty a ceny NIKDY neměníme přímo — jen přes pohyby (korekce).
const FIELDS = ["name", "sku", "category_id", "base_unit", "min_qty", "default_supplier_id", "note", "is_active"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  for (const key of FIELDS) if (body[key] !== undefined) allowed[key] = body[key];
  if (allowed.base_unit && !["g", "ml", "ks"].includes(allowed.base_unit as string)) {
    return NextResponse.json({ error: "Neplatná jednotka (g/ml/ks)" }, { status: 400 });
  }
  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Žádná pole k aktualizaci" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("stock_items").update(allowed).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  // Pokud má karta pohyby, raději ji jen deaktivujeme (zachování historie).
  const { count } = await supabaseAdmin
    .from("stock_movements").select("id", { count: "exact", head: true }).eq("stock_item_id", id);

  if (count && count > 0) {
    const { error } = await supabaseAdmin.from("stock_items").update({ is_active: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deactivated: true });
  }

  const { error } = await supabaseAdmin.from("stock_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
