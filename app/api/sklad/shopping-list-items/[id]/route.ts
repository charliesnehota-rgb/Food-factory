import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  if (body.order_qty !== undefined) allowed.order_qty = body.order_qty === "" || body.order_qty == null ? null : Number(body.order_qty);
  if (body.purchased !== undefined) allowed.purchased = !!body.purchased;
  if (body.purchased_qty !== undefined) allowed.purchased_qty = body.purchased_qty === "" || body.purchased_qty == null ? null : Number(body.purchased_qty);
  if (body.note !== undefined) allowed.note = body.note;
  if (Object.keys(allowed).length === 0) return NextResponse.json({ error: "Nic k aktualizaci" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("shopping_list_items").update(allowed).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("shopping_list_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
