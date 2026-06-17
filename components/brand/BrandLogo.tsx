import type { BrandTheme } from "@/lib/brand/registry";

interface Props {
  brand: BrandTheme;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BrandLogo({ brand, size = "md", className = "" }: Props) {
  const sizes = { sm: "h-8", md: "h-10", lg: "h-14" };
  const textSizes = { sm: "text-base", md: "text-xl", lg: "text-3xl" };
  const emojiSizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };

  return (
    <div className={`flex items-center gap-2 ${sizes[size]} ${className}`}>
      {/* Pokud bude logo jako obrázek, přidej zde <img> místo emoji */}
      <div className="flex items-center justify-center w-8 h-8 rounded-xl"
        style={{ background: brand.accent }}>
        <span className={emojiSizes[size]} style={{ fontSize: size === "sm" ? "16px" : size === "md" ? "18px" : "24px" }}>
          {brand.slug === "dumply" ? "🥟"
            : brand.slug === "sunny-side" ? "🍳"
            : brand.slug === "smash" ? "🍔"
            : brand.slug === "bowlevard" ? "🥗"
            : brand.slug === "rizkarna" ? "🍗"
            : "🍴"}
        </span>
      </div>
      <span className={`font-bold tracking-tight ${textSizes[size]}`}
        style={{ fontFamily: brand.displayFont, color: brand.ink }}>
        {brand.name}
      </span>
    </div>
  );
}
