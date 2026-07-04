// PATCH  /api/admin/marketing/campaigns/[id] — úprava konceptu
// DELETE /api/admin/marketing/campaigns/[id] — smazání konceptu
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  if (body.title !== undefined) allowed.title = String(body.title).trim();
  if (body.subject !== undefined) allowed.subject = String(body.subject).trim();
  if (body.body_html !== undefined) allowed.body_html = String(body.body_html);
  if (body.segment !== undefined && ["all", "brand", "inactive_30"].includes(body.segment)) {
    allowed.segment = body.segment;
    allowed.concept_slug = body.segment === "brand" ? (body.concept_slug ?? null) : null;
  }

  // Odeslanou kampaň už neupravujeme
  const { data: existing } = await supabaseAdmin.from("marketing_campaigns").select("status").eq("id", id).single();
  if (existing?.status === "sent") {
    return NextResponse.json({ error: "Odeslanou kampaň nelze upravit." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("marketing_campaigns")
    .update(allowed).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("marketing_campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
