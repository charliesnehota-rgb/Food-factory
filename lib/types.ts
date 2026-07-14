// Datový model celé platformy. Odpovídá kolekcím ve Firestore (viz PROJECT.md).

export type Daypart = "breakfast" | "lunch" | "afternoon" | "dinner" | "all-day";

export interface MenuItem {
  id: string;
  conceptSlug: string;
  name: string;
  description: string;
  priceCzk: number;
  category: string;
  tags?: string[];
  imageUrl?: string;
  available: boolean;
  allergens?: number[]; // čísla 1–14 dle EU 1169/2011
  // EN mutace (fallback = české texty)
  nameEn?: string;
  descriptionEn?: string;
  categoryEn?: string;
}

// Přídavek k produktu (slanina, sýr…) — tabulka product_customizations
export interface ProductCustomization {
  id: string;
  productId: string;
  name: string;
  nameEn?: string;
  priceCzk: number;
  available: boolean;
  sortOrder: number;
}

export interface Concept {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  daypart: Daypart;
  accent: string; // hex barva pro akcent v UI
  emoji: string;
  menu: MenuItem[];
}

export type OrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type OrderChannel = "web" | "app" | "wolt" | "foodora" | "pos";
export type FulfilmentType = "delivery" | "pickup" | "dine_in";

export interface OrderItemCustomization {
  name: string;
  unitPriceCzk: number;
  qty: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPriceCzk: number;
  note?: string;
  customizations?: OrderItemCustomization[];
}

export interface Order {
  id: string;
  conceptSlug: string;
  channel: OrderChannel;
  fulfilment: FulfilmentType;
  status: OrderStatus;
  items: OrderItem[];
  totalCzk: number;
  customer: { name: string; phone?: string; address?: string };
  createdAt: string; // ISO 8601
  delivery?: { provider: "wolt" | "foodora" | "self"; trackingId?: string; eta?: string };
  payment?: { provider: "stripe"; status: "pending" | "paid" | "refunded"; intentId?: string };
}

export const DAYPART_LABEL: Record<Daypart, string> = {
  breakfast: "Snídaně",
  lunch: "Oběd",
  afternoon: "Odpoledne",
  dinner: "Večeře",
  "all-day": "Celý den",
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Nová",
  accepted: "Přijatá",
  preparing: "Připravuje se",
  ready: "Hotová",
  out_for_delivery: "Na cestě",
  delivered: "Doručená",
  cancelled: "Zrušená",
};

export function formatCzk(amount: number): string {
  return amount.toLocaleString("cs-CZ") + " Kč";
}
