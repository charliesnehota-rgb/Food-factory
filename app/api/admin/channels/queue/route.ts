// GET /api/admin/channels/queue — posledních 30 sync událostí
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

export async function GET() {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json([]);

  const { data } = await supabaseAdmin
    .from("channel_sync_queue")
    .select("id, channel, concept_slug, event_type, status, attempts, error, created_at, processed_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return NextResponse.json(data ?? []);
}
