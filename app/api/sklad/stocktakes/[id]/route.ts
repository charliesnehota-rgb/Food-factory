import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

const ITEMS_SELECT = "*, stock_item:stock_items!stock_item_id(name, base_unit, current_qty, avg_price_czk)";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { data: take, error } = await supabaseAdmin.from("stocktakes").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: items } = await supabaseAdmin
    .from("stocktake_items").select(ITEMS_SELECT).eq("stocktake_id", id);
  // seřaď podle názvu suroviny
  const sorted = (items ?? []).sort((a, b) =>
    (a.stock_item?.name ?? "").localeCompare(b.stock_item?.name ?? "", "cs"));
  return NextResponse.json({ ...take, items: sorted });
}

// Uloží napočítané množství. Body: { counts: { [stocktake_item_id]: number|null } }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { data: take } = await supabaseAdmin.from("stocktakes").select("status").eq("id", id).single();
  if (!take) return NextResponse.json({ error: "Inventura nenalezena" }, { status: 404 });
  if (take.status === "closed") return NextResponse.json({ error: "Uzavřenou inventuru nelze měnit" }, { status: 409 });

  const body = await req.json();
  const counts: Record<string, unknown> = body.counts ?? {};
  for (const [itemId, val] of Object.entries(counts)) {
    const counted = val === null || val === undefined || val === "" ? null : Number(val);
    await supabaseAdmin.from("stocktake_items")
      .update({ counted_qty: counted })
      .eq("id", itemId).eq("stocktake_id", id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { data: take } = await supabaseAdmin.from("stocktakes").select("status").eq("id", id).single();
  if (take?.status === "closed") return NextResponse.json({ error: "Uzavřenou inventuru nelze smazat" }, { status: 409 });
  const { error } = await supabaseAdmin.from("stocktakes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
