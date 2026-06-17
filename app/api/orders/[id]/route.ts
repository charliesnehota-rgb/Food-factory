import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/db/orders";
import { requireStaff } from "@/lib/auth/require-staff";
import { supabaseAdmin } from "@/lib/db/supabase";
import { sendPushNotification, sendStatusEmail } from "@/lib/notifications";
import type { OrderStatus } from "@/lib/types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });

  const { id } = await params;
  try {
    const { status } = await req.json();
    await updateOrderStatus(id, status as OrderStatus);

    // Spustí notifikace asynchronně (neblokuje odpověď)
    if (supabaseAdmin) {
      (async () => {
        try {
          // Najdi objednávku a zákazníka
          const { data: order } = await supabaseAdmin
            .from("orders").select("user_id, customer_name").eq("id", id).single();
          if (!order?.user_id) return;

          // Push subscriptions zákazníka
          const { data: subs } = await supabaseAdmin
            .from("push_subscriptions").select("endpoint, p256dh, auth_key").eq("user_id", order.user_id);

          if (subs?.length) {
            await sendPushNotification(subs, id, status as OrderStatus);
          }

          // E-mail zákazníka
          const { data: profile } = await supabaseAdmin
            .from("user_profiles").select("full_name").eq("id", order.user_id).single();
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
          const email = authUser?.user?.email;
          if (email) {
            await sendStatusEmail(email, profile?.full_name ?? order.customer_name, id, status as OrderStatus);
          }
        } catch { /* notifikace jsou best-effort */ }
      })();
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
