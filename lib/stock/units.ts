// Pomocné funkce pro jednotky skladu.
// Sklad držíme v základní jednotce: g / ml / ks (přesné pro receptury).
// Uživatel ale zadává lidsky (kg, l, ks) — tady jsou převody a formátování.

export type BaseUnit = "g" | "ml" | "ks";

export interface DisplayUnit {
  unit: string;   // co vidí uživatel: 'kg', 'g', 'l', 'ml', 'ks'
  factor: number; // kolik base jednotek je 1 display jednotka
}

// Jednotky, ve kterých lze zadávat příjem pro danou base jednotku.
export function displayUnitsFor(base: BaseUnit): DisplayUnit[] {
  switch (base) {
    case "g":
      return [
        { unit: "kg", factor: 1000 },
        { unit: "g", factor: 1 },
      ];
    case "ml":
      return [
        { unit: "l", factor: 1000 },
        { unit: "ml", factor: 1 },
      ];
    case "ks":
    default:
      return [{ unit: "ks", factor: 1 }];
  }
}

export function baseUnitLabel(base: BaseUnit): string {
  return base;
}

// Zadané množství (v display jednotce) → base jednotka pro uložení.
export function toBaseQty(inputQty: number, factor: number): number {
  return inputQty * factor;
}

// Cena za display jednotku → cena za base jednotku pro uložení.
export function toBaseUnitPrice(pricePerDisplay: number, factor: number): number {
  return pricePerDisplay / factor;
}

// Lidsky čitelné množství: 2500 g → "2,5 kg", 800 g → "800 g".
export function formatQty(baseQty: number, base: BaseUnit): string {
  const n = Number(baseQty) || 0;
  if (base === "ks") return `${trim(n)} ks`;
  const big = base === "g" ? "kg" : "l";
  if (Math.abs(n) >= 1000) return `${trim(n / 1000)} ${big}`;
  return `${trim(n)} ${base}`;
}

// Cena za "velkou" jednotku (kg / l / ks) pro hezké zobrazení nákladu.
export function pricePerBigUnit(pricePerBase: number, base: BaseUnit): { value: number; unit: string } {
  const p = Number(pricePerBase) || 0;
  if (base === "ks") return { value: p, unit: "ks" };
  return { value: p * 1000, unit: base === "g" ? "kg" : "l" };
}

function trim(n: number): string {
  // max 3 desetinná místa, bez zbytečných nul; čárka jako oddělovač
  return (Math.round(n * 1000) / 1000).toString().replace(".", ",");
}
