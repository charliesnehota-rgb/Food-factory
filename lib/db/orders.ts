// Dotazy na objednávky — Supabase nebo mock fallback.
import { supabaseAdmin } from "./supabase";
import { mockOrders } from "@/lib/orders";
import type { Order, OrderStatus } from "@/lib/types";

export async function fetchOrders(conceptSlug?: string): Promise<Order[]> {
  if (!supabaseAdmin) return conceptSlug ? mockOrders.filter(o => o.conceptSlug === conceptSlug) : mockOrders;
  let q = supabaseAdmin.from("orders").select("*, order_items(*, order_item_customizations(*))").order("created_at", { ascending: false }).limit(200);
  if (conceptSlug) q = q.eq("concept_slug", conceptSlug);
  const { data, error } = await q;
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => dbOrderToModel(row));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("orders").update({ status }).eq("id", orderId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbOrderToModel(row: any): Order {
  return {
    id: row.id, conceptSlug: row.concept_slug, channel: row.channel,
    fulfilment: row.fulfilment, status: row.status,
    items: (row.order_items ?? []).map((i: { product_id: string | null; name: string; qty: number; unit_price_czk: number; note: string | null; order_item_customizations?: { name: string; unit_price_czk: number; qty: number }[] }) => ({
      productId: i.product_id ?? "", name: i.name, qty: i.qty,
      unitPriceCzk: Number(i.unit_price_czk), note: i.note ?? undefined,
      customizations: (i.order_item_customizations ?? []).map(c => ({
        name: c.name, unitPriceCzk: Number(c.unit_price_czk), qty: c.qty,
      })),
    })),
    totalCzk: Number(row.total_czk),
    customer: { name: row.customer_name, phone: row.customer_phone ?? undefined, address: row.customer_address ?? undefined },
    createdAt: row.created_at,
    delivery: row.delivery_provider ? { provider: row.delivery_provider, trackingId: row.delivery_tracking_id ?? undefined } : undefined,
    payment: row.payment_provider ? { provider: row.payment_provider, status: row.payment_status, intentId: row.stripe_intent_id ?? undefined } : undefined,
  };
}

// Auto-storno opuštěných checkoutů: web/app objednávka bez potvrzené platby
// starší než 30 minut se stornuje (Stripe Checkout session má stejnou
// platnost, viz /api/checkout). Kdyby platba přece jen dorazila později,
// webhook objednávku vzkřísí na accepted+paid — zaplaceno vždy vyhrává.
const STALE_UNPAID_MINUTES = 30;

export async function cancelStaleUnpaidOrders(): Promise<number> {
  if (!supabaseAdmin) return 0;
  const cutoff = new Date(Date.now() - STALE_UNPAID_MINUTES * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("orders")
    .update({ status: "cancelled" })
    .eq("status", "new")
    .in("channel", ["web", "app"])
    .neq("payment_status", "paid")
    .lt("created_at", cutoff)
    .select("id");
  return data?.length ?? 0;
}
