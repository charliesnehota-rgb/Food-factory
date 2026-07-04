// GET /api/admin/marketing/campaigns/count?segment=&concept_slug=
// Vrátí počet příjemců daného segmentu (pro potvrzení před odesláním).
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-staff";
import { resolveCampaignRecipients, type CampaignSegment } from "@/lib/marketing/campaigns";

export async function GET(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });

  const segment = (req.nextUrl.searchParams.get("segment") ?? "all") as CampaignSegment;
  const conceptSlug = req.nextUrl.searchParams.get("concept_slug");

  const recipients = await resolveCampaignRecipients(segment, conceptSlug);
  return NextResponse.json({ count: recipients.length });
}
