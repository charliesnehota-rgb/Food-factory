import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

const ITEMS_SELECT = "*, stock_item:stock_items!stock_item_id(name, base_unit, current_qty, min_qty)";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { data: list, error } = await supabaseAdmin.from("shopping_lists").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: items } = await supabaseAdmin
    .from("shopping_list_items").select(ITEMS_SELECT).eq("list_id", id).order("created_at");
  const sorted = (items ?? []).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "cs"));
  return NextResponse.json({ ...list, items: sorted });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  if (body.note !== undefined) allowed.note = body.note;
  if (body.status !== undefined) {
    if (!["open", "purchased", "cancelled"].includes(body.status)) {
      return NextResponse.json({ error: "Neplatný stav" }, { status: 400 });
    }
    allowed.status = body.status;
    if (body.status === "purchased") allowed.purchased_at = new Date().toISOString();
  }
  if (Object.keys(allowed).length === 0) return NextResponse.json({ error: "Nic k aktualizaci" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("shopping_lists").update(allowed).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("shopping_lists").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
