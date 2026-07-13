import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brand/registry";
import { fetchProductsForConcept } from "@/lib/db/products";
import { GenericBrandSite } from "@/components/brand/GenericBrandSite";
import { DumplySite } from "@/components/brand/DumplySite";
import { SunnySideSite } from "@/components/brand/SunnySideSite";
import { SmashSite } from "@/components/brand/SmashSite";
import { OpeningBanner } from "@/components/brand/OpeningBanner";

export const revalidate = 60;

export default async function BrandHome({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) notFound();
  const menu = await fetchProductsForConcept(brand);

  // Bespoke weby pro konkrétní brandy; ostatní generická šablona
  const site =
    brand === "dumply" ? <DumplySite brand={b} menu={menu} />
    : brand === "sunny-side" ? <SunnySideSite brand={b} menu={menu} />
    : brand === "smash" ? <SmashSite brand={b} menu={menu} />
    : <GenericBrandSite brand={b} menu={menu} />;

  // JSON-LD pro Google: restaurace + menu s cenami
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: b.name,
    url: `${siteUrl}/${brand}`,
    servesCuisine: brand === "dumply" ? "Asian" : brand === "smash" ? "Burgers" : "Breakfast",
    address: { "@type": "PostalAddress", addressLocality: "Praha", addressCountry: "CZ" },
    hasMenu: {
      "@type": "Menu",
      hasMenuItem: menu.filter(m => m.available).slice(0, 30).map(m => ({
        "@type": "MenuItem",
        name: m.name,
        description: m.description || undefined,
        offers: { "@type": "Offer", price: m.priceCzk, priceCurrency: "CZK" },
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {site}
      <OpeningBanner slug={brand} />
    </>
  );
}
