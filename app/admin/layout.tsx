"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createSupabaseBrowser } from "@/lib/auth/client";

const links = [
  { href: "/admin", label: "Přehled" },
  { href: "/admin/objednavky", label: "Objednávky" },
  { href: "/admin/produkty", label: "Produkty" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  // Login stránka nemá admin chrome
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (isLogin) return;
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [isLogin]);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
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

          {email && (
            <div className="mt-6 border-t border-[var(--border)] pt-4">
              <p className="text-xs text-[var(--muted)] mb-2 truncate" title={email}>{email}</p>
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
