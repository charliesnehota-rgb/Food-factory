import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { sendLowStockEmail } from "@/lib/notifications";

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

  if (low.length === 0) return NextResponse.json({ ok: true, low: 0, sent: false });

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

  if (emails.length === 0) return NextResponse.json({ ok: true, low: low.length, sent: false, reason: "žádný admin e-mail" });

  await sendLowStockEmail(emails, low);
  return NextResponse.json({ ok: true, low: low.length, sent: true, recipients: emails.length });
}
