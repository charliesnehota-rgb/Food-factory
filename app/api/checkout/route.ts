import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/db/supabase";
import { createSupabaseServer } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  if (!stripe || !supabaseAdmin) {
    return NextResponse.json({ error: "Platby nejsou nakonfigurovány" }, { status: 503 });
  }

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "Chybí orderId" }, { status: 400 });

    const { data: order, error } = await supabaseAdmin
      .from("orders").select("*, order_items(*)").eq("id", orderId).single();
    if (error || !order) return NextResponse.json({ error: "Objednávka nenalezena" }, { status: 404 });

    const totalAmount = Math.round(Number(order.total_czk) * 100);
    const origin = req.headers.get("origin") ?? "https://food-factory-zeta.vercel.app";

    // Má zákazník uloženou kartu?
    const { data: profile } = await supabaseAdmin
      .from("user_profiles").select("stripe_customer_id").eq("id", user.id).single();
    const customerId = profile?.stripe_customer_id;

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
