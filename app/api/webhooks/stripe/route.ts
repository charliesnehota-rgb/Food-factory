// Stripe webhook — potvrzení platby → objednávka = paid
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  // TODO fáze 2: ověřit Stripe podpis (STRIPE_WEBHOOK_SECRET)
  // import Stripe from "stripe";
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // const sig = req.headers.get("stripe-signature")!;
  // const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);

  try {
    const event = await req.json();

    if (event.type === "payment_intent.succeeded") {
      const intentId: string = event.data.object.id;
      const orderId: string  = event.data.object.metadata?.order_id;

      if (orderId && supabaseAdmin) {
        await supabaseAdmin.from("orders").update({
          payment_status: "paid",
          stripe_intent_id: intentId,
          status: "accepted",
        }).eq("id", orderId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
