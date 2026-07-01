import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

// GET: seznam návrhů
export async function GET(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json([]);
  const status = new URL(req.url).searchParams.get("status") ?? "pending";
  const { data, error } = await supabaseAdmin
    .from("marketing_proposals")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH: schválit / zamítnout
export async function PATCH(req: NextRequest) {
  const me = await requireRole(["admin"]);
  if (!me) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });
  const { id, action, note, payload_override } = await req.json();
  if (!id || !["approve","reject"].includes(action)) return NextResponse.json({ error: "Chybí id nebo action." }, { status: 400 });

  const update: Record<string, unknown> = {
    status: action === "approve" ? "approved" : "rejected",
    reviewed_by: me.email ?? "admin",
    reviewed_at: new Date().toISOString(),
    review_note: note ?? null,
  };
  if (payload_override) update.payload = payload_override;

  const { error } = await supabaseAdmin.from("marketing_proposals").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
