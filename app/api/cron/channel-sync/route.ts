// Každých 5 min spouští Vercel Cron (viz vercel.json) — zpracuje sync frontu
// s respektem k rate limitům platforem. Chráněno CRON_SECRET / Vercel hlavičkou.
import { NextRequest, NextResponse } from "next/server";
import { processChannelQueue } from "@/lib/channels/worker";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") != null;
  if (secret && auth !== `Bearer ${secret}` && !isVercelCron) {
    return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  }
  const report = await processChannelQueue();
  return NextResponse.json(report);
}
