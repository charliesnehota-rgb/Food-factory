// GET  /api/admin/marketing/campaigns — seznam kampaní
// POST /api/admin/marketing/campaigns — nový koncept kampaně
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

export async function GET() {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json([]);

  const { data, error } = await supabaseAdmin
    .from("marketing_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json();
  const segment = ["all", "brand", "inactive_30"].includes(body.segment) ? body.segment : "all";

  if (!body.title?.trim() || !body.subject?.trim() || !body.body_html?.trim()) {
    return NextResponse.json({ error: "Chybí název, předmět nebo obsah." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("marketing_campaigns").insert({
    title: String(body.title).trim(),
    segment,
    concept_slug: segment === "brand" ? (body.concept_slug ?? null) : null,
    subject: String(body.subject).trim(),
    body_html: String(body.body_html),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
