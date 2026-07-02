import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  let event;
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // bez secret (dev) — parsuj bez ověření
      event = JSON.parse(rawBody);
    }
  } catch (e) {
    return NextResponse.json({ error: `Webhook signature failed: ${e}` }, { status: 400 });
  }

  // Platba dokončena
  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = (event.data as any).object;
    const orderId = obj.metadata?.order_id;
    const intentId = obj.payment_intent ?? obj.id;

    if (orderId && supabaseAdmin) {
      // Idempotence: aktualizuj jen dosud nezaplacenou objednávku.
      // Stripe retry webhoooku jinak vrátí "preparing" zpět na "accepted".
      await supabaseAdmin.from("orders").update({
        payment_status: "paid",
        stripe_intent_id: intentId,
        status: "accepted",
      }).eq("id", orderId).neq("payment_status", "paid");
    }
  }

  return NextResponse.json({ received: true });
}
