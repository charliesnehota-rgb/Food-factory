import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

// POST: aplikuje schválený návrh — price override + push notifikace
export async function POST(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Chybí id." }, { status: 400 });

  const { data: proposal, error: pErr } = await supabaseAdmin
    .from("marketing_proposals").select("*").eq("id", id).single();
  if (pErr || !proposal) return NextResponse.json({ error: "Návrh nenalezen." }, { status: 404 });
  if (proposal.status !== "approved") return NextResponse.json({ error: "Návrh není schválený." }, { status: 400 });

  const now = new Date().toISOString();
  const payload = proposal.payload as Record<string, unknown>;
  let pushSent = 0;
  const actions: string[] = [];

  // --- Price override ---
  if (["price_override", "happy_hour"].includes(proposal.type)) {
    const productIds = (payload.product_ids ?? []) as string[];
    const discountPct = Number(payload.discount_pct ?? 0);
    if (productIds.length > 0 && discountPct !== 0) {
      // Načti aktuální ceny
      const { data: prods } = await supabaseAdmin
        .from("products").select("id, price_czk").in("id", productIds);

      const overrides = (prods ?? []).map(p => ({
        product_id: p.id,
        override_czk: Math.round(Number(p.price_czk) * (1 + discountPct / 100)),
        reason: proposal.title,
        valid_from: proposal.valid_from ?? now,
        valid_until: proposal.valid_until ?? now,
        created_by: "marketing_agent",
      }));
      await supabaseAdmin.from("price_overrides").insert(overrides);
      actions.push(`price_override: ${productIds.length} produktů, ${discountPct > 0 ? "+" : ""}${discountPct} %`);
    }
  }

  // --- Push notifikace ---
  const pushTitle = (payload.push_title ?? payload.title) as string | undefined;
  const pushBody  = (payload.push_body  ?? payload.body) as string | undefined;
  if (pushTitle && pushBody) {
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions").select("endpoint, p256dh, auth_key");

    if (subs && subs.length > 0) {
      const conceptSlug = proposal.concept_slug;
      const pushPayload = JSON.stringify({
        title: pushTitle, body: pushBody,
        url: conceptSlug ? `/restaurace/${conceptSlug}` : "/",
      });
      const { default: webpush } = await import("web-push");
      if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        webpush.setVapidDetails(
          "mailto:info@foodfactory.cz",
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        const results = await Promise.allSettled(
          subs.map(s => webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
            pushPayload
          ).catch(() => null))
        );
        pushSent = results.filter(r => r.status === "fulfilled").length;
      }
      actions.push(`push: ${pushSent}/${subs.length} doručeno`);
    }
  }

  // Označit jako applied + uložit do actions logu
  await supabaseAdmin.from("marketing_proposals")
    .update({ status: "applied", applied_at: now }).eq("id", id);

  await supabaseAdmin.from("marketing_actions").insert({
    proposal_id: id,
    type: proposal.type,
    concept_slug: proposal.concept_slug,
    description: actions.join("; ") || proposal.title,
    payload: proposal.payload,
    push_sent_count: pushSent,
  });

  return NextResponse.json({ ok: true, actions, push_sent: pushSent });
}
