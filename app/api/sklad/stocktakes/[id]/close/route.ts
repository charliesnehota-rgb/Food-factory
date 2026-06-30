import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

// Uzavření inventury: pro každou napočítanou položku se vezme aktuální
// účetní stav, spočítá rozdíl (counted − system) a — pokud není nulový —
// zapíše srovnávací pohyb type='stocktake'. Stav tím dojede na napočítané
// číslo. Vážený průměr se nemění (trigger ho u 'stocktake' nepřepočítává).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { data: take } = await supabaseAdmin.from("stocktakes").select("status").eq("id", id).single();
  if (!take) return NextResponse.json({ error: "Inventura nenalezena" }, { status: 404 });
  if (take.status === "closed") return NextResponse.json({ error: "Inventura už je uzavřená" }, { status: 409 });

  const { data: items } = await supabaseAdmin
    .from("stocktake_items")
    .select("id, stock_item_id, counted_qty, stock_items!stock_item_id(current_qty, avg_price_czk)")
    .eq("stocktake_id", id);

  let adjusted = 0;
  for (const it of items ?? []) {
    if (it.counted_qty === null || it.counted_qty === undefined) continue;
    // embed může přijít jako objekt nebo pole — ošetři obojí
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const si = Array.isArray((it as any).stock_items) ? (it as any).stock_items[0] : (it as any).stock_items;
    const system = Number(si?.current_qty ?? 0);
    const avg = Number(si?.avg_price_czk ?? 0);
    const counted = Number(it.counted_qty);
    const diff = counted - system;

    await supabaseAdmin.from("stocktake_items").update({
      system_qty: system, diff_qty: diff, unit_price_czk: avg,
    }).eq("id", it.id);

    if (diff !== 0) {
      await supabaseAdmin.from("stock_movements").insert({
        stock_item_id: it.stock_item_id,
        type: "stocktake",
        qty_change: diff,
        unit_price_czk: avg,
        reason: diff < 0 ? "manko" : "prebytek",
        ref_type: "stocktake",
        ref_id: id,
        created_by: staff.email ?? staff.id,
      });
      adjusted++;
    }
  }

  const { error } = await supabaseAdmin.from("stocktakes")
    .update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, adjusted });
}
