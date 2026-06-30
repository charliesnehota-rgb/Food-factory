"use client";

import { useEffect, useState } from "react";

export interface Me { email: string | null; role: string | null; }

// Načte e-mail a roli přihlášeného uživatele (pro přizpůsobení navigace).
export function useMe(): { me: Me | null; loading: boolean } {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe({ email: d.email ?? null, role: d.role ?? null }))
      .catch(() => setMe({ email: null, role: null }))
      .finally(() => setLoading(false));
  }, []);
  return { me, loading };
}