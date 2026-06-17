import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brand/registry";
import { fetchProductsForConcept } from "@/lib/db/products";
import { GenericBrandSite } from "@/components/brand/GenericBrandSite";
import { DumplySite } from "@/components/brand/DumplySite";
import { SunnySideSite } from "@/components/brand/SunnySideSite";

export const revalidate = 60;

export default async function BrandHome({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) notFound();
  const menu = await fetchProductsForConcept(brand);

  // Bespoke weby pro konkrétní brandy; ostatní generická šablona
  if (brand === "dumply") return <DumplySite brand={b} menu={menu} />;
  if (brand === "sunny-side") return <SunnySideSite brand={b} menu={menu} />;
  return <GenericBrandSite brand={b} menu={menu} />;
}
