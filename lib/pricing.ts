// Cenotvorba: hodinová křivka marže per koncept (den × hodina).
// margin_curve: {"1":{"7":-10,"8":-5,"12":15},"2":{...}, …} — den = JS getDay
// (0 = neděle … 6 = sobota), stejný klíč jako u opening-hours. Hodina = "0".."23".
// Kladné % = přirážka nad price_czk (základní/průměrná cena produktu), záporné
// = sleva pod ni. Chybějící den/hodina = 0 % (beze změny). Aktivní price_overrides
// (happy hour z marketing agenta apod.) mají vždy přednost — křivka se na ně neaplikuje.
import { nowInPrague } from "@/lib/opening-hours";

export type MarginCurve = Record<string, Record<string, number>>;

/** Aktuální % marže pro danou křivku (0, pokud pro den/hodinu nic není nastaveno). */
export function currentMarginPct(curve: MarginCurve | null | undefined, date = new Date()): number {
  if (!curve || typeof curve !== "object") return 0;
  const { day, hhmm } = nowInPrague(date);
  const hour = String(parseInt(hhmm.slice(0, 2), 10));
  const pct = curve[String(day)]?.[hour];
  return typeof pct === "number" && Number.isFinite(pct) ? pct : 0;
}

/**
 * Základní cena upravená o aktuální marži, zaokrouhlená na celé koruny.
 * Podlaha na 0 Kč — velká záporná marže nikdy nepošle cenu do mínusu.
 */
export function applyMarginCurve(basePriceCzk: number, curve: MarginCurve | null | undefined, date = new Date()): number {
  const pct = currentMarginPct(curve, date);
  if (pct === 0) return basePriceCzk;
  return Math.max(0, Math.round(basePriceCzk * (1 + pct / 100)));
}
