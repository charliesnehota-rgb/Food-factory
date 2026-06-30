import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json([]);
  const { data, error } = await supabaseAdmin
    .from("stocktakes").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// Vytvoří koncept inventury. Položky se vyberou podle kategorií
// (nebo všechny aktivní karty, když se kategorie neuvedou).
export async function POST(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json();
  const categoryIds: string[] = Array.isArray(body.category_ids) ? body.category_ids : [];

  let itemsQ = supabaseAdmin.from("stock_items").select("id").eq("is_active", true);
  if (categoryIds.length > 0) itemsQ = itemsQ.in("category_id", categoryIds);
  const { data: items } = await itemsQ;
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Žádné karty k inventuře (zkontroluj filtr)." }, { status: 400 });
  }

  const { data: take, error } = await supabaseAdmin.from("stocktakes").insert({
    note: body.note || null,
    created_by: staff.email ?? staff.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = items.map((it) => ({ stocktake_id: take.id, stock_item_id: it.id }));
  const { error: itErr } = await supabaseAdmin.from("stocktake_items").insert(rows);
  if (itErr) return NextResponse.json({ error: itErr.message }, { status: 500 });

  return NextResponse.json(take, { status: 201 });
}
