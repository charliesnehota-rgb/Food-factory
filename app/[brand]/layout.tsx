import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getBrand, brandStyle, brands } from "@/lib/brand/registry";
import { BrandSetter } from "@/components/brand/BrandSetter";
import { PWAInit } from "@/components/pwa/pwa-init";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(brands).map((brand) => ({ brand }));
}

const APPLE_SPLASH: Record<string, { w: number; h: number; scale: number }[]> = {
  "any": [
    { w: 1290, h: 2796, scale: 3 }, // iPhone 15 Pro Max
    { w: 1179, h: 2556, scale: 3 }, // iPhone 15 Pro
    { w: 1170, h: 2532, scale: 3 }, // iPhone 14
    { w: 828,  h: 1792, scale: 2 }, // iPhone 11
    { w: 1488, h: 2266, scale: 2 }, // iPad Mini
  ],
};

export async function generateMetadata(
  { params }: { params: Promise<{ brand: string }> }
): Promise<Metadata> {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) return {};

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";

  return {
    title: `${b.name} — ${b.eyebrow}`,
    description: b.heroSub,
    manifest: `/${brand}/manifest.webmanifest`,
    // Skrytý režim: na sdílené doméně (vercel.app apod.) se brand weby
    // neindexují — restaurace se Googlu ukážou až na vlastních doménách.
    robots: (await isOwnDomain(brand)) ? undefined : { index: false, follow: false },
    openGraph: {
      title: b.name,
      description: b.heroSub,
      type: "website",
      locale: "cs_CZ",
    },
    appleWebApp: {
      capable: true,
      title: b.name,
      statusBarStyle: "black-translucent",
      startupImage: APPLE_SPLASH.any.map(s => ({
        url: `${origin}/${brand}/icon/512`,
        media: `(device-width: ${Math.round(s.w / s.scale)}px) and (device-height: ${Math.round(s.h / s.scale)}px) and (-webkit-device-pixel-ratio: ${s.scale})`,
      })),
    },
    icons: {
      icon:  [
        { url: `/${brand}/icon/192`, sizes: "192x192", type: "image/png" },
        { url: `/${brand}/icon/512`, sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: `/${brand}/icon/192`, sizes: "192x192" },
        { url: `/${brand}/icon/512`, sizes: "512x512" },
      ],
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-title": b.name,
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      "msapplication-TileColor": b.accent,
      "msapplication-TileImage": `/${brand}/icon/192`,
    },
  };
}

export async function generateViewport(
  { params }: { params: Promise<{ brand: string }> }
): Promise<Viewport> {
  const { brand } = await params;
  const b = getBrand(brand);
  return b ? { themeColor: b.accent } : {};
}

export default async function BrandLayout({
  children, params,
}: {
  children: ReactNode;
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) notFound();

  return (
    <div style={brandStyle(b)} className="min-h-screen flex flex-col">
      <BrandSetter brand={b} />
      <PWAInit />
      {children}
    </div>
  );
}

// Je aktuální host vlastní doménou tohoto brandu (dle BRAND_DOMAINS)?
async function isOwnDomain(slug: string): Promise<boolean> {
  try {
    const h = await headers();
    const host = (h.get("host") ?? "").toLowerCase().replace(/^www\./, "").split(":")[0];
    const raw = process.env.BRAND_DOMAINS ?? "";
    return raw.split(",").some(pair => {
      const [domain, s] = pair.split("=").map(x => x?.trim().toLowerCase());
      return domain === host && s === slug;
    });
  } catch {
    return false;
  }
}
