// GET   /api/concepts/[slug]/hours — veřejné: hodiny + stav otevřeno/zavřeno
// PATCH /api/concepts/[slug]/hours — admin: uložení hodin
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";
import { enqueueChannelSync } from "@/lib/channels";
import { isOpenNow, nextOpenText, type WeekHours } from "@/lib/opening-hours";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!supabaseAdmin) return NextResponse.json({ hours: null, isOpen: true, nextOpen: null });

  const { data } = await supabaseAdmin.from("concept_settings").select("hours").eq("concept_slug", slug).single();
  const hours = (data?.hours ?? null) as WeekHours | null;
  return NextResponse.json({
    hours,
    isOpen: isOpenNow(hours),
    nextOpen: nextOpenText(hours),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { slug } = await params;
  const { hours } = await req.json();

  // Validace tvaru: klíče 0–6, HH:MM formát
  if (typeof hours !== "object" || hours === null) {
    return NextResponse.json({ error: "Neplatný formát hodin." }, { status: 400 });
  }
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const [k, v] of Object.entries(hours as WeekHours)) {
    if (!/^[0-6]$/.test(k)) return NextResponse.json({ error: `Neplatný den: ${k}` }, { status: 400 });
    if (typeof v.closed !== "boolean" || (!v.closed && (!hhmm.test(v.open) || !hhmm.test(v.close)))) {
      return NextResponse.json({ error: `Neplatný čas u dne ${k} (formát HH:MM).` }, { status: 400 });
    }
  }

  const { error } = await supabaseAdmin.from("concept_settings")
    .upsert({ concept_slug: slug, hours, updated_at: new Date().toISOString() }, { onConflict: "concept_slug" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await enqueueChannelSync(slug, "hours");
  return NextResponse.json({ ok: true });
}
