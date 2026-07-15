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
    // Společný košík z appky = víc objednávek na jednu platbu (order_ids).
    const meta = obj.metadata ?? {};
    const ids: string[] = String(meta.order_ids ?? meta.order_id ?? "")
      .split(",").map((s: string) => s.trim()).filter(Boolean);
    const intentId = obj.payment_intent ?? obj.id;

    if (ids.length > 0 && supabaseAdmin) {
      // Idempotence: aktualizuj jen dosud nezaplacené objednávky.
      // Stripe retry webhoooku jinak vrátí "preparing" zpět na "accepted".
      await supabaseAdmin.from("orders").update({
        payment_status: "paid",
        stripe_intent_id: intentId,
        status: "accepted",
      }).in("id", ids).neq("payment_status", "paid");
    }
  }

  return NextResponse.json({ received: true });
}
