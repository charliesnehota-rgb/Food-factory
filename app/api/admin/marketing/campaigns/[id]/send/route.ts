// POST /api/admin/marketing/campaigns/[id]/send
// Vyřeší příjemce segmentu a odešle kampaň přes Resend batch.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";
import { resolveCampaignRecipients, sendCampaignBatch, type CampaignSegment } from "@/lib/marketing/campaigns";

export const maxDuration = 60; // delší rozesílky (pauzy mezi dávkami)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { data: campaign } = await supabaseAdmin.from("marketing_campaigns").select("*").eq("id", id).single();
  if (!campaign) return NextResponse.json({ error: "Kampaň nenalezena." }, { status: 404 });
  if (campaign.status === "sent") return NextResponse.json({ error: "Kampaň už byla odeslána." }, { status: 400 });

  const recipients = await resolveCampaignRecipients(
    campaign.segment as CampaignSegment,
    campaign.concept_slug
  );

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Segment nemá žádné příjemce se souhlasem." }, { status: 400 });
  }

  const { sent, error } = await sendCampaignBatch(
    recipients, campaign.subject, campaign.body_html, campaign.concept_slug
  );

  const status = sent > 0 ? "sent" : "failed";
  await supabaseAdmin.from("marketing_campaigns").update({
    status,
    recipients_count: recipients.length,
    sent_count: sent,
    error: error ?? null,
    sent_at: sent > 0 ? new Date().toISOString() : null,
  }).eq("id", id);

  // Log do system_alerts (stejný pattern jako jinde)
  try {
    await supabaseAdmin.from("system_alerts").insert({
      type: status === "sent" ? "marketing_campaign_sent" : "marketing_campaign_failed",
      ref_id: id,
      message: `Kampaň „${campaign.title}": odesláno ${sent}/${recipients.length}${error ? ` · ${error}` : ""}`,
    });
  } catch { /* best-effort */ }

  return NextResponse.json({ sent, recipients: recipients.length, error: error ?? null, status });
}
