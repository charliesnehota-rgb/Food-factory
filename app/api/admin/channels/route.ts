// GET   /api/admin/channels — napojení + stav klíčů + statistika fronty
// PATCH /api/admin/channels — úprava napojení (enabled, venue ID, koeficient)
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";
import { woltAdapter } from "@/lib/channels/wolt";
import { foodoraAdapter } from "@/lib/channels/foodora";

export async function GET() {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ connections: [], configured: {} });

  const [{ data: connections }, { data: queueStats }] = await Promise.all([
    supabaseAdmin.from("channel_connections").select("*").order("channel").order("concept_slug"),
    supabaseAdmin.from("channel_sync_queue").select("channel, concept_slug, status"),
  ]);

  // Agregace fronty per napojení
  const stats: Record<string, { pending: number; failed: number; skipped: number }> = {};
  for (const q of queueStats ?? []) {
    const key = `${q.channel}:${q.concept_slug}`;
    stats[key] ??= { pending: 0, failed: 0, skipped: 0 };
    if (q.status === "pending") stats[key].pending++;
    if (q.status === "failed") stats[key].failed++;
    if (q.status === "skipped") stats[key].skipped++;
  }

  return NextResponse.json({
    connections: connections ?? [],
    stats,
    configured: {
      wolt: woltAdapter.isConfigured(),
      foodora: foodoraAdapter.isConfigured(),
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Chybí id napojení." }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  if (body.enabled !== undefined) allowed.enabled = !!body.enabled;
  if (body.external_venue_id !== undefined) allowed.external_venue_id = String(body.external_venue_id).trim() || null;
  if (body.price_multiplier !== undefined) {
    const m = Number(body.price_multiplier);
    if (!(m > 0 && m < 5)) return NextResponse.json({ error: "Koeficient musí být mezi 0 a 5." }, { status: 400 });
    allowed.price_multiplier = m;
  }

  const { data, error } = await supabaseAdmin.from("channel_connections")
    .update(allowed).eq("id", body.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
