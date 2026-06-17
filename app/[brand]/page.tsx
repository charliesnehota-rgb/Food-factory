import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brand/registry";
import { getConcept } from "@/lib/data/concepts";
import { BrandMenu } from "@/components/brand/BrandMenu";
import { BrandHeroArt } from "@/components/brand/BrandHeroArt";

export default async function BrandHome({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const b = getBrand(brand);
  if (!b) notFound();
  const concept = getConcept(brand);
  const menu = concept?.menu ?? [];

  return (
    <>
      {/* HERO */}
      <section className="mx-auto max-w-5xl px-5 pt-16 pb-20 sm:pt-24">
        <div className="grid items-center gap-10 sm:grid-cols-2">
          <div>
            <p className="mb-5 inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide"
              style={{ background: b.surface, color: b.muted, border: `1px solid ${b.line}` }}>
              {b.eyebrow}
            </p>
            <h1 className="whitespace-pre-line text-5xl font-extrabold leading-[1.02] sm:text-6xl"
              style={{ fontFamily: "var(--brand-display)" }}>
              {b.heroTitle}
            </h1>
            <p className="mt-5 max-w-md text-lg" style={{ color: b.muted }}>{b.heroSub}</p>
            <div className="mt-8 flex gap-3">
              <a href="#menu" className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90"
                style={{ background: b.accent, color: b.accentInk }}>
                Prohlédnout menu
              </a>
              <a href="#jak" className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-80"
                style={{ border: `1px solid ${b.line}`, color: b.ink }}>
                Jak to děláme
              </a>
            </div>
          </div>
          <BrandHeroArt brand={b} />
        </div>
      </section>

      {/* PROCES */}
      <section id="jak" className="py-16" style={{ background: b.surface, borderTop: `1px solid ${b.line}`, borderBottom: `1px solid ${b.line}` }}>
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="mb-10 text-3xl font-bold" style={{ fontFamily: "var(--brand-display)" }}>{b.processTitle}</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {b.process.map((p) => (
              <div key={p.step}>
                <div className="mb-3 text-sm font-bold tracking-widest" style={{ color: b.accent }}>{p.step}</div>
                <h3 className="mb-2 text-xl font-semibold" style={{ fontFamily: "var(--brand-display)" }}>{p.title}</h3>
                <p style={{ color: b.muted }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MENU */}
      <section id="menu" className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="mb-10 text-3xl font-bold" style={{ fontFamily: "var(--brand-display)" }}>Menu</h2>
        {menu.length > 0 ? (
          <BrandMenu items={menu} brand={b} />
        ) : (
          <p style={{ color: b.muted }}>Menu se připravuje.</p>
        )}
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: b.accent, color: b.accentInk }}>
        <div className="mx-auto max-w-5xl px-5 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "var(--brand-display)" }}>{b.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-md opacity-80">{b.ctaSub}</p>
          <a href="#menu" className="mt-7 inline-block rounded-full px-7 py-3 text-sm font-semibold transition hover:opacity-90"
            style={{ background: b.bg, color: b.ink }}>
            Objednat teď
          </a>
        </div>
      </section>
    </>
  );
}
