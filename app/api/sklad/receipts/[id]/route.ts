import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";
import { recalcReceiptTotals } from "@/lib/stock/receipts";

const ITEMS_SELECT = "*, stock_item:stock_items!stock_item_id(name, base_unit)";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { data: receipt, error } = await supabaseAdmin
    .from("goods_receipts").select("*, supplier:suppliers!supplier_id(name)").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: items } = await supabaseAdmin
    .from("goods_receipt_items").select(ITEMS_SELECT).eq("receipt_id", id).order("created_at");

  return NextResponse.json({ ...receipt, items: items ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  const { data: existing } = await supabaseAdmin
    .from("goods_receipts").select("status").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Příjemka nenalezena" }, { status: 404 });
  if (existing.status === "posted") {
    return NextResponse.json({ error: "Naskladněnou příjemku už nelze upravovat" }, { status: 409 });
  }

  const allowed: Record<string, unknown> = {};
  for (const key of ["supplier_id", "supplier_invoice_no", "received_at", "note"]) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }
  if (Object.keys(allowed).length > 0) {
    await supabaseAdmin.from("goods_receipts").update(allowed).eq("id", id);
  }

  // Volitelně přepiš celé řádky
  if (Array.isArray(body.items)) {
    await supabaseAdmin.from("goods_receipt_items").delete().eq("receipt_id", id);
    if (body.items.length > 0) {
      const rows = body.items.map((it: Record<string, unknown>) => ({
        receipt_id: id,
        stock_item_id: it.stock_item_id,
        qty: it.qty,
        unit_price_net_czk: it.unit_price_net_czk,
        vat_rate: it.vat_rate ?? 12,
        note: it.note ?? null,
      }));
      const { error: itErr } = await supabaseAdmin.from("goods_receipt_items").insert(rows);
      if (itErr) return NextResponse.json({ error: itErr.message }, { status: 500 });
    }
    await recalcReceiptTotals(supabaseAdmin, id);
  }

  const { data: receipt } = await supabaseAdmin.from("goods_receipts").select("*").eq("id", id).single();
  const { data: items } = await supabaseAdmin
    .from("goods_receipt_items").select(ITEMS_SELECT).eq("receipt_id", id).order("created_at");
  return NextResponse.json({ ...receipt, items: items ?? [] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { data: existing } = await supabaseAdmin
    .from("goods_receipts").select("status").eq("id", id).single();
  if (existing?.status === "posted") {
    return NextResponse.json({ error: "Naskladněnou příjemku nelze smazat (vytvoř opravný pohyb)" }, { status: 409 });
  }
  const { error } = await supabaseAdmin.from("goods_receipts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
