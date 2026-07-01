import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { sendLowStockEmail, sendExpiringEmail } from "@/lib/notifications";

// Denně spouští Vercel Cron (viz vercel.json). Projde položky pod minimem
// a pošle souhrn adminům. Chráněno CRON_SECRET (nebo hlavičkou Vercel cronu).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") != null;
  if (secret && auth !== `Bearer ${secret}` && !isVercelCron) {
    return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  }
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  // Položky pod minimem + návrh do cíle (stejná logika jako /api/sklad/shopping)
  const { data: items } = await supabaseAdmin
    .from("stock_items")
    .select("name, base_unit, current_qty, min_qty, target_qty")
    .eq("is_active", true).order("name");

  const low = [];
  for (const it of items ?? []) {
    const min = Number(it.min_qty);
    const cur = Number(it.current_qty);
    if (!(min > 0) || cur > min) continue;
    const target = Number(it.target_qty) > 0 ? Number(it.target_qty) : min;
    const suggested = Math.max(0, Math.ceil(target - cur));
    if (suggested <= 0) continue;
    low.push({ name: it.name, current: cur, min, unit: it.base_unit, suggested });
  }

  // Položky s blížící se expirací (do 3 dnů)
  const today = new Date().toISOString().slice(0, 10);
  const in3 = new Date(); in3.setDate(in3.getDate() + 3);
  const in3Str = in3.toISOString().slice(0, 10);

  const { data: expiryRows } = await supabaseAdmin
    .from("goods_receipt_items")
    .select(`
      stock_item_id,
      expiry_date,
      stock_item:stock_items!stock_item_id(name, base_unit, current_qty, is_active),
      receipt:goods_receipts!receipt_id(status)
    `)
    .not("expiry_date", "is", null)
    .lte("expiry_date", in3Str)
    .order("expiry_date", { ascending: true });

  const expiryMap = new Map<string, { name: string; current_qty: number; base_unit: string; nearest_expiry: string; days_until_expiry: number }>();
  for (const row of expiryRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const receipt: any = Array.isArray(row.receipt) ? row.receipt[0] : row.receipt;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const si: any = Array.isArray(row.stock_item) ? row.stock_item[0] : row.stock_item;
    if (receipt?.status !== "posted" || !si?.is_active) continue;
    if (!expiryMap.has(row.stock_item_id)) {
      const ms = new Date(row.expiry_date as string).getTime() - new Date(today).getTime();
      expiryMap.set(row.stock_item_id, {
        name: si.name as string,
        current_qty: Number(si.current_qty),
        base_unit: si.base_unit as string,
        nearest_expiry: row.expiry_date as string,
        days_until_expiry: Math.ceil(ms / (1000 * 86400)),
      });
    }
  }
  const expiring = Array.from(expiryMap.values());

  // E-maily adminů
  const { data: admins } = await supabaseAdmin
    .from("user_profiles").select("id").eq("role", "admin");
  const emails: string[] = [];
  for (const a of admins ?? []) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(a.id);
      if (data.user?.email) emails.push(data.user.email);
    } catch { /* přeskoč */ }
  }

  if (emails.length === 0) {
    return NextResponse.json({ ok: true, low: low.length, expiring: expiring.length, sent: false, reason: "žádný admin e-mail" });
  }

  let sent = 0;
  if (low.length > 0) { await sendLowStockEmail(emails, low); sent++; }
  if (expiring.length > 0) { await sendExpiringEmail(emails, expiring); sent++; }

  return NextResponse.json({ ok: true, low: low.length, expiring: expiring.length, sent: sent > 0, emails_sent: sent });
}
