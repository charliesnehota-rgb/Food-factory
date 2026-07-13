// Alergeny dle nařízení EU 1169/2011 — povinné značení u jídel.
export const ALLERGENS: Record<number, string> = {
  1:  "Obiloviny obsahující lepek",
  2:  "Korýši",
  3:  "Vejce",
  4:  "Ryby",
  5:  "Arašídy",
  6:  "Sójové boby",
  7:  "Mléko",
  8:  "Skořápkové plody (ořechy)",
  9:  "Celer",
  10: "Hořčice",
  11: "Sezamová semena",
  12: "Oxid siřičitý a siřičitany",
  13: "Vlčí bob (lupina)",
  14: "Měkkýši",
};

/** "1, 3, 7" → "1 lepek · 3 vejce · 7 mléko" (krátké názvy pro detail) */
export const ALLERGEN_SHORT: Record<number, string> = {
  1: "lepek", 2: "korýši", 3: "vejce", 4: "ryby", 5: "arašídy",
  6: "sója", 7: "mléko", 8: "ořechy", 9: "celer", 10: "hořčice",
  11: "sezam", 12: "siřičitany", 13: "lupina", 14: "měkkýši",
};

export function formatAllergens(nums: number[] | undefined | null): string {
  if (!nums || nums.length === 0) return "";
  return [...nums].sort((a, b) => a - b)
    .map(n => `${n} ${ALLERGEN_SHORT[n] ?? ""}`.trim())
    .join(" · ");
}
