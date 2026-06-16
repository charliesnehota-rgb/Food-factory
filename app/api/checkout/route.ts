import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Platby nejsou nakonfigurovány" }, { status: 503 });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Chybí orderId" }, { status: 400 });
    }

    // Načti objednávku z DB (autoritativní ceny, ne z klienta)
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });
    }
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Objednávka nenalezena" }, { status: 404 });
    }

    const origin = req.headers.get("origin") ?? "https://food-factory-zeta.vercel.app";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems = (order.order_items as any[]).map((it) => ({
      price_data: {
        currency: "czk",
        product_data: { name: it.name },
        unit_amount: Math.round(Number(it.unit_price_czk) * 100), // haléře
      },
      quantity: it.qty,
    }));

    // Doručení jako samostatná položka
    if (Number(order.delivery_fee_czk) > 0) {
      lineItems.push({
        price_data: {
          currency: "czk",
          product_data: { name: "Doručení" },
          unit_amount: Math.round(Number(order.delivery_fee_czk) * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/objednavka/${orderId}?paid=1`,
      cancel_url: `${origin}/checkout?canceled=1`,
      metadata: { order_id: orderId },
      payment_intent_data: { metadata: { order_id: orderId } },
    });

    // Ulož session id k objednávce
    await supabaseAdmin.from("orders")
      .update({ payment_provider: "stripe" })
      .eq("id", orderId);

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
