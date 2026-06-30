import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";
import { recalcReceiptTotals } from "@/lib/stock/receipts";

// POST = "Naskladnit": z řádků příjemky vytvoří příjmové pohyby,
// trigger v DB zvedne stav a přepočítá vážený průměr. Idempotentní:
// jen z konceptu (draft) → posted.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;

  const { data: receipt } = await supabaseAdmin
    .from("goods_receipts").select("*").eq("id", id).single();
  if (!receipt) return NextResponse.json({ error: "Příjemka nenalezena" }, { status: 404 });
  if (receipt.status === "posted") {
    return NextResponse.json({ error: "Příjemka už je naskladněná" }, { status: 409 });
  }

  const { data: items } = await supabaseAdmin
    .from("goods_receipt_items").select("*").eq("receipt_id", id);
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Příjemka nemá žádné položky" }, { status: 400 });
  }

  // Pohyby (append-only). Trigger apply_stock_movement() upraví sklad.
  const movements = items.map((it) => ({
    stock_item_id: it.stock_item_id,
    type: "receipt",
    qty_change: Number(it.qty),
    unit_price_czk: Number(it.unit_price_net_czk),
    reason: "prijem",
    ref_type: "goods_receipt",
    ref_id: id,
    created_by: staff.email ?? staff.id,
  }));
  const { error: movErr } = await supabaseAdmin.from("stock_movements").insert(movements);
  if (movErr) return NextResponse.json({ error: movErr.message }, { status: 500 });

  await recalcReceiptTotals(supabaseAdmin, id);
  const { data: updated, error } = await supabaseAdmin
    .from("goods_receipts")
    .update({ status: "posted", posted_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, receipt: updated });
}
