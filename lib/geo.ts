// Geokódování a základní "optimalizace" rozvozu. Záměrně jednoduché:
// jedna kuchyně, auta jezdí tam a zpět — takže žádný VRP solver, jen
// (a) čtvrť + souřadnice u každé objednávky (Nominatim/OpenStreetMap),
// (b) vzdušná vzdálenost (haversine) jako dostatečná aproximace ve městě,
// (c) návrh rozvážky = nejstarší objednávka + až 2 další poblíž,
// (d) pořadí zastávek = nearest-neighbor řetěz.
// Geokódování je všude best-effort: když selže, objednávka má null
// souřadnice, rozvoz funguje dál, jen bez štítku čtvrti a návrhů.

export interface GeoPoint { lat: number; lng: number }
export interface GeocodeResult extends GeoPoint { district: string | null }

// Adresa kuchyně = výchozí bod tras (doplněno Karlem 16. 7.). Geokóduje se
// jednou na instanci; kdyby Nominatim adresu nenašel, vše degraduje na
// chování bez kuchyně (trasa od nejstarší objednávky, bez vzdáleností).
const KITCHEN_ADDRESS: string | null = "Pod Hájem 12, Praha 5";

const NOMINATIM_HEADERS = {
  // Nominatim vyžaduje identifikující User-Agent (usage policy, max 1 req/s).
  "User-Agent": "FreeCity/1.0 (+https://food-factory-zeta.vercel.app)",
};

/**
 * Geokóduj adresu přes Nominatim, omezeno na Prahu a okolí (viewbox+bounded),
 * ať se "Korunní 10" netrefí do jiného města. Timeout 1800 ms — vytvoření
 * objednávky nesmí na geokódování čekat dlouho; co se nestihne, doplní se líně.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  if (!query?.trim()) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1800);
    const url = "https://nominatim.openstreetmap.org/search"
      + "?format=jsonv2&limit=1&countrycodes=cz&addressdetails=1"
      + "&viewbox=14.22,50.18,14.71,49.94&bounded=1"
      + `&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const arr = (await res.json()) as { lat: string; lon: string; address?: Record<string, string> }[];
    const hit = arr?.[0];
    if (!hit) return null;
    const a = hit.address ?? {};
    const district = a.suburb ?? a.city_district ?? a.quarter ?? a.neighbourhood ?? null;
    const lat = Number(hit.lat), lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, district };
  } catch {
    return null;
  }
}

// Souřadnice kuchyně se geokódují jednou na instanci a kešují.
let kitchenCache: GeoPoint | null | undefined;
export async function getKitchenCoords(): Promise<GeoPoint | null> {
  if (kitchenCache !== undefined) return kitchenCache;
  kitchenCache = KITCHEN_ADDRESS ? await geocodeAddress(KITCHEN_ADDRESS) : null;
  return kitchenCache;
}

/** Vzdušná vzdálenost v km. Ve městě dostatečná aproximace pro seskupování. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

interface HasGeo { delivery_lat: number | null; delivery_lng: number | null }
const coords = (o: HasGeo): GeoPoint | null =>
  o.delivery_lat != null && o.delivery_lng != null ? { lat: o.delivery_lat, lng: o.delivery_lng } : null;

/**
 * Seřaď zastávky nearest-neighbor řetězem: začni od `start` (kuchyně),
 * bez ní od první položky (nejstarší). Objednávky bez souřadnic zůstávají
 * na konci v původním pořadí.
 */
export function nnOrder<T extends HasGeo>(items: T[], start: GeoPoint | null): T[] {
  const withGeo = items.filter(o => coords(o));
  const without = items.filter(o => !coords(o));
  if (withGeo.length <= 1) return [...withGeo, ...without];

  const rest = [...withGeo];
  const out: T[] = [];
  let cur: GeoPoint | null = start;
  if (!cur) { const first = rest.shift()!; out.push(first); cur = coords(first)!; }
  while (rest.length) {
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < rest.length; i++) {
      const d = haversineKm(cur, coords(rest[i])!);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = rest.splice(bestIdx, 1)[0];
    out.push(next);
    cur = coords(next)!;
  }
  return [...out, ...without];
}

/**
 * Návrh rozvážky: nejstarší objednávka s polohou (jídlo chladne nejdéle)
 * + až (maxStops-1) dalších v okruhu radiusKm od ní, seřazené po trase.
 * Vrací null, když se nenajdou aspoň 2 objednávky pohromadě.
 */
export function suggestRun<T extends HasGeo & { id: string; delivery_district: string | null }>(
  pool: T[], kitchen: GeoPoint | null, maxStops = 3, radiusKm = 2.5,
): { ids: string[]; district: string | null } | null {
  const candidates = pool.filter(o => coords(o));
  if (candidates.length < 2) return null;
  const seed = candidates[0];
  const seedPt = coords(seed)!;
  const near = candidates.slice(1)
    .map(o => ({ o, d: haversineKm(seedPt, coords(o)!) }))
    .filter(x => x.d <= radiusKm)
    .sort((x, y) => x.d - y.d)
    .slice(0, maxStops - 1)
    .map(x => x.o);
  if (near.length === 0) return null;
  const run = nnOrder([seed, ...near], kitchen);
  return { ids: run.map(o => o.id), district: seed.delivery_district ?? null };
}
