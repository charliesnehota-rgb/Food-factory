// Wolt Drive webhook — aktualizace stavu rozvozu
// Wolt podepisuje webhooky HMAC-SHA256 (hlavička WOLT-SIGNATURE)
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/db/supabase";

function verifyWoltSignature(body: string, sig: string): boolean {
  const secret = process.env.WOLT_WEBHOOK_SECRET;
  if (!secret) return true; // přeskočit ověření bez klíče (dev)
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return expected === sig;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("wolt-signature") ?? "";

  if (!verifyWoltSignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    // event.type: 'delivery.courier_assigned' | 'delivery.picked_up' | 'delivery.delivered' ...
    const trackingId: string = event.tracking_id ?? event.id;
    const status: string     = event.status ?? event.type;

    const deliveryStatus: Record<string, string> = {
      "delivery.courier_assigned": "out_for_delivery",
      "delivery.picked_up":        "out_for_delivery",
      "delivery.delivered":        "delivered",
      "delivery.failed":           "cancelled",
    };

    const orderStatus = deliveryStatus[status];
    if (orderStatus && supabaseAdmin && trackingId) {
      await supabaseAdmin.from("orders").update({ status: orderStatus })
        .eq("delivery_tracking_id", trackingId);
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
