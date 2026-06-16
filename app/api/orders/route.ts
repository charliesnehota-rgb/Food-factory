// GET /api/orders — vrátí objednávky (s volitelným filtrem ?concept=slug)
// POST /api/orders — vytvoří novou objednávku (bez platby zatím)
import { NextRequest, NextResponse } from "next/server";
import { fetchOrders } from "@/lib/db/orders";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const concept = req.nextUrl.searchParams.get("concept") ?? undefined;
  const orders = await fetchOrders(concept);
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const { conceptSlug, channel, fulfilment, items, customer, note } = body;

    if (!conceptSlug || !channel || !fulfilment || !items?.length || !customer?.name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const subtotal = items.reduce((s: number, i: { unitPriceCzk: number; qty: number }) => s + i.unitPriceCzk * i.qty, 0);
    const deliveryFee = fulfilment === "delivery" ? 59 : 0; // TODO: Wolt Drive quote

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        concept_slug: conceptSlug, channel, fulfilment,
        customer_name: customer.name, customer_phone: customer.phone,
        customer_address: customer.address,
        subtotal_czk: subtotal, delivery_fee_czk: deliveryFee,
        total_czk: subtotal + deliveryFee,
        payment_status: "pending", note,
      })
      .select()
      .single();

    if (error || !order) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    }

    // Uložení položek
    await supabaseAdmin.from("order_items").insert(
      items.map((i: { productId: string; name: string; qty: number; unitPriceCzk: number; note?: string }) => ({
        order_id: order.id, product_id: i.productId || null,
        name: i.name, qty: i.qty, unit_price_czk: i.unitPriceCzk, note: i.note,
      }))
    );

    return NextResponse.json({ orderId: order.id, total: order.total_czk }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
