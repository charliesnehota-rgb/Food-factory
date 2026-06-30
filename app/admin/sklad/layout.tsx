"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const tabs = [
  { href: "/admin/sklad", label: "Přehled" },
  { href: "/admin/sklad/karty", label: "Skladové karty" },
  { href: "/admin/sklad/receptury", label: "Receptury" },
  { href: "/admin/sklad/prijem", label: "Příjem" },
  { href: "/admin/sklad/odpisy", label: "Odpisy" },
  { href: "/admin/sklad/inventura", label: "Inventura" },
  { href: "/admin/sklad/pohyby", label: "Pohyby" },
  { href: "/admin/sklad/dodavatele", label: "Dodavatelé" },
  { href: "/admin/sklad/kategorie", label: "Kategorie" },
];

export default function SkladLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-[var(--border)] pb-3">
        {tabs.map((t) => {
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
      {children}
    </div>
  );
}
