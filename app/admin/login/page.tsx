"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/auth/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError("Zadej e-mail a heslo."); return; }
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Nesprávný e-mail nebo heslo.");
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <div className="text-center mb-8">
        <div className="text-3xl mb-2">🍴</div>
        <h1 className="text-xl font-semibold">Free City — Admin</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Přihlas se pro přístup</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">E-mail</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Heslo</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
        </div>

        {error && <p className="text-sm text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}

        <button onClick={handleLogin} disabled={loading}
          className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50 transition">
          {loading ? "Přihlašuji…" : "Přihlásit se"}
        </button>
      </div>

      <p className="text-center mt-4">
        <a href="/admin/reset" className="text-xs text-[var(--muted)] hover:text-white underline">
          Zapomněl jsem heslo
        </a>
      </p>

      <p className="text-xs text-center text-[var(--muted)] mt-4">
        Účty vytváří správce v Supabase. Nemáš přístup? Kontaktuj správce.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="px-4 py-24 text-center text-[var(--muted)]">Načítám…</div>}>
      <LoginForm />
    </Suspense>
  );
}
