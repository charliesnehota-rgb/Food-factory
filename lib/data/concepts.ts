import type { Concept } from "@/lib/types";

// Obsah konceptů (zatím staticky). Ve fázi 2 se přesune do Firestore
// a admin je bude spravovat. Názvy jsou pracovní – klidně je změň.

export const concepts: Concept[] = [
  {
    slug: "sunny-side",
    name: "Prostě snídaně",
    tagline: "Snídaně celý den",
    description: "Vajíčka, lívance, toasty a poctivá káva po celý den. Retro diner feeling v srdci Prahy.",
    daypart: "all-day",
    accent: "#BF3B16",
    emoji: "🍳",
    menu: [
      { id: "sunny-side-1", conceptSlug: "sunny-side", name: "Avocado toast", description: "Kváskový chléb, avokádo, pošírované vejce", priceCzk: 159, category: "Jídlo", tags: ["vegetarian"], available: true },
      { id: "sunny-side-2", conceptSlug: "sunny-side", name: "Pancake stack", description: "Americké lívance, javorový sirup, máslo", priceCzk: 149, category: "Jídlo", tags: ["vegetarian"], available: true },
      { id: "sunny-side-3", conceptSlug: "sunny-side", name: "Shakshuka", description: "Vejce v rajčatové omáčce, feta, pečivo", priceCzk: 169, category: "Jídlo", tags: ["vegetarian", "spicy"], available: true },
      { id: "sunny-side-4", conceptSlug: "sunny-side", name: "Breakfast burrito", description: "Míchaná vejce, slanina, sýr, fazole", priceCzk: 159, category: "Jídlo", available: true },
      { id: "sunny-side-5", conceptSlug: "sunny-side", name: "Granola bowl", description: "Jogurt, domácí granola, sezónní ovoce", priceCzk: 129, category: "Jídlo", tags: ["vegetarian"], available: true },
      { id: "sunny-side-6", conceptSlug: "sunny-side", name: "Flat white", description: "Dvojité espresso, jemně našlehané mléko", priceCzk: 79, category: "Nápoje", available: true },
    ],
  },
  {
    slug: "dumply",
    name: "Dumply",
    tagline: "Čínské knedlíčky & dim sum",
    description: "Ručně skládané dumplingy a dim sum. Pára, křup, a omáčky, co lepí prsty.",
    daypart: "lunch",
    accent: "#ef4444",
    emoji: "🥟",
    menu: [
      { id: "dumply-1", conceptSlug: "dumply", name: "Pork dumplings (8 ks)", description: "Vepřové, zázvor, jarní cibulka", priceCzk: 169, category: "Dumplingy", available: true },
      { id: "dumply-2", conceptSlug: "dumply", name: "Chicken gyoza (6 ks)", description: "Kuřecí, restované do křupava", priceCzk: 149, category: "Dumplingy", available: true },
      { id: "dumply-3", conceptSlug: "dumply", name: "Veggie bao (3 ks)", description: "Plněné parní bochánky, houby & zelenina", priceCzk: 139, category: "Dim sum", tags: ["vegetarian"], available: true },
      { id: "dumply-4", conceptSlug: "dumply", name: "Shrimp dim sum (6 ks)", description: "Krevetové har gow v rýžovém těstě", priceCzk: 189, category: "Dim sum", available: true },
      { id: "dumply-5", conceptSlug: "dumply", name: "Spicy wontons", description: "Wontony v chilli oleji", priceCzk: 159, category: "Dumplingy", tags: ["spicy"], available: true },
      { id: "dumply-6", conceptSlug: "dumply", name: "Bubble tea", description: "Černý čaj, mléko, tapiokové perly", priceCzk: 89, category: "Nápoje", available: true },
    ],
  },
  {
    slug: "smash",
    name: "L.T. Smash",
    tagline: "Smashburgery & wrapy",
    description: "Tence umlácené hovězí placky, roztavený sýr, domácí omáčky. Žádné kompromisy.",
    daypart: "dinner",
    accent: "#f97316",
    emoji: "🍔",
    menu: [
      { id: "smash-1", conceptSlug: "smash", name: "Classic smash", description: "Hovězí smash, cheddar, okurka, omáčka", priceCzk: 169, category: "Burgery", available: true },
      { id: "smash-2", conceptSlug: "smash", name: "Double smash", description: "Dvojitá placka, dvojitý sýr", priceCzk: 219, category: "Burgery", available: true },
      { id: "smash-3", conceptSlug: "smash", name: "Chicken wrap", description: "Křupavé kuře, salát, ranch", priceCzk: 159, category: "Wrapy", available: true },
      { id: "smash-4", conceptSlug: "smash", name: "Veggie burger", description: "Placka z cizrny, grilovaná zelenina", priceCzk: 159, category: "Burgery", tags: ["vegetarian"], available: true },
      { id: "smash-5", conceptSlug: "smash", name: "Hranolky", description: "Křupavé, mořská sůl", priceCzk: 59, category: "Přílohy", tags: ["vegetarian"], available: true },
      { id: "smash-6", conceptSlug: "smash", name: "Craft lemonade", description: "Domácí limonáda, citron & máta", priceCzk: 69, category: "Nápoje", available: true },
    ],
  },
];

export function getConcept(slug: string): Concept | undefined {
  return concepts.find((c) => c.slug === slug);
}

export function allMenuItems() {
  return concepts.flatMap((c) => c.menu);
}
