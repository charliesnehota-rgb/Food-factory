import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/db/supabase";
import { getUserFromRequest } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  if (!stripe || !supabaseAdmin) {
    return NextResponse.json({ error: "Platby nejsou nakonfigurovány" }, { status: 503 });
  }

  // Uživatel z Bearer tokenu (mobilní appka) nebo cookies (web).
  // Host (bez přihlášení) může platit kartou přes standardní Stripe Checkout.
  const user = await getUserFromRequest(req);

  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "Chybí orderId" }, { status: 400 });

    const { data: order, error } = await supabaseAdmin
      .from("orders").select("*, order_items(*)").eq("id", orderId).single();
    if (error || !order) return NextResponse.json({ error: "Objednávka nenalezena" }, { status: 404 });

    // Už zaplacená objednávka se nesmí platit znovu (dvojklik, refresh)
    if (order.payment_status === "paid") {
      return NextResponse.json({ paid: true, redirect: `/objednavka/${orderId}?paid=1` });
    }

    const totalAmount = Math.round(Number(order.total_czk) * 100);
    const origin = req.headers.get("origin") ?? "https://food-factory-zeta.vercel.app";

    // Rychlá platba uloženou kartou jen pro přihlášené zákazníky
    let customerId: string | undefined;
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from("user_profiles").select("stripe_customer_id, full_name").eq("id", user.id).single();
      customerId = profile?.stripe_customer_id;

      // Přihlášený bez Stripe zákazníka: založ ho, aby hostovaný checkout
      // kartu uložil (setup_future_usage) a příští platba šla na jeden klik.
      if (!customerId) {
        try {
          const customer = await stripe.customers.create({
            email: user.email, name: profile?.full_name ?? undefined,
            metadata: { user_id: user.id },
          });
          customerId = customer.id;
          await supabaseAdmin.from("user_profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
        } catch { /* checkout jede i bez zákazníka, jen se karta neuloží */ }
      }

      if (customerId) {
      // Zkus zaplatit uloženou kartou (jeden klik, off_session)
      const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
      if (methods.data.length > 0) {
        try {
          const intent = await stripe.paymentIntents.create({
            amount: totalAmount, currency: "czk",
            customer: customerId, payment_method: methods.data[0].id,
            off_session: true, confirm: true,
            metadata: { order_id: orderId },
          });
          if (intent.status === "succeeded") {
            await supabaseAdmin.from("orders").update({
              payment_status: "paid", stripe_intent_id: intent.id,
              status: "accepted", payment_provider: "stripe",
            }).eq("id", orderId);
            return NextResponse.json({ paid: true, redirect: `/objednavka/${orderId}?paid=1` });
          }
        } catch {
          // karta selhala (např. vyžaduje 3DS) → spadni na Checkout níže
        }
      }
      }
    }

    // Standardní Stripe Checkout (zadání karty)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems = (order.order_items as any[]).map((it) => ({
      price_data: { currency: "czk", product_data: { name: it.name }, unit_amount: Math.round(Number(it.unit_price_czk) * 100) },
      quantity: it.qty,
    }));
    if (Number(order.delivery_fee_czk) > 0) {
      lineItems.push({
        price_data: { currency: "czk", product_data: { name: "Doručení" }, unit_amount: Math.round(Number(order.delivery_fee_czk) * 100) },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Platnost platebního odkazu = okno auto-storna objednávky (30 min)
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      ...(customerId ? { customer: customerId } : {}),
      line_items: lineItems,
      success_url: `${origin}/objednavka/${orderId}?paid=1`,
      cancel_url: `${origin}/checkout?canceled=1`,
      metadata: { order_id: orderId },
      payment_intent_data: { metadata: { order_id: orderId }, setup_future_usage: "off_session" },
    });

    await supabaseAdmin.from("orders").update({ payment_provider: "stripe" }).eq("id", orderId);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
