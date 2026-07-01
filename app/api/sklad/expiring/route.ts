import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

// Vrátí skladové položky, u nichž existuje příjemka se nastaveným expiry_date
// <= dnes + days (default 7). Výsledek je seřazen od nejbližší expirace.
// Pro každou stock_item vrátí nejbližší expiry_date (z naskladněných šarží).
export async function GET(req: NextRequest) {
  if (!(await requireStaff()))
    return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin)
    return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const daysParam = Number(req.nextUrl.searchParams.get("days") ?? 7);
  const days = Math.min(Math.max(Number.isFinite(daysParam) ? daysParam : 7, 1), 30);

  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  const thresholdStr = threshold.toISOString().slice(0, 10);

  const { data: rows, error } = await supabaseAdmin
    .from("goods_receipt_items")
    .select(`
      stock_item_id,
      expiry_date,
      stock_item:stock_items!stock_item_id(name, base_unit, current_qty, avg_price_czk, is_active),
      receipt:goods_receipts!receipt_id(status)
    `)
    .not("expiry_date", "is", null)
    .lte("expiry_date", thresholdStr)
    .order("expiry_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);

  // Seskupíme per stock_item_id, bereme nejbližší expiry_date z naskladněných šarží
  const map = new Map<string, {
    stock_item_id: string;
    name: string;
    base_unit: string;
    current_qty: number;
    avg_price_czk: number;
    nearest_expiry: string;
    days_until_expiry: number;  // záporné = již expirováno
  }>();

  for (const row of rows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const receipt: any = Array.isArray(row.receipt) ? row.receipt[0] : row.receipt;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const si: any = Array.isArray(row.stock_item) ? row.stock_item[0] : row.stock_item;
    if (receipt?.status !== "posted") continue;
    if (!si?.is_active) continue;

    if (!map.has(row.stock_item_id)) {
      const ms = new Date(row.expiry_date as string).getTime() - new Date(today).getTime();
      const diffDays = Math.ceil(ms / (1000 * 86400));
      map.set(row.stock_item_id, {
        stock_item_id: row.stock_item_id,
        name: si.name as string,
        base_unit: si.base_unit as string,
        current_qty: Number(si.current_qty),
        avg_price_czk: Number(si.avg_price_czk),
        nearest_expiry: row.expiry_date as string,
        days_until_expiry: diffDays,
      });
    }
  }

  return NextResponse.json(Array.from(map.values()));
}
