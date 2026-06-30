"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useMe } from "@/lib/auth/use-me";

const allLinks = [
  { href: "/admin", label: "Přehled" },
  { href: "/admin/objednavky", label: "Objednávky" },
  { href: "/admin/produkty", label: "Produkty" },
  { href: "/admin/sklad", label: "Sklad" },
];

// Účetní vidí jen exporty.
const accountantLinks = [
  { href: "/admin/sklad/exporty", label: "Exporty" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me } = useMe();

  // Auth stránky (login, reset, přístup zamítnut) nemají admin chrome
  const isLogin = pathname === "/admin/login" || pathname === "/admin/reset" || pathname === "/admin/nove-heslo" || pathname === "/admin/pristup-zamitnut";

  const isAccountant = me?.role === "accountant";
  const isAdmin = me?.role === "admin";

  // Účetního drž na exportech
  useEffect(() => {
    if (isLogin || !isAccountant) return;
    if (!pathname.startsWith("/admin/sklad/exporty")) {
      router.replace("/admin/sklad/exporty");
    }
  }, [isLogin, isAccountant, pathname, router]);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (isLogin) {
    return <>{children}</>;
  }

  const links = isAccountant
    ? accountantLinks
    : isAdmin
      ? [...allLinks, { href: "/admin/personal", label: "Personál" }]
      : allLinks;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        <aside className="sm:w-48 shrink-0">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {isAccountant ? "Účetní" : "Admin"}
          </div>
          <nav className="flex gap-1 sm:flex-col">
            {links.map((l) => {
              const active = l.href === "/admin"
                ? pathname === "/admin"
                : pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  style={active ? { background: "#ffffff", color: "#111111" } : undefined}
                  className={
                    "rounded-md px-3 py-2 text-sm font-medium " +
                    (active
                      ? ""
                      : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-white")
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {me?.email && (
            <div className="mt-6 border-t border-[var(--border)] pt-4">
              <p className="text-xs text-[var(--muted)] mb-2 truncate" title={me.email}>{me.email}</p>
              <button
                onClick={signOut}
                className="text-xs text-[var(--muted)] hover:text-white rounded-md border border-[var(--border)] px-3 py-1.5 w-full text-left hover:border-neutral-600 transition"
              >
                Odhlásit se
              </button>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
