"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/auth/client";

export function AccountButton() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loggedIn === null) return null;

  return (
    <Link href={loggedIn ? "/ucet/profil" : "/ucet/prihlaseni"}
      className="rounded-md px-3 py-2 text-[var(--muted)] hover:text-white text-sm">
      {loggedIn ? "Můj účet" : "Přihlásit"}
    </Link>
  );
}
