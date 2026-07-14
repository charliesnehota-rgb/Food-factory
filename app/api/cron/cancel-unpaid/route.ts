import { NextRequest, NextResponse } from "next/server";
import { cancelStaleUnpaidOrders } from "@/lib/db/orders";

// Denní pojistka k průběžnému úklidu v GET /api/orders (ten běží, jen když
// má personál otevřený KDS/admin). Spouští Vercel Cron — viz vercel.json.
// Chráněno CRON_SECRET (nebo hlavičkou Vercel cronu).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") != null;
  if (secret && auth !== `Bearer ${secret}` && !isVercelCron) {
    return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  }

  const cancelled = await cancelStaleUnpaidOrders();
  return NextResponse.json({ cancelled });
}
