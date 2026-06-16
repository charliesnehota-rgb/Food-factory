import Link from "next/link";
import { concepts } from "@/lib/data/concepts";
import { ConceptCard } from "@/components/ConceptCard";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* HERO */}
      <section className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
          Praha · cloud kitchen
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Pět konceptů. <span className="text-amber-400">Jedna kuchyně.</span>
        </h1>
        <p className="max-w-xl text-balance text-[var(--muted)]">
          Snídaně po celý den, čínské dumplingy, smashburgery, poke bowls a řízek
          nově. Objednej online, vyzvedni nebo nech dovézt.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#koncepty"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
          >
            Prohlédnout koncepty
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium hover:border-neutral-600"
          >
            Admin panel
          </Link>
        </div>
      </section>

      {/* KONCEPTY */}
      <section id="koncepty" className="scroll-mt-20 py-8">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Naše koncepty</h2>
          <span className="text-sm text-[var(--muted)]">{concepts.length} značek</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {concepts.map((c) => (
            <ConceptCard key={c.slug} concept={c} />
          ))}
        </div>
      </section>

      {/* JAK TO FUNGUJE */}
      <section id="jak-to-funguje" className="scroll-mt-20 py-16">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight">Jak objednávka funguje</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Vyber koncept a jídlo", d: "Projdi menu napříč pěti značkami a sestav objednávku." },
            { n: "2", t: "Zaplať online", d: "Bezpečná platba kartou přes Stripe. Hotovo za pár vteřin." },
            { n: "3", t: "Vyzvedni nebo doruč", d: "Vyzvednutí v kuchyni, nebo rozvoz až ke dveřím." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
                {s.n}
              </div>
              <h3 className="font-medium">{s.t}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
