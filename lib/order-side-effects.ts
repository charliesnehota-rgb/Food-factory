// Vedlejší efekty po změně stavu objednávky — skladový odečet a notifikace
// zákazníkovi (web push, Expo push, e-mail). Vytaženo z PATCH /api/orders/[id],
// aby kurýrní akce (vezmu / doručeno) prošly úplně stejnou logikou a obě cesty
// se nikdy nerozjely.
import { supabaseAdmin } from "@/lib/db/supabase";
import { sendExpoPushNotification, sendPushNotification, sendStatusEmail } from "@/lib/notifications";
import { consumeForOrder, reverseForOrder } from "@/lib/stock/consumption";
import type { OrderStatus } from "@/lib/types";

export async function applyStatusSideEffects(id: string, status: OrderStatus, by: string): Promise<void> {
  // Skladový odečet podle receptur (fáze 2). Best-effort — nikdy neblokuje
  // změnu stavu. Odečet při předání, vrácení při stornu; obojí idempotentní.
  if (supabaseAdmin) {
    try {
      if (status === "ready" || status === "delivered") {
        await consumeForOrder(supabaseAdmin, id, by);
      } else if (status === "cancelled") {
        await reverseForOrder(supabaseAdmin, id, by);
      }
    } catch (e) {
      // Sklad je best-effort — stav objednávky se změní tak jako tak,
      // ale selhání zalogujeme, aby se sklad tiše nerozjel od reality.
      try {
        await supabaseAdmin.from("system_alerts").insert({
          type: status === "cancelled" ? "reversal_failed" : "consumption_failed",
          ref_id: id,
          message: `Odpis skladu selhal při změně stavu na "${status}": ${String(e).slice(0, 300)}`,
        });
      } catch { /* alert log je poslední záchrana — když selže i ten, nic víc nezmůžeme */ }
    }
  }

  // Notifikace — await, jinak serverless funkci zmrazí dřív než se e-mail odešle
  if (supabaseAdmin) {
    try {
      // Najdi objednávku a zákazníka (vč. e-mailu hosta)
      const { data: order } = await supabaseAdmin
        .from("orders").select("*").eq("id", id).single();
      if (order) {
        let email: string | null = order.customer_email ?? null;
        let name: string = order.customer_name ?? "";

        if (order.user_id) {
          const { data: subs } = await supabaseAdmin
            .from("push_subscriptions").select("endpoint, p256dh, auth_key").eq("user_id", order.user_id);
          if (subs?.length) {
            await sendPushNotification(subs, id, status);
          }
          // Expo push do mobilní aplikace (tokeny registruje appka)
          const { data: expoTokens } = await supabaseAdmin
            .from("expo_push_tokens").select("token").eq("user_id", order.user_id);
          if (expoTokens?.length) {
            await sendExpoPushNotification(expoTokens.map((t) => t.token), id, status);
          }
          const { data: profile } = await supabaseAdmin
            .from("user_profiles").select("full_name").eq("id", order.user_id).single();
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
          email = authUser?.user?.email ?? email;
          name = profile?.full_name ?? name;
        }

        if (email) {
          await sendStatusEmail(email, name, id, status);
        }
      }
    } catch { /* notifikace jsou best-effort */ }
  }
}
