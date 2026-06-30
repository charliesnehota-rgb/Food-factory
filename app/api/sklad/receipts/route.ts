import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";
import { recalcReceiptTotals } from "@/lib/stock/receipts";

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json([]);
  const { data, error } = await supabaseAdmin
    .from("goods_receipts")
    .select("*, supplier:suppliers!supplier_id(name)")
    .order("received_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [];

  const { data: receipt, error } = await supabaseAdmin.from("goods_receipts").insert({
    supplier_id: body.supplier_id || null,
    supplier_invoice_no: body.supplier_invoice_no || null,
    received_at: body.received_at || new Date().toISOString().slice(0, 10),
    note: body.note || null,
    created_by: staff.email ?? staff.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (items.length > 0) {
    const rows = items.map((it: Record<string, unknown>) => ({
      receipt_id: receipt.id,
      stock_item_id: it.stock_item_id,
      qty: it.qty,
      unit_price_net_czk: it.unit_price_net_czk,
      vat_rate: it.vat_rate ?? 12,
      note: it.note ?? null,
    }));
    const { error: itErr } = await supabaseAdmin.from("goods_receipt_items").insert(rows);
    if (itErr) return NextResponse.json({ error: itErr.message }, { status: 500 });
    await recalcReceiptTotals(supabaseAdmin, receipt.id);
  }

  const { data: full } = await supabaseAdmin
    .from("goods_receipts").select("*").eq("id", receipt.id).single();
  return NextResponse.json(full ?? receipt, { status: 201 });
}
