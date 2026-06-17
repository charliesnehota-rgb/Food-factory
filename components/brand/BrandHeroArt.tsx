import type { BrandTheme } from "@/lib/brand/registry";

export function BrandHeroArt({ brand }: { brand: BrandTheme }) {
  if (brand.slug === "dumply") {
    return (
      <div className="relative flex items-center justify-center" aria-hidden>
        {/* Pára */}
        <div className="absolute -top-2 flex gap-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className="ff-steam-line block h-12 w-1.5 rounded-full"
              style={{ background: brand.muted, animation: `ff-steam 2.6s ease-in-out ${i * 0.5}s infinite` }} />
          ))}
        </div>
        {/* Knedlíček */}
        <svg width="220" height="170" viewBox="0 0 220 170" fill="none">
          <path d="M20 120 Q110 30 200 120 Q110 150 20 120 Z" fill={brand.surface} stroke={brand.accent} strokeWidth="3" />
          <path d="M40 116 Q50 96 62 114 Q74 94 86 113 Q98 92 110 112 Q122 92 134 113 Q146 94 158 114 Q170 96 180 116"
            fill="none" stroke={brand.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="110" cy="128" rx="90" ry="14" fill={brand.accent} opacity="0.12" />
        </svg>
      </div>
    );
  }
  // Ostatní brandy zatím velké emoji s nádechem accentu
  const emoji: Record<string, string> = {
    "sunny-side": "🍳", smash: "🍔", bowlevard: "🥗", rizkarna: "🍗",
  };
  return (
    <div className="relative flex items-center justify-center" aria-hidden>
      <div className="absolute h-40 w-40 rounded-full blur-3xl opacity-30" style={{ background: brand.accent }} />
      <span className="relative text-[110px] leading-none">{emoji[brand.slug] ?? "🍴"}</span>
    </div>
  );
}
