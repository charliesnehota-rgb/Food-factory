// Abstrakce poskytovatele rozvozu.
// Aplikace pracuje JEN s tímto rozhraním — konkrétní poskytovatel (Wolt/Foodora)
// se doplní, až budou merchant klíče. Zbytek kódu se nemění.

export interface DeliveryAddress {
  street: string;
  city: string;
  zip: string;
  lat?: number;
  lng?: number;
}

export interface DeliveryQuote {
  provider: string;
  available: boolean;
  feeCzk: number;
  etaMinutes: number;
  reason?: string; // proč nedostupné (např. "not_configured")
}

export interface CreateDeliveryInput {
  orderId: string;
  dropoff: DeliveryAddress;
  customerName: string;
  customerPhone: string;
}

export interface CreateDeliveryResult {
  trackingId: string;
  etaMinutes: number;
}

export interface DeliveryProvider {
  readonly name: string;
  isConfigured(): boolean;
  getQuote(dropoff: DeliveryAddress): Promise<DeliveryQuote>;
  createDelivery(input: CreateDeliveryInput): Promise<CreateDeliveryResult>;
}

import { woltDrive } from "./wolt";
import { foodora } from "./foodora";

export const providers: DeliveryProvider[] = [woltDrive, foodora];

// Vrátí nabídky od všech (nakonfigurovaných i ne) — UI si vybere nejlevnější dostupnou.
export async function getDeliveryQuotes(dropoff: DeliveryAddress): Promise<DeliveryQuote[]> {
  return Promise.all(providers.map((p) => p.getQuote(dropoff)));
}
