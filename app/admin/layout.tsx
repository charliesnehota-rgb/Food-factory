"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { href: "/admin", label: "Přehled" },
  { href: "/admin/objednavky", label: "Objednávky" },
  { href: "/admin/produkty", label: "Produkty" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
        Admin zatím není chráněn přihlášením — přidáme v dalším kroku (Supabase Auth).
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <aside className="sm:w-48 shrink-0">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Admin
          </div>
          <nav className="flex gap-1 sm:flex-col">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "rounded-md px-3 py-2 text-sm " +
                    (active
                      ? "bg-white text-black"
                      : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-white")
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
