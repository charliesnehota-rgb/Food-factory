// PATCH  /api/customizations/[id] — jen staff: úprava přídavku
// DELETE /api/customizations/[id] — jen staff: smazání přídavku
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  if (body.name !== undefined) allowed.name = String(body.name).trim();
  if (body.price_czk !== undefined) allowed.price_czk = Math.max(0, Number(body.price_czk) || 0);
  if (body.available !== undefined) allowed.available = !!body.available;
  if (body.sort_order !== undefined) allowed.sort_order = Number(body.sort_order) || 0;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Žádná pole k aktualizaci" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("product_customizations")
    .update(allowed).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("product_customizations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
