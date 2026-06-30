import { supabaseAdmin } from "./supabase";
import { concepts } from "@/lib/data/concepts";
import type { MenuItem } from "@/lib/types";

export async function fetchProductsForConcept(slug: string): Promise<MenuItem[]> {
  const staticMenu = () => concepts.find(c => c.slug === slug)?.menu ?? [];

  if (!supabaseAdmin) {
    return staticMenu(); // fallback na statická data
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("concept_slug", slug)
      .eq("available", true)
      .order("sort_order");

    if (error || !data || data.length === 0) {
      // fallback pokud DB nemá produkty (seed ještě neproběhl)
      return staticMenu();
    }

    return data.map(p => ({
      id: p.id,
      conceptSlug: p.concept_slug,
      name: p.name,
      description: p.description ?? "",
      priceCzk: Number(p.price_czk),
      category: p.category ?? "Jídlo",
      tags: p.tags ?? [],
      imageUrl: p.image_url ?? undefined,
      available: p.available,
    }));
  } catch {
    // DB nedostupná / timeout / výjimka → stránka nikdy nespadne, ukáže statické menu
    return staticMenu();
  }
}
