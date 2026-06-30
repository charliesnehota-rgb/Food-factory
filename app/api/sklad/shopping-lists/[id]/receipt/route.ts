import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";
import { recalcReceiptTotals } from "@/lib/stock/receipts";

// Z nákupního seznamu založí KONCEPT příjemky z položek se skladovou kartou.
// Množství = skutečně koupené (nebo objednané), cena = poslední nákupní (doplníš).
// Seznam označí jako 'purchased'. Ceny se finalizují v příjmu / přes účtenku.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;

  const { data: items } = await supabaseAdmin
    .from("shopping_list_items").select("stock_item_id, order_qty, purchased_qty").eq("list_id", id);
  const cardItems = (items ?? []).filter((i) => i.stock_item_id);
  if (cardItems.length === 0) {
    return NextResponse.json({ error: "Žádné položky se skladovou kartou." }, { status: 400 });
  }

  // poslední nákupní ceny + DPH z kategorií
  const ids = cardItems.map((i) => i.stock_item_id);
  const { data: cards } = await supabaseAdmin
    .from("stock_items")
    .select("id, last_purchase_price_czk, category:stock_categories!category_id(vat_rate)")
    .in("id", ids);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId = new Map((cards ?? []).map((c: any) => [c.id, c]));

  const { data: receipt, error } = await supabaseAdmin.from("goods_receipts").insert({
    note: `Z nákupního seznamu`,
    created_by: staff.email ?? staff.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = cardItems.map((i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = byId.get(i.stock_item_id);
    const cat = c ? (Array.isArray(c.category) ? c.category[0] : c.category) : null;
    const qty = Number(i.purchased_qty ?? i.order_qty ?? 0);
    return {
      receipt_id: receipt.id,
      stock_item_id: i.stock_item_id,
      qty: qty > 0 ? qty : 1,
      unit_price_net_czk: c?.last_purchase_price_czk != null ? Number(c.last_purchase_price_czk) : 0,
      vat_rate: cat ? Number(cat.vat_rate) : 12,
    };
  });
  const { error: itErr } = await supabaseAdmin.from("goods_receipt_items").insert(rows);
  if (itErr) return NextResponse.json({ error: itErr.message }, { status: 500 });

  await recalcReceiptTotals(supabaseAdmin, receipt.id);
  await supabaseAdmin.from("shopping_lists")
    .update({ status: "purchased", purchased_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json({ ok: true, receipt_id: receipt.id });
}
