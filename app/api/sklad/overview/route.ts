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

  return NextResponse.json({
    stock_value_czk: Math.round(stockValue * 100) / 100,
    items_count: items?.length ?? 0,
    below_min_count: belowMin,
    receipts_30d_count: receipts?.length ?? 0,
    receipts_30d_net_czk: Math.round(receiptsNet * 100) / 100,
    receipts_30d_gross_czk: Math.round(receiptsGross * 100) / 100,
  });
}
