import type { SupabaseClient } from "@supabase/supabase-js";

function round2(n: number) { return Math.round(n * 100) / 100; }

// Přepočítá součty příjemky z jejích řádků (line_* dopočítává DB).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recalcReceiptTotals(db: SupabaseClient<any>, receiptId: string) {
  const { data: items } = await db
    .from("goods_receipt_items").select("line_net_czk, line_vat_czk").eq("receipt_id", receiptId);
  const net = (items ?? []).reduce((s, r) => s + Number(r.line_net_czk ?? 0), 0);
  const vat = (items ?? []).reduce((s, r) => s + Number(r.line_vat_czk ?? 0), 0);
  await db.from("goods_receipts").update({
    total_net_czk: round2(net),
    total_vat_czk: round2(vat),
    total_gross_czk: round2(net + vat),
  }).eq("id", receiptId);
}
