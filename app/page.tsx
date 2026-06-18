import Link from "next/link";
import Image from "next/image";
import { concepts } from "@/lib/data/concepts";

// Brandy se skutečným logem (kulatý ořez), ostatní emoji
const LOGOS: Record<string, string> = {
  dumply: "/brands/dumply.png",
  "sunny-side": "/brands/sunny-side.webp",
};

export const metadata = {
  title: "Food Factory — pět konceptů, jedna kuchyně",
  description: "Cloud kitchen v Praze. Vyber si koncept.",
};

export default function Hub() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimální hlavička — jen wordmark, žádný košík/přihlášení */}
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-5 py-4">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="text-xl">🍴</span> Food Factory
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-5 pt-16 pb-10 text-center sm:pt-24">
          <p className="mb-4 text-sm tracking-wide text-[var(--muted)]">Praha · cloud kitchen</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Pět konceptů. Jedna kuchyně.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[var(--muted)]">
            Vyber si, na co máš dnes chuť. Každý koncept má svůj svět.
          </p>
        </section>

        {/* Rozcestník brandů */}
        <section className="mx-auto max-w-5xl px-5 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {concepts.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`}
                className="group relative overflow-hidden rounded-3xl p-6 transition hover:-translate-y-1"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                {/* barevný nádech brandu */}
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: c.accent }} />
                <div className="mb-4 flex items-center justify-between">
                  {LOGOS[c.slug] ? (
                    <span className="block rounded-full overflow-hidden" style={{ width: 48, height: 48, border: "2px solid var(--border)" }}>
                      <Image src={LOGOS[c.slug]} alt={c.name} width={48} height={48} className="object-cover" />
                    </span>
                  ) : (
                    <span className="text-4xl">{c.emoji}</span>
                  )}
                  <span className="text-sm font-medium opacity-0 transition group-hover:opacity-100" style={{ color: c.accent }}>
                    Otevřít →
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: c.accent }}>{c.name}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{c.tagline}</p>
                <p className="mt-3 text-sm text-[var(--muted)] line-clamp-2">{c.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Footer — diskrétní odkaz do adminu pro personál */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-5 py-6 flex items-center justify-between text-sm text-[var(--muted)]">
          <span>© {new Date().getFullYear()} Food Factory · Praha</span>
          <Link href="/admin" className="opacity-50 hover:opacity-100 transition">Admin</Link>
        </div>
      </footer>
    </div>
  );
}
