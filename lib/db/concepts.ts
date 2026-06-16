// Dotazy na koncepty — vrací z Supabase nebo fallback na statická data.
import { supabaseAdmin } from "./supabase";
import { concepts as staticConcepts, getConcept as getStaticConcept } from "@/lib/data/concepts";
import type { Concept } from "@/lib/types";

export async function fetchConcepts(): Promise<Concept[]> {
  if (!supabaseAdmin) return staticConcepts;
  const { data, error } = await supabaseAdmin
    .from("concepts")
    .select("*, products(*)")
    .eq("active", true)
    .order("sort_order");
  if (error || !data) return staticConcepts;
  return data.map(dbConceptToModel);
}

export async function fetchConcept(slug: string): Promise<Concept | undefined> {
  if (!supabaseAdmin) return getStaticConcept(slug);
  const { data, error } = await supabaseAdmin
    .from("concepts")
    .select("*, products(*)")
    .eq("slug", slug)
    .eq("active", true)
    .single();
  if (error || !data) return getStaticConcept(slug);
  return dbConceptToModel(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbConceptToModel(row: any): Concept {
  return {
    slug: row.slug, name: row.name, tagline: row.tagline,
    description: row.description, daypart: row.daypart,
    accent: row.accent, emoji: row.emoji,
    menu: (row.products ?? [])
      .filter((p: { available: boolean }) => p.available)
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((p: { id: string; concept_slug: string; name: string; description: string; price_czk: number; category: string; tags: string[]; image_url: string | null; available: boolean }) => ({
        id: p.id, conceptSlug: p.concept_slug, name: p.name,
        description: p.description, priceCzk: Number(p.price_czk),
        category: p.category, tags: p.tags,
        imageUrl: p.image_url ?? undefined, available: p.available,
      })),
  };
}
