import type { BrandTheme } from "@/lib/brand/registry";

export function BrandFooter({ brand }: { brand: BrandTheme }) {
  return (
    <footer style={{ borderTop: `1px solid ${brand.line}` }}>
      <div className="mx-auto max-w-5xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm" style={{ color: brand.muted }}>
        <span style={{ fontFamily: "var(--brand-display)", color: brand.ink }} className="font-bold">{brand.name}</span>
        <span>© {new Date().getFullYear()} · Powered by Food Factory</span>
        <a href="/" className="hover:opacity-100 opacity-60 transition-opacity">Food Factory</a>
      </div>
    </footer>
  );
}
