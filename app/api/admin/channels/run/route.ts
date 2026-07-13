// POST /api/admin/channels/run — okamžité zpracování fronty (admin tlačítko)
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-staff";
import { processChannelQueue } from "@/lib/channels/worker";

export const maxDuration = 60;

export async function POST() {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  const report = await processChannelQueue();
  return NextResponse.json(report);
}
