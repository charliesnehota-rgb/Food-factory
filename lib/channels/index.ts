// ═══════════════════════════════════════════════════════════
// CHANNEL MANAGER — jádro
// Admin (Supabase) je jediný zdroj pravdy. Změny cen, fotek, popisků,
// dostupnosti a hodin se zapisují do channel_sync_queue a worker je
// s debouncingem posílá na Wolt / foodoru (viz lib/channels/worker.ts).
// ═══════════════════════════════════════════════════════════
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

export type Channel = "wolt" | "foodora";
export type SyncEventType = "menu_full" | "item_update" | "inventory" | "hours" | "venue_status";

export interface ChannelConnection {
  id: string;
  channel: Channel;
  concept_slug: string;
  external_venue_id: string | null;
  enabled: boolean;
  price_multiplier: number;
  config: Record<string, unknown>;
}

// Neutrální reprezentace menu — adaptéry si ji přeloží do formátu platformy
export interface NeutralMenuItem {
  id: string;               // naše product_id (= external SKU na platformách)
  name: string;
  description: string;
  priceCzk: number;          // už po aplikaci price_multiplier
  imageUrl: string | null;
  available: boolean;
  category: string;
  allergens: number[];
  options: { id: string; name: string; priceCzk: number; available: boolean }[];
}

export interface NeutralMenu {
  conceptSlug: string;
  items: NeutralMenuItem[];
  categories: string[];
}

export interface AdapterResult { ok: boolean; error?: string; }

// Adaptér kanálu — implementují wolt.ts a foodora.ts
export interface ChannelAdapter {
  channel: Channel;
  /** Jsou k dispozici API klíče (env)? Bez nich se sync jen frontuje jako 'skipped'. */
  isConfigured(): boolean;
  pushFullMenu(conn: ChannelConnection, menu: NeutralMenu): Promise<AdapterResult>;
  updateItems(conn: ChannelConnection, items: NeutralMenuItem[]): Promise<AdapterResult>;
  updateInventory(conn: ChannelConnection, items: { id: string; available: boolean }[]): Promise<AdapterResult>;
  setHours(conn: ChannelConnection, hours: Record<string, { open: string; close: string; closed?: boolean }>): Promise<AdapterResult>;
  setVenueStatus(conn: ChannelConnection, online: boolean): Promise<AdapterResult>;
}

// Minimální rozestup mezi voláními stejného typu na stejné venue (ms).
// Wolt: menu/items 1×/15 min, inventory 1×/5 min. foodora: konzervativně 5 min.
export const MIN_INTERVAL_MS: Record<Channel, Record<SyncEventType, number>> = {
  wolt: {
    menu_full: 15 * 60_000,
    item_update: 15 * 60_000,
    inventory: 5 * 60_000,
    hours: 15 * 60_000,
    venue_status: 60_000,
  },
  foodora: {
    menu_full: 5 * 60_000,
    item_update: 5 * 60_000,
    inventory: 5 * 60_000,
    hours: 5 * 60_000,
    venue_status: 60_000,
  },
};

/**
 * Zapíše sync událost do fronty pro všechny ZAPNUTÉ kanály konceptu.
 * Koalescence: jeden pending záznam per (channel, concept, event) —
 * další změny se slévají (productIds se sjednotí). Best-effort:
 * selhání enqueue nikdy nesmí shodit admin akci.
 */
export async function enqueueChannelSync(
  conceptSlug: string,
  eventType: SyncEventType,
  payload: Record<string, unknown> = {}
): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    const { data: conns } = await supabaseAdmin
      .from("channel_connections")
      .select("channel")
      .eq("concept_slug", conceptSlug)
      .eq("enabled", true);

    for (const c of conns ?? []) {
      const dedupeKey = `${c.channel}:${conceptSlug}:${eventType}`;
      const { data: existing } = await supabaseAdmin
        .from("channel_sync_queue")
        .select("id, payload")
        .eq("dedupe_key", dedupeKey)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        // Sjednoť productIds; ostatní pole přepiš novějšími
        const oldIds: string[] = Array.isArray(existing.payload?.productIds) ? existing.payload.productIds : [];
        const newIds: string[] = Array.isArray(payload.productIds) ? (payload.productIds as string[]) : [];
        const merged = {
          ...existing.payload,
          ...payload,
          ...(oldIds.length || newIds.length ? { productIds: [...new Set([...oldIds, ...newIds])] } : {}),
        };
        await supabaseAdmin.from("channel_sync_queue")
          .update({ payload: merged })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("channel_sync_queue").insert({
          channel: c.channel,
          concept_slug: conceptSlug,
          event_type: eventType,
          payload,
          dedupe_key: dedupeKey,
        });
      }
    }
    // Okamžité zpracování po odeslání odpovědi (Hobby plán nemá 5min cron;
    // denní cron slouží jen jako pojistka pro odložené položky).
    scheduleImmediateProcessing();
  } catch {
    /* channel sync nesmí rozbít admin akci */
  }
}

function scheduleImmediateProcessing() {
  try {
    after(async () => {
      const { processChannelQueue } = await import("./worker");
      await processChannelQueue();
    });
  } catch {
    /* mimo request scope (např. skript) — vezme to denní cron nebo admin tlačítko */
  }
}

/** Postaví neutrální menu konceptu s cenami po aplikaci koeficientu kanálu. */
export async function buildMenuForConcept(
  conceptSlug: string,
  priceMultiplier: number
): Promise<NeutralMenu> {
  if (!supabaseAdmin) return { conceptSlug, items: [], categories: [] };

  const [{ data: products }, { data: customizations }] = await Promise.all([
    supabaseAdmin.from("products")
      .select("id, name, description, price_czk, category, image_url, available, allergens, sort_order")
      .eq("concept_slug", conceptSlug)
      .order("sort_order"),
    supabaseAdmin.from("product_customizations")
      .select("id, product_id, name, price_czk, available, sort_order")
      .order("sort_order"),
  ]);

  const custByProduct = new Map<string, NonNullable<typeof customizations>>();
  for (const c of customizations ?? []) {
    const list = custByProduct.get(c.product_id) ?? [];
    list.push(c);
    custByProduct.set(c.product_id, list);
  }

  const applyMult = (czk: number) => Math.round(czk * priceMultiplier);

  const items: NeutralMenuItem[] = (products ?? []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    priceCzk: applyMult(Number(p.price_czk)),
    imageUrl: p.image_url ?? null,
    available: !!p.available,
    category: p.category ?? "Menu",
    allergens: Array.isArray(p.allergens) ? p.allergens : [],
    options: (custByProduct.get(p.id) ?? []).map(c => ({
      id: c.id,
      name: c.name,
      priceCzk: applyMult(Number(c.price_czk)),
      available: !!c.available,
    })),
  }));

  return {
    conceptSlug,
    items,
    categories: [...new Set(items.map(i => i.category))],
  };
}
