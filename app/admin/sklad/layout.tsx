"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMe } from "@/lib/auth/use-me";
import { useT } from "@/lib/i18n";

export default function SkladLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me } = useMe();
  const t = useT();

  const groups = [
    {
      label: t("nav.sklad.ops"),
      tabs: [
        { href: "/admin/sklad/prijem", label: t("nav.sklad.prijem") },
        { href: "/admin/sklad/nakup", label: t("nav.sklad.nakup") },
        { href: "/admin/sklad/odpisy", label: t("nav.sklad.odpisy") },
        { href: "/admin/sklad/inventura", label: t("nav.sklad.inventura") },
      ],
    },
    {
      label: t("nav.sklad.catalog"),
      tabs: [
        { href: "/admin/sklad/karty", label: t("nav.sklad.karty") },
        { href: "/admin/sklad/receptury", label: t("nav.sklad.receptury") },
        { href: "/admin/sklad/dodavatele", label: t("nav.sklad.dodavatele") },
        { href: "/admin/sklad/kategorie", label: t("nav.sklad.kategorie") },
      ],
    },
    {
      label: t("nav.sklad.reports"),
      tabs: [
        { href: "/admin/sklad", label: t("nav.sklad.prehled") },
        { href: "/admin/sklad/pohyby", label: t("nav.sklad.pohyby") },
        { href: "/admin/sklad/exporty", label: t("nav.sklad.exporty") },
      ],
    },
  ];

  const accountantGroups = [
    {
      label: t("nav.accountant"),
      tabs: [{ href: "/admin/sklad/exporty", label: t("nav.sklad.exporty") }],
    },
  ];

  const visibleGroups = me?.role === "accountant" ? accountantGroups : groups;

  return (
    <div>
      <div className="mb-6 space-y-2 border-b border-[var(--border)] pb-3">
        {visibleGroups.map((g) => (
          <div key={g.label} className="flex flex-wrap items-center gap-1">
            <span className="mr-1 w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {g.label}
            </span>
            {g.tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={active ? { background: "#ffffff", color: "#111111" } : undefined}
                  className={
                    "rounded-md px-3 py-1.5 text-sm font-medium " +
                    (active ? "" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-white")
                  }
                >
                  {tab.label}
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
