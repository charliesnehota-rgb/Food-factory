// Wolt adaptér — Menu API + Venue API (developer.wolt.com).
// Menu-side integrace: náš admin je zdroj pravdy, ruční edity ve Wolt
// Merchant Adminu se vypnou. Push menu maže a nahrazuje celé menu venue.
//
// PŘÍSTUP: credentials vydá Wolt account manager (merchant nutný).
// Env: WOLT_API_TOKEN (Bearer). Po obdržení klíčů ověřit payloady na
// stagingu — schéma níže odpovídá dokumentaci Menu API v době psaní.
//
// Rate limity (per venue): menu/items 1×/15 min, inventory 1×/5 min —
// hlídá worker přes MIN_INTERVAL_MS, adaptér už jen volá.
import type { ChannelAdapter, ChannelConnection, NeutralMenu, NeutralMenuItem, AdapterResult } from "./index";

const BASE = process.env.WOLT_API_BASE ?? "https://pos-integration-service.wolt.com";

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.WOLT_API_TOKEN}`,
  };
}

async function call(method: string, path: string, body?: unknown): Promise<AdapterResult> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Wolt HTTP ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Síťová chyba" };
  }
}

/** Kč → minor units (haléře) dle formátu Wolt price */
const minor = (czk: number) => Math.round(czk * 100);

export const woltAdapter: ChannelAdapter = {
  channel: "wolt",

  isConfigured() {
    return Boolean(process.env.WOLT_API_TOKEN);
  },

  // POST /v1/restaurants/{venueId}/menu — nahradí celé menu (async na straně Wolt)
  async pushFullMenu(conn: ChannelConnection, menu: NeutralMenu) {
    if (!conn.external_venue_id) return { ok: false, error: "Chybí Wolt venue ID" };
    const payload = {
      currency: "CZK",
      primary_language: "cs",
      categories: menu.categories.map(cat => ({
        name: { cs: cat },
        items: menu.items.filter(i => i.category === cat).map(itemPayload),
      })),
    };
    return call("POST", `/v1/restaurants/${conn.external_venue_id}/menu`, payload);
  },

  // PATCH /venues/{venueId}/items — ceny a enabled stav položek
  async updateItems(conn: ChannelConnection, items: NeutralMenuItem[]) {
    if (!conn.external_venue_id) return { ok: false, error: "Chybí Wolt venue ID" };
    const payload = {
      data: items.map(i => ({
        external_id: i.id,
        price: minor(i.priceCzk),
        enabled: i.available,
      })),
    };
    return call("PATCH", `/venues/${conn.external_venue_id}/items`, payload);
  },

  // PATCH /venues/{venueId}/items/inventory — rychlé vyprodáno/skladem
  async updateInventory(conn: ChannelConnection, items: { id: string; available: boolean }[]) {
    if (!conn.external_venue_id) return { ok: false, error: "Chybí Wolt venue ID" };
    const payload = {
      data: items.map(i => ({ external_id: i.id, in_stock: i.available })),
    };
    return call("PATCH", `/venues/${conn.external_venue_id}/items/inventory`, payload);
  },

  // Otevírací doba menu — součást menu objektu; posíláme přes opening times endpoint
  async setHours(conn: ChannelConnection, hours: Record<string, { open: string; close: string; closed?: boolean }>) {
    if (!conn.external_venue_id) return { ok: false, error: "Chybí Wolt venue ID" };
    // Wolt: availability per den v týdnu (0=Ne … 6=So u nás → Wolt používá názvy dní)
    const DAY = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const availability = Object.entries(hours)
      .filter(([, h]) => h && !h.closed)
      .map(([dow, h]) => ({
        opening_day: DAY[Number(dow)],
        opening_time: h.open,
        closing_day: DAY[Number(dow)],
        closing_time: h.close,
      }));
    return call("PATCH", `/venues/${conn.external_venue_id}/opening-times`, { availability });
  },

  // POST /venues/{venueId}/online | /offline
  async setVenueStatus(conn: ChannelConnection, online: boolean) {
    if (!conn.external_venue_id) return { ok: false, error: "Chybí Wolt venue ID" };
    return call("POST", `/venues/${conn.external_venue_id}/${online ? "online" : "offline"}`, {});
  },
};

function itemPayload(i: NeutralMenuItem) {
  return {
    external_id: i.id,
    name: { cs: i.name },
    description: { cs: i.description },
    price: minor(i.priceCzk),
    enabled: i.available,
    ...(i.imageUrl ? { image_url: i.imageUrl } : {}),
    // Alergeny jdou na Woltu do popisu (platforma nemá strukturované pole pro CZ čísla)
    ...(i.allergens.length > 0
      ? { description: { cs: `${i.description}${i.description ? "\n" : ""}Alergeny: ${[...i.allergens].sort((a, b) => a - b).join(", ")}` } }
      : {}),
    options: i.options.length > 0
      ? [{
          name: { cs: "Přídavky" },
          type: "MultiChoice",
          values: i.options.map(o => ({
            external_id: o.id,
            name: { cs: o.name },
            price: minor(o.priceCzk),
            enabled: o.available,
          })),
        }]
      : [],
  };
}
