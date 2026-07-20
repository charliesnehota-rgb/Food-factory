import ManifestPage from "@/components/ManifestPage";

// Manifest (hidden mode) — English mutation of the landing page.
// Czech lives at /, shared component in components/ManifestPage.tsx.
export const metadata = {
  title: "Food Factory — it's time to change Czech gastronomy",
  description: "Fair. Tasty. Home. We're building something Czechia hasn't seen yet.",
  alternates: {
    canonical: "/en",
    languages: { cs: "/", en: "/en" },
  },
};

export default function Page() {
  return <ManifestPage lang="en" />;
}
