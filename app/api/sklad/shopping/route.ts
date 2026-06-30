import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

// Základ nákupního seznamu: položky pod minimem. Návrh množství doplní
// na cílový stav (target_qty), nebo aspoň na minimum, když cíl není nastaven.
export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ items: [] });

  const { data: items } = await supabaseAdmin
    .from("stock_items")
    .select("id, name, base_unit, current_qty, min_qty, target_qty, last_purchase_price_czk, category:stock_categories!category_id(vat_rate), supplier:suppliers!default_supplier_id(name)")
    .eq("is_active", true).order("name");

  const out = [];
  for (const it of items ?? []) {
    const min = Number(it.min_qty);
    const cur = Number(it.current_qty);
    if (!(min > 0) || cur > min) continue; // potřebuje koupit jen pod minimem
    const target = Number(it.target_qty) > 0 ? Number(it.target_qty) : min;
    const suggested = Math.max(0, Math.ceil(target - cur));
    if (suggested <= 0) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat: any = Array.isArray((it as any).category) ? (it as any).category[0] : (it as any).category;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sup: any = Array.isArray((it as any).supplier) ? (it as any).supplier[0] : (it as any).supplier;
    out.push({
      id: it.id, name: it.name, base_unit: it.base_unit,
      current_qty: cur, min_qty: min, target_qty: target,
      suggested_base: suggested,
      last_purchase_price_czk: it.last_purchase_price_czk != null ? Number(it.last_purchase_price_czk) : null,
      vat_rate: cat ? Number(cat.vat_rate) : 12,
      supplier_name: sup?.name ?? null,
    });
  }
  return NextResponse.json({ items: out });
}
