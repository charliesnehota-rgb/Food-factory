// POST /api/admin/channels/full-sync — zafrontuje kompletní menu push
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { processChannelQueue } from "@/lib/channels/worker";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

export async function POST(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { channel, concept_slug } = await req.json();
  if (!channel || !concept_slug) return NextResponse.json({ error: "Chybí channel nebo concept_slug." }, { status: 400 });

  // Přímý insert (obchází enabled filtr enqueue helpery — admin chce explicitně)
  const dedupeKey = `${channel}:${concept_slug}:menu_full`;
  const { data: existing } = await supabaseAdmin
    .from("channel_sync_queue").select("id")
    .eq("dedupe_key", dedupeKey).eq("status", "pending").maybeSingle();

  if (!existing) {
    const { error } = await supabaseAdmin.from("channel_sync_queue").insert({
      channel, concept_slug, event_type: "menu_full", dedupe_key: dedupeKey,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  after(() => processChannelQueue());
  return NextResponse.json({ ok: true, queued: !existing });
}
