import ManifestPage from "@/components/ManifestPage";

// Manifest (skrytý režim) — česká mutace. EN žije na /en, sdílená
// komponenta v components/ManifestPage.tsx. Rozcestník značek se
// odkryje až při „sjednocení" (6+ restaurací + appka).
export const metadata = {
  title: "Food Factory — je čas změnit českou gastronomii",
  description: "Férově. Chutně. Doma. Stavíme něco, co tu ještě nebylo.",
  alternates: {
    canonical: "/",
    languages: { cs: "/", en: "/en" },
  },
};

export default function Page() {
  return <ManifestPage lang="cs" />;
}
