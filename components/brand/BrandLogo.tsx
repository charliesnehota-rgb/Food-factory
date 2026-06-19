import Image from "next/image";
import type { BrandTheme } from "@/lib/brand/registry";

interface Props {
  brand: BrandTheme;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Brandy s vlastním obrázkovým logem (kulatý ořez)
const IMG_LOGOS: Record<string, string> = {
  dumply: "/brands/dumply.png",
};

export function BrandLogo({ brand, size = "md", className = "" }: Props) {
  const px = size === "sm" ? 32 : size === "md" ? 40 : 56;
  const textSizes = { sm: "text-base", md: "text-xl", lg: "text-3xl" };
  const emoji: Record<string, string> = {
    "sunny-side": "🍳", smash: "🍔", dumply: "🥟",
  };
  const imgSrc = IMG_LOGOS[brand.slug];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {imgSrc ? (
        <span className="block rounded-full overflow-hidden shrink-0"
          style={{ width: px, height: px, border: `2px solid ${brand.line}` }}>
          <Image src={imgSrc} alt={brand.name} width={px} height={px} className="object-cover" />
        </span>
      ) : (
        <span className="flex items-center justify-center rounded-2xl shrink-0"
          style={{ width: px, height: px, background: brand.accent, fontSize: px * 0.5 }}>
          {emoji[brand.slug] ?? "🍴"}
        </span>
      )}
      <span className={`font-bold tracking-tight ${textSizes[size]}`}
        style={{ fontFamily: brand.displayFont, color: brand.ink }}>
        {brand.name}
      </span>
    </div>
  );
}
