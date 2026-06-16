import Link from "next/link";
import type { Concept } from "@/lib/types";
import { DAYPART_LABEL } from "@/lib/types";

export function ConceptCard({ concept }: { concept: Concept }) {
  return (
    <Link
      href={"/restaurace/" + concept.slug}
      className="group relative flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition hover:-translate-y-0.5 hover:border-neutral-600"
    >
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
        style={{ background: concept.accent }}
      />
      <div className="flex items-center justify-between">
        <span className="text-3xl">{concept.emoji}</span>
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
          {DAYPART_LABEL[concept.daypart]}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-semibold" style={{ color: concept.accent }}>
          {concept.name}
        </h3>
        <p className="text-sm font-medium">{concept.tagline}</p>
      </div>
      <p className="text-sm text-[var(--muted)]">{concept.description}</p>
      <span className="mt-1 text-sm text-[var(--muted)] group-hover:text-white">
        Zobrazit menu →
      </span>
    </Link>
  );
}
