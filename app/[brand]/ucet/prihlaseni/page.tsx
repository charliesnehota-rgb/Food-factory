import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brand/registry";
import { BrandLogin } from "@/components/brand/BrandAuth";

export async function generateMetadata(
  { params }: { params: Promise<{ brand: string }> }
): Promise<Metadata> {
  const { brand } = await params;
  const b = getBrand(brand);
  return { title: b ? `Přihlášení — ${b.name}` : "Přihlášení" };
}

export default async function BrandLoginPage(
  { params }: { params: Promise<{ brand: string }> }
) {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) notFound();
  return <BrandLogin brand={b} />;
}
