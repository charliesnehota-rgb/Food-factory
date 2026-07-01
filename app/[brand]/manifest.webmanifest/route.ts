import { type NextRequest, NextResponse } from "next/server";
import { getBrand, brands } from "@/lib/brand/registry";

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(brands).map(brand => ({ brand }));
}

const EMOJI: Record<string, string> = {
  "dumply":     "🥟",
  "sunny-side": "🍳",
  "smash":      "🍔",
};
const SHORT: Record<string, string> = {
  "dumply":     "Dumply",
  "sunny-side": "Snídaně",
  "smash":      "L.T. Smash",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";

  const manifest = {
    name: b.name,
    short_name: SHORT[brand] ?? b.name,
    description: b.heroSub,
    start_url: `/${brand}?pwa=1`,
    scope: `/${brand}/`,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: b.bg,
    theme_color: b.accent,
    lang: "cs",
    icons: [
      { src: `${origin}/${brand}/icon/192`, sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: `${origin}/${brand}/icon/512`, sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
    screenshots: [],
    categories: ["food", "restaurants"],
    shortcuts: [
      {
        name: "Objednat",
        short_name: "Objednat",
        url: `/${brand}?pwa=1#menu`,
        icons: [{ src: `${origin}/${brand}/icon/96`, sizes: "96x96" }],
      },
    ],
    share_target: null,
    _emoji: EMOJI[brand],
  };

  return NextResponse.json(manifest, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=86400" },
  });
}
