"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const groups: { label: string; tabs: { href: string; label: string }[] }[] = [
  {
    label: "Provoz",
    tabs: [
      { href: "/admin/sklad/prijem", label: "Příjem" },
      { href: "/admin/sklad/nakup", label: "Nákup" },
      { href: "/admin/sklad/odpisy", label: "Odpisy" },
      { href: "/admin/sklad/inventura", label: "Inventura" },
    ],
  },
  {
    label: "Číselníky",
    tabs: [
      { href: "/admin/sklad/karty", label: "Skladové karty" },
      { href: "/admin/sklad/receptury", label: "Receptury" },
      { href: "/admin/sklad/dodavatele", label: "Dodavatelé" },
      { href: "/admin/sklad/kategorie", label: "Kategorie" },
    ],
  },
  {
    label: "Reporty",
    tabs: [
      { href: "/admin/sklad", label: "Přehled" },
      { href: "/admin/sklad/pohyby", label: "Pohyby" },
      { href: "/admin/sklad/exporty", label: "Exporty" },
    ],
  },
];

export default function SkladLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <div className="mb-6 space-y-2 border-b border-[var(--border)] pb-3">
        {groups.map((g) => (
          <div key={g.label} className="flex flex-wrap items-center gap-1">
            <span className="mr-1 w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{g.label}</span>
            {g.tabs.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  style={active ? { background: "#ffffff", color: "#111111" } : undefined}
                  className={
                    "rounded-md px-3 py-1.5 text-sm font-medium " +
                    (active ? "" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-white")
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
