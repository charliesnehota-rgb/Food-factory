import type { Order } from "@/lib/types";

// Ukázkové objednávky pro demo adminu (fáze 1).
// Ve fázi 2 nahradí funkci dotaz do Firestore, např.:
//
//   import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
//   import { db } from "@/lib/firebase";
//   ... onSnapshot(query(collection(db, "orders"), orderBy("createdAt","desc")), ...)
//
// (real-time board bez refreshe).

export const mockOrders: Order[] = [
  {
    id: "FF-1042", conceptSlug: "smash", channel: "web", fulfilment: "delivery", status: "new",
    items: [ { productId: "smash-2", name: "Double smash", qty: 1, unitPriceCzk: 219 }, { productId: "smash-5", name: "Hranolky", qty: 1, unitPriceCzk: 59 } ],
    totalCzk: 278, customer: { name: "Petra N.", phone: "+420 777 123 456", address: "Korunní 12, Praha 2" },
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    delivery: { provider: "wolt" }, payment: { provider: "stripe", status: "paid" },
  },
  {
    id: "FF-1041", conceptSlug: "dumply", channel: "wolt", fulfilment: "delivery", status: "preparing",
    items: [ { productId: "dumply-1", name: "Pork dumplings (8 ks)", qty: 2, unitPriceCzk: 169 } ],
    totalCzk: 338, customer: { name: "Wolt zákazník" },
    createdAt: new Date(Date.now() - 9 * 60000).toISOString(),
    delivery: { provider: "wolt", trackingId: "W-88231" }, payment: { provider: "stripe", status: "paid" },
  },
  {
    id: "FF-1038", conceptSlug: "sunny-side", channel: "web", fulfilment: "delivery", status: "delivered",
    items: [ { productId: "sunny-side-1", name: "Avocado toast", qty: 2, unitPriceCzk: 159 }, { productId: "sunny-side-6", name: "Flat white", qty: 2, unitPriceCzk: 79 } ],
    totalCzk: 476, customer: { name: "Jana K.", address: "Belgická 5, Praha 2" },
    createdAt: new Date(Date.now() - 55 * 60000).toISOString(),
    delivery: { provider: "wolt", trackingId: "W-88190" }, payment: { provider: "stripe", status: "paid" },
  },
];

export function getOrders(): Order[] {
  return mockOrders;
}
