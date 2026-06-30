import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { data: items } = await supabaseAdmin
    .from("stock_items").select("current_qty, avg_price_czk, min_qty, is_active").eq("is_active", true);

  let stockValue = 0;
  let belowMin = 0;
  for (const it of items ?? []) {
    stockValue += Number(it.current_qty) * Number(it.avg_price_czk);
    if (Number(it.min_qty) > 0 && Number(it.current_qty) <= Number(it.min_qty)) belowMin++;
  }

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data: receipts } = await supabaseAdmin
    .from("goods_receipts").select("total_net_czk, total_gross_czk")
    .eq("status", "posted").gte("received_at", since);

  const receiptsNet = (receipts ?? []).reduce((s, r) => s + Number(r.total_net_czk), 0);
  const receiptsGross = (receipts ?? []).reduce((s, r) => s + Number(r.total_gross_czk), 0);

  // Tržby z předaných/hotových objednávek za 30 dní
  const sinceIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
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

  return NextResponse.json({
    stock_value_czk: Math.round(stockValue * 100) / 100,
    items_count: items?.length ?? 0,
    below_min_count: belowMin,
    receipts_30d_count: receipts?.length ?? 0,
    receipts_30d_net_czk: Math.round(receiptsNet * 100) / 100,
    receipts_30d_gross_czk: Math.round(receiptsGross * 100) / 100,
    revenue_30d_czk: Math.round(revenue * 100) / 100,
    cogs_30d_czk: Math.round(cogs * 100) / 100,
    margin_30d_czk: Math.round(margin * 100) / 100,
  });
}
