// GET /api/address-suggest?q=… — našeptávač doručovacích adres.
// Proxy na Photon (photon.komoot.io, OSM data — česká adresní místa v OSM
// pocházejí z RÚIAN, takže pokrytí Prahy je prakticky úplné). Omezeno na
// bbox Prahy a okolí, normalizovaný výstup včetně souřadnic — když si
// zákazník/obsluha adresu VYBERE, objednávka dostane přesnou polohu rovnou
// a Nominatim geokódování se přeskočí. Photon je zdarma bez klíče (fair
// use); kdyby kvalita nestačila, vyměníme tady uvnitř za Mapy.cz API,
// klienti se nemění. Nominatim se na našeptávání použít nesmí (usage
// policy autosuggest výslovně zakazuje), proto Photon.
import { NextRequest, NextResponse } from "next/server";

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string; street?: string; housenumber?: string;
    postcode?: string; city?: string; district?: string; suburb?: string;
    osm_key?: string; osm_value?: string;
  };
}

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  district: string | null;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const url = "https://photon.komoot.io/api/"
      + `?q=${encodeURIComponent(q)}`
      + "&limit=8&lang=default"
      + "&bbox=14.22,49.94,14.71,50.18"; // Praha a těsné okolí
    const res = await fetch(url, {
      headers: { "User-Agent": "FreeCity/1.0 (+https://food-factory-zeta.vercel.app)" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return NextResponse.json({ suggestions: [] });

    const data = (await res.json()) as { features?: PhotonFeature[] };
    const out: AddressSuggestion[] = [];
    const seen = new Set<string>();

    for (const f of data.features ?? []) {
      const p = f.properties ?? {};
      const [lng, lat] = f.geometry?.coordinates ?? [];
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      // Jen skutečné adresy (ulice + číslo), ne POI/oblasti — cílem je
      // doručitelná adresa, ne "Praha 5" nebo název podniku.
      const street = p.street ?? (p.osm_key === "highway" ? p.name : undefined);
      const houseno = p.housenumber;
      if (!street || !houseno) continue;

      const district = p.district ?? p.suburb ?? null;
      const cityPart = [p.postcode, district ?? p.city].filter(Boolean).join(" ");
      const label = `${street} ${houseno}${cityPart ? `, ${cityPart}` : ""}`;
      if (seen.has(label)) continue;
      seen.add(label);
      out.push({ label, lat, lng, district });
      if (out.length >= 6) break;
    }

    return NextResponse.json(
      { suggestions: out },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
