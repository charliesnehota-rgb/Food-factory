"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart";
import { createSupabaseBrowser } from "@/lib/auth/client";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { BrandTheme } from "@/lib/brand/registry";

export function BrandNav({ brand }: { brand: BrandTheme }) {
  const { count, openCart } = useCart();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, []);

  return (
    <header className="sticky top-0 z-30 backdrop-blur"
      style={{ background: `color-mix(in srgb, ${brand.bg} 85%, transparent)`, borderBottom: `1px solid ${brand.line}` }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href={`/${brand.slug}`}>
          <BrandLogo brand={brand} size="sm" />
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <a href="#menu" className="rounded-lg px-3 py-2 transition hover:opacity-100 opacity-70"
            style={{ color: brand.ink }}>Menu</a>
          <Link href={loggedIn ? "/ucet/profil" : `/${brand.slug}/ucet/prihlaseni`}
            className="rounded-lg px-3 py-2 transition hover:opacity-100 opacity-70"
            style={{ color: brand.ink }}>
            {loggedIn ? "Účet" : "Přihlásit"}
          </Link>
          <button onClick={openCart}
            className="relative rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{ background: brand.accent, color: brand.accentInk }}>
            Košík{count > 0 ? ` · ${count}` : ""}
          </button>
        </nav>
      </div>
    </header>
  );
}
