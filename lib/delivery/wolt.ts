// Wolt Drive — Wolt jako kurýr "na poslední míli" pro objednávky z našeho webu.
//
// REÁLNÝ STAV: API existuje, ale je gated. Staging credentials se získávají
// od lokálního Wolt Drive týmu (merchant onboarding). Webhooky jsou podepsané
// HMAC-SHA256 (hlavička WOLT-SIGNATURE) — podpis je nutné ověřovat.
//
// Až budou klíče: WOLT_DRIVE_API_KEY, WOLT_DRIVE_VENUE_ID, WOLT_WEBHOOK_SECRET.

import type {
  DeliveryProvider,
  DeliveryAddress,
  DeliveryQuote,
  CreateDeliveryInput,
  CreateDeliveryResult,
} from "./index";

export const woltDrive: DeliveryProvider = {
  name: "wolt",

  isConfigured() {
    return Boolean(process.env.WOLT_DRIVE_API_KEY && process.env.WOLT_DRIVE_VENUE_ID);
  },

  async getQuote(_dropoff: DeliveryAddress): Promise<DeliveryQuote> {
    if (!this.isConfigured()) {
      return { provider: "wolt", available: false, feeCzk: 0, etaMinutes: 0, reason: "not_configured" };
    }
    // TODO(fáze 3): POST na Wolt Drive shipment-promise endpoint -> cena + ETA.
    throw new Error("Wolt Drive getQuote not implemented yet");
  },

  async createDelivery(_input: CreateDeliveryInput): Promise<CreateDeliveryResult> {
    if (!this.isConfigured()) throw new Error("Wolt Drive not configured");
    // TODO(fáze 3): POST venueful delivery order -> trackingId.
    throw new Error("Wolt Drive createDelivery not implemented yet");
  },
};
