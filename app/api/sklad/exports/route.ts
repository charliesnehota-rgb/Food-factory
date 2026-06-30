import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

// Účetní exporty (podklady pro DPH, spotřebu/ztráty a stav skladu).
// Vrací strukturovaný JSON; klient z něj sestaví CSV ke stažení.
export async function GET(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "vat";
  const from = sp.get("from") || "1970-01-01";
  const to = sp.get("to") || new Date().toISOString().slice(0, 10);
  const fromIso = `${from}T00:00:00`;
  const toIso = `${to}T23:59:59.999`;

  if (type === "vat") {
    // Podklad DPH na vstupu: řádky naskladněných příjemek v období, rozpad po sazbách.
    const { data: receipts } = await supabaseAdmin
      .from("goods_receipts")
      .select("id, receipt_number, received_at, supplier_invoice_no, supplier:suppliers!supplier_id(name)")
      .eq("status", "posted").gte("received_at", from).lte("received_at", to);

    const recById = new Map((receipts ?? []).map((r) => [r.id, r]));
    const ids = [...recById.keys()];
    let lines: Array<Record<string, unknown>> = [];
    if (ids.length > 0) {
      const { data: items } = await supabaseAdmin
        .from("goods_receipt_items")
        .select("receipt_id, qty, unit_price_net_czk, vat_rate, line_net_czk, line_vat_czk, stock_item:stock_items!stock_item_id(name, base_unit)")
        .in("receipt_id", ids);
      lines = (items ?? []).map((it) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r: any = recById.get(it.receipt_id as string);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const si: any = Array.isArray((it as any).stock_item) ? (it as any).stock_item[0] : (it as any).stock_item;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sup: any = Array.isArray(r?.supplier) ? r?.supplier[0] : r?.supplier;
        const net = Number(it.line_net_czk ?? 0);
        const vat = Number(it.line_vat_czk ?? 0);
        return {
          date: r?.received_at ?? "",
          receipt_number: r?.receipt_number ?? "",
          supplier: sup?.name ?? "",
          invoice_no: r?.supplier_invoice_no ?? "",
          item: si?.name ?? "",
          qty: Number(it.qty),
          unit: si?.base_unit ?? "",
          net, vat_rate: Number(it.vat_rate), vat, gross: net + vat,
        };
      });
    }
    // souhrn po sazbách
    const byRate = new Map<number, { vat_rate: number; base_net: number; vat: number; gross: number; count: number }>();
    for (const l of lines) {
      const rate = Number(l.vat_rate);
      const cur = byRate.get(rate) ?? { vat_rate: rate, base_net: 0, vat: 0, gross: 0, count: 0 };
      cur.base_net += Number(l.net); cur.vat += Number(l.vat); cur.gross += Number(l.gross); cur.count++;
      byRate.set(rate, cur);
    }
    const summary = [...byRate.values()].sort((a, b) => a.vat_rate - b.vat_rate)
      .map((s) => ({ ...s, base_net: round2(s.base_net), vat: round2(s.vat), gross: round2(s.gross) }));
    return NextResponse.json({ type, from, to, rows: lines, summary });
  }

  if (type === "movements") {
    // Spotřeba a ztráty v období (výdejové pohyby), oceněné.
    const { data: mv } = await supabaseAdmin
      .from("stock_movements")
      .select("created_at, type, qty_change, unit_price_czk, reason, stock_item:stock_items!stock_item_id(name, base_unit, category:stock_categories!category_id(name))")
      .in("type", ["consumption", "write_off", "stocktake"])
      .gte("created_at", fromIso).lte("created_at", toIso)
      .order("created_at", { ascending: true });
    const rows = (mv ?? []).map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const si: any = Array.isArray((m as any).stock_item) ? (m as any).stock_item[0] : (m as any).stock_item;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat: any = si ? (Array.isArray(si.category) ? si.category[0] : si.category) : null;
      const price = Number(m.unit_price_czk ?? 0);
      const qty = Number(m.qty_change);
      return {
        date: m.created_at, type: m.type, item: si?.name ?? "", category: cat?.name ?? "",
        qty_change: qty, unit: si?.base_unit ?? "", unit_price: price, value: round2(qty * price), reason: m.reason ?? "",
      };
    });
    return NextResponse.json({ type, from, to, rows });
  }

  if (type === "stock") {
    // Stav skladu k dnešku (aktuální ocenění váženým průměrem).
    const { data: items } = await supabaseAdmin
      .from("stock_items")
      .select("sku, name, base_unit, current_qty, avg_price_czk, category:stock_categories!category_id(name, vat_rate)")
      .eq("is_active", true).order("name");
    let total = 0;
    const rows = (items ?? []).map((it) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat: any = Array.isArray((it as any).category) ? (it as any).category[0] : (it as any).category;
      const value = Number(it.current_qty) * Number(it.avg_price_czk);
      total += value;
      return {
        sku: it.sku ?? "", item: it.name, category: cat?.name ?? "", unit: it.base_unit,
        qty: Number(it.current_qty), avg_price: Number(it.avg_price_czk), value: round2(value),
        vat_rate: cat ? Number(cat.vat_rate) : null,
      };
    });
    return NextResponse.json({ type, as_of: new Date().toISOString().slice(0, 10), rows, total_value: round2(total) });
  }

  return NextResponse.json({ error: "Neznámý typ exportu" }, { status: 400 });
}

function round2(n: number) { return Math.round(n * 100) / 100; }
