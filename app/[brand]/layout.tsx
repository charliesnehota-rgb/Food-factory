import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getBrand, brandStyle, brands } from "@/lib/brand/registry";
import { BrandSetter } from "@/components/brand/BrandSetter";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(brands).map((brand) => ({ brand }));
}

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) return {};
  return { title: `${b.name} — ${b.eyebrow}`, description: b.heroSub };
}

export default async function BrandLayout({ children, params }: { children: ReactNode; params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) notFound();

  return (
    <div style={brandStyle(b)} className="min-h-screen flex flex-col">
      <BrandSetter brand={b} />
      {children}
    </div>
  );
}
