// foodora / Delivery Hero adaptér — Partner API (developer.foodora.com).
// V ČR běží pod Damejídlo/foodora; centralizovaná kuchyně s více brandy
// je v jejich dokumentaci podporovaný scénář (individuální import per brand).
//
// PŘÍSTUP: partner onboarding + NDA; client_id/secret vydá account manager,
// token přes OAuth (platnost 2 h, platí pro celý chain). Vendor code per
// brand jde do channel_connections.external_venue_id, chain_code do config.
//
// Env: FOODORA_CLIENT_ID, FOODORA_CLIENT_SECRET.
// Po obdržení klíčů ověřit přesná schémata katalogu na stagingu —
// níže implementováno dle Partner API dokumentace v době psaní.
import type { ChannelAdapter, ChannelConnection, NeutralMenu, NeutralMenuItem, AdapterResult } from "./index";

const BASE = process.env.FOODORA_API_BASE ?? "https://foodora.partner.deliveryhero.io";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  try {
    const res = await fetch(`${BASE}/v2/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.FOODORA_CLIENT_ID ?? "",
        client_secret: process.env.FOODORA_CLIENT_SECRET ?? "",
      }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    tokenCache = { token: d.access_token, expiresAt: Date.now() + (Number(d.expires_in ?? 7200) * 1000) };
    return tokenCache.token;
  } catch {
    return null;
  }
}

async function call(method: string, path: string, body?: unknown): Promise<AdapterResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: "foodora OAuth selhal (zkontroluj client_id/secret)" };
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => "");
    return { ok: false, error: `foodora HTTP ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Síťová chyba" };
  }
}

export const foodoraAdapter: ChannelAdapter = {
  channel: "foodora",

  isConfigured() {
    return Boolean(process.env.FOODORA_CLIENT_ID && process.env.FOODORA_CLIENT_SECRET);
  },

  // Katalog import per vendor (brand) — celé menu
  async pushFullMenu(conn: ChannelConnection, menu: NeutralMenu) {
    if (!conn.external_venue_id) return { ok: false, error: "Chybí foodora vendor code" };
    const payload = {
      vendor_code: conn.external_venue_id,
      catalog: {
        categories: menu.categories.map(cat => ({
          name: cat,
          products: menu.items.filter(i => i.category === cat).map(itemPayload),
        })),
      },
    };
    return call("PUT", `/v2/vendors/${conn.external_venue_id}/catalog`, payload);
  },

  // Hromadná změna ceny/stavu položek (Assortment)
  async updateItems(conn: ChannelConnection, items: NeutralMenuItem[]) {
    if (!conn.external_venue_id) return { ok: false, error: "Chybí foodora vendor code" };
    const payload = items.map(i => ({
      sku: i.id,
      price: i.priceCzk,
      active: i.available,
    }));
    return call("PUT", `/v2/vendors/${conn.external_venue_id}/items`, payload);
  },

  async updateInventory(conn: ChannelConnection, items: { id: string; available: boolean }[]) {
    if (!conn.external_venue_id) return { ok: false, error: "Chybí foodora vendor code" };
    const payload = items.map(i => ({ sku: i.id, active: i.available }));
    return call("PUT", `/v2/vendors/${conn.external_venue_id}/items`, payload);
  },

  // Otevírací dobu spravuje foodora přes Vendor Portal / store management;
  // přes API řešíme aspoň online/offline stav provozovny.
  async setHours() {
    return { ok: false, error: "foodora: hodiny se nastavují ve Vendor Portalu — sync přeskočen" };
  },

  async setVenueStatus(conn: ChannelConnection, online: boolean) {
    if (!conn.external_venue_id) return { ok: false, error: "Chybí foodora vendor code" };
    return call("PUT", `/v2/vendors/${conn.external_venue_id}/availability`, {
      status: online ? "OPEN" : "CLOSED",
    });
  },
};

function itemPayload(i: NeutralMenuItem) {
  return {
    sku: i.id,
    name: i.name,
    description: i.allergens.length > 0
      ? `${i.description}${i.description ? "\n" : ""}Alergeny: ${[...i.allergens].sort((a, b) => a - b).join(", ")}`
      : i.description,
    price: i.priceCzk,
    active: i.available,
    ...(i.imageUrl ? { image_url: i.imageUrl } : {}),
    toppings: i.options.length > 0
      ? [{
          name: "Přídavky",
          type: "multiple",
          options: i.options.map(o => ({
            sku: o.id, name: o.name, price: o.priceCzk, active: o.available,
          })),
        }]
      : [],
  };
}
