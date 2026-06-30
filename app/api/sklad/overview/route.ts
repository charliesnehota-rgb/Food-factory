import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

export async function GET(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const daysParam = Number(req.nextUrl.searchParams.get("days"));
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;

  const { data: items } = await supabaseAdmin
    .from("stock_items").select("current_qty, avg_price_czk, min_qty, is_active").eq("is_active", true);

  let stockValue = 0;
  let belowMin = 0;
  let negative = 0;
  for (const it of items ?? []) {
    stockValue += Number(it.current_qty) * Number(it.avg_price_czk);
    if (Number(it.min_qty) > 0 && Number(it.current_qty) <= Number(it.min_qty)) belowMin++;
    if (Number(it.current_qty) < 0) negative++;
  }

  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data: receipts } = await supabaseAdmin
    .from("goods_receipts").select("total_net_czk, total_gross_czk")
    .eq("status", "posted").gte("received_at", since);

  const receiptsNet = (receipts ?? []).reduce((s, r) => s + Number(r.total_net_czk), 0);
  const receiptsGross = (receipts ?? []).reduce((s, r) => s + Number(r.total_gross_czk), 0);

  // Tržby z předaných/hotových objednávek za období
  const sinceIso = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const { data: ord } = await supabaseAdmin
    .from("orders").select("total_czk")
    .in("status", ["ready", "delivered"]).gte("created_at", sinceIso);
  const revenue = (ord ?? []).reduce((s, o) => s + Number(o.total_czk), 0);

  // Náklady na suroviny ze spotřeby za 30 dní (mínus vrácení při stornu)
  const { data: cons } = await supabaseAdmin
    .from("stock_movements").select("qty_change, unit_price_czk, ref_type, type")
    .in("ref_type", ["order", "order_reversal"]).gte("created_at", sinceIso);
  let cogs = 0;
  for (const m of cons ?? []) {
    const price = Number(m.unit_price_czk ?? 0);
    if (m.ref_type === "order" && m.type === "consumption") cogs += -Number(m.qty_change) * price;
    else if (m.ref_type === "order_reversal") cogs -= Number(m.qty_change) * price;
  }
  const margin = revenue - cogs;

  // Odpisy a inventurní rozdíly za 30 dní
  const { data: wo } = await supabaseAdmin
    .from("stock_movements").select("qty_change, unit_price_czk")
    .eq("type", "write_off").gte("created_at", sinceIso);
  const writeOffs = (wo ?? []).reduce((s, m) => s + Math.abs(Number(m.qty_change)) * Number(m.unit_price_czk ?? 0), 0);

  const { data: st } = await supabaseAdmin
    .from("stock_movements").select("qty_change, unit_price_czk")
    .eq("type", "stocktake").gte("created_at", sinceIso);
  const stocktakeNet = (st ?? []).reduce((s, m) => s + Number(m.qty_change) * Number(m.unit_price_czk ?? 0), 0);

  // Pokrytí receptur a suroviny bez ceny
  const { data: prods } = await supabaseAdmin.from("products").select("id");
  const { data: recAll } = await supabaseAdmin
    .from("product_recipe_items")
    .select("product_id, stock_item:stock_items!stock_item_id(avg_price_czk)");
  const withRecipe = new Set((recAll ?? []).map((r) => r.product_id)).size;
  const noPrice = new Set<string>();
  for (const r of recAll ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const si: any = Array.isArray((r as any).stock_item) ? (r as any).stock_item[0] : (r as any).stock_item;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (si && Number(si.avg_price_czk) === 0) noPrice.add((r as any).stock_item_id ?? JSON.stringify(r));
  }

  return NextResponse.json({
    stock_value_czk: Math.round(stockValue * 100) / 100,
    items_count: items?.length ?? 0,
    below_min_count: belowMin,
    negative_count: negative,
    receipts_30d_count: receipts?.length ?? 0,
    receipts_30d_net_czk: Math.round(receiptsNet * 100) / 100,
    receipts_30d_gross_czk: Math.round(receiptsGross * 100) / 100,
    revenue_30d_czk: Math.round(revenue * 100) / 100,
    cogs_30d_czk: Math.round(cogs * 100) / 100,
    margin_30d_czk: Math.round(margin * 100) / 100,
    write_offs_30d_czk: Math.round(writeOffs * 100) / 100,
    stocktake_30d_czk: Math.round(stocktakeNet * 100) / 100,
    products_total: prods?.length ?? 0,
    products_with_recipe: withRecipe,
    no_price_count: noPrice.size,
    days,
  });
}
