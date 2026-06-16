// Foodora / Delivery Hero (v ČR i Damejídlo) — marketplace + POS integrace.
//
// REÁLNÝ STAV: Order Transmission / Partner API přes Integration Middleware.
// Přístup je B2B: credentials se žádají v Partner Portalu po onboardingu,
// integrace typicky přes POS/middleware. Objednávky chodí webhookem
// (status RECEIVED ...), zabezpečené sdíleným secretem.
//
// Až budou klíče: FOODORA_API_KEY, FOODORA_WEBHOOK_SECRET.

import type {
  DeliveryProvider,
  DeliveryAddress,
  DeliveryQuote,
  CreateDeliveryInput,
  CreateDeliveryResult,
} from "./index";

export const foodora: DeliveryProvider = {
  name: "foodora",

  isConfigured() {
    return Boolean(process.env.FOODORA_API_KEY);
  },

  async getQuote(_dropoff: DeliveryAddress): Promise<DeliveryQuote> {
    // Foodora je primárně marketplace (rozvoz řeší oni). Pro vlastní web
    // se hodí spíš Wolt Drive; tady necháváme rozhraní pro příjem objednávek.
    return { provider: "foodora", available: false, feeCzk: 0, etaMinutes: 0, reason: "marketplace_only" };
  },

  async createDelivery(_input: CreateDeliveryInput): Promise<CreateDeliveryResult> {
    throw new Error("Foodora delivery is handled on their platform");
  },
};
