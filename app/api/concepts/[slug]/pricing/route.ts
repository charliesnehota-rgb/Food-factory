// GET   /api/concepts/[slug]/pricing — admin: aktuální křivka marže + aktuální %
// PATCH /api/concepts/[slug]/pricing — admin: uložení křivky
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";
import { enqueueChannelSync } from "@/lib/channels";
import { currentMarginPct, type MarginCurve } from "@/lib/pricing";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  const { slug } = await params;
  if (!supabaseAdmin) return NextResponse.json({ curve: null, currentPct: 0 });

  const { data, error } = await supabaseAdmin
    .from("concept_settings").select("margin_curve").eq("concept_slug", slug).single();

  // Sloupec margin_curve ještě nemusí existovat (migrace se aplikuje ručně) —
  // admin stránka ať v tom případě jede s prázdnou křivkou, ne s chybou.
  if (error) return NextResponse.json({ curve: {}, currentPct: 0, migrationPending: true });

  const curve = (data?.margin_curve ?? {}) as MarginCurve;
  return NextResponse.json({ curve, currentPct: currentMarginPct(curve) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { slug } = await params;
  const { curve } = await req.json();

  // Validace tvaru: klíče dne 0–6, klíče hodiny 0–23, hodnota % v rozumném rozsahu
  if (typeof curve !== "object" || curve === null) {
    return NextResponse.json({ error: "Neplatný formát křivky." }, { status: 400 });
  }
  for (const [day, hoursObj] of Object.entries(curve as Record<string, unknown>)) {
    if (!/^[0-6]$/.test(day)) return NextResponse.json({ error: `Neplatný den: ${day}` }, { status: 400 });
    if (typeof hoursObj !== "object" || hoursObj === null) {
      return NextResponse.json({ error: `Neplatná data pro den ${day}.` }, { status: 400 });
    }
    for (const [hour, pct] of Object.entries(hoursObj as Record<string, unknown>)) {
      if (!/^([0-9]|1[0-9]|2[0-3])$/.test(hour)) return NextResponse.json({ error: `Neplatná hodina: ${hour}` }, { status: 400 });
      if (typeof pct !== "number" || !Number.isFinite(pct) || pct < -90 || pct > 200) {
        return NextResponse.json({ error: `Neplatná marže u dne ${day}, ${hour}h (rozsah -90 až 200 %).` }, { status: 400 });
      }
    }
  }

  const { error } = await supabaseAdmin.from("concept_settings")
    .upsert({ concept_slug: slug, margin_curve: curve, updated_at: new Date().toISOString() }, { onConflict: "concept_slug" });

  if (error) {
    // Nejčastější příčina: migrace supabase/migration_pricing_curve.sql ještě neběžela.
    return NextResponse.json({ error: `${error.message} (běžela migrace migration_pricing_curve.sql?)` }, { status: 500 });
  }
  await enqueueChannelSync(slug, "menu_full");
  return NextResponse.json({ ok: true });
}
