import Link from "next/link";
import { notFound } from "next/navigation";
import { concepts, getConcept } from "@/lib/data/concepts";
import { DAYPART_LABEL, formatCzk } from "@/lib/types";
import type { MenuItem } from "@/lib/types";

export function generateStaticParams() {
  return concepts.map((c) => ({ slug: c.slug }));
}

export default async function ConceptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const concept = getConcept(slug);
  if (!concept) notFound();

  // seskupení menu podle kategorie
  const categories = new Map<string, MenuItem[]>();
  for (const item of concept.menu) {
    const list = categories.get(item.category) ?? [];
    list.push(item);
    categories.set(item.category, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/#koncepty" className="text-sm text-[var(--muted)] hover:text-white">
        ← Všechny koncepty
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <span className="text-5xl">{concept.emoji}</span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: concept.accent }}>
            {concept.name}
          </h1>
          <p className="text-[var(--muted)]">{concept.tagline}</p>
        </div>
        <span className="ml-auto rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
          {DAYPART_LABEL[concept.daypart]}
        </span>
      </div>

      <p className="mt-4 text-[var(--muted)]">{concept.description}</p>

      <div className="mt-10 space-y-8">
        {Array.from(categories.entries()).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              {category}
            </h2>
            <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {!item.available && (
                        <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-[var(--muted)]">
                          vyprodáno
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">{item.description}</p>
                  </div>
                  <span className="shrink-0 font-medium">{formatCzk(item.priceCzk)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
        🛒 Objednávání (košík + platba Stripe) přijde ve fázi 2. Tahle stránka
        už čte stejná data, jaká budou v databázi.
      </div>
    </div>
  );
}
