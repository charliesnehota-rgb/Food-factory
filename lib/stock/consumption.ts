import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any>;

// Odečte suroviny podle receptur za celou objednávku. Idempotentní:
// pokud už spotřeba pro objednávku existuje, nic nedělá (ready→delivered
// neodečte dvakrát). Produkty bez receptury se přeskočí. Záporný stav
// neblokujeme — pohyb se zapíše a minus se jen zobrazí jako varování.
export async function consumeForOrder(db: DB, orderId: string, createdBy: string) {
  const { count } = await db.from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("ref_type", "order").eq("ref_id", orderId).eq("type", "consumption");
  if (count && count > 0) return { skipped: true };

  const { data: items } = await db.from("order_items")
    .select("product_id, qty").eq("order_id", orderId);
  const orderItems = (items ?? []).filter((i) => i.product_id);
  if (orderItems.length === 0) return { consumed: 0 };

  const productIds = [...new Set(orderItems.map((i) => i.product_id))];
  const { data: recipe } = await db.from("product_recipe_items")
    .select("product_id, stock_item_id, qty_per_portion").in("product_id", productIds);
  if (!recipe || recipe.length === 0) return { consumed: 0 };

  const stockIds = [...new Set(recipe.map((r) => r.stock_item_id))];
  const { data: stock } = await db.from("stock_items").select("id, avg_price_czk").in("id", stockIds);
  const avgById = new Map((stock ?? []).map((s) => [s.id, Number(s.avg_price_czk)]));

  // sečti spotřebu napříč položkami objednávky podle suroviny
  const consume = new Map<string, number>();
  for (const oi of orderItems) {
    for (const ln of recipe.filter((r) => r.product_id === oi.product_id)) {
      const add = Number(ln.qty_per_portion) * Number(oi.qty);
      consume.set(ln.stock_item_id, (consume.get(ln.stock_item_id) ?? 0) + add);
    }
  }

  const movements = [...consume.entries()].map(([sid, qty]) => ({
    stock_item_id: sid,
    type: "consumption",
    qty_change: -qty,
    unit_price_czk: avgById.get(sid) ?? null,
    reason: "spotreba",
    ref_type: "order",
    ref_id: orderId,
    created_by: createdBy,
  }));
  if (movements.length) await db.from("stock_movements").insert(movements);
  return { consumed: movements.length };
}

// Vrátí suroviny zpět při stornu už odečtené objednávky. Idempotentní.
export async function reverseForOrder(db: DB, orderId: string, createdBy: string) {
  const { count: consumed } = await db.from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("ref_type", "order").eq("ref_id", orderId).eq("type", "consumption");
  if (!consumed || consumed === 0) return { skipped: true };

  const { count: already } = await db.from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("ref_type", "order_reversal").eq("ref_id", orderId);
  if (already && already > 0) return { skipped: true };

  const { data: cons } = await db.from("stock_movements")
    .select("stock_item_id, qty_change, unit_price_czk")
    .eq("ref_type", "order").eq("ref_id", orderId).eq("type", "consumption");

  const movements = (cons ?? []).map((m) => ({
    stock_item_id: m.stock_item_id,
    type: "adjustment",                 // vrácení nemění vážený průměr, jen množství
    qty_change: -Number(m.qty_change),  // opačné znaménko = vrácení na sklad
    unit_price_czk: m.unit_price_czk,
    reason: "storno-vraceni",
    ref_type: "order_reversal",
    ref_id: orderId,
    created_by: createdBy,
  }));
  if (movements.length) await db.from("stock_movements").insert(movements);
  return { reversed: movements.length };
}
