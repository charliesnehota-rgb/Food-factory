"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/auth/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/ucet/profil";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError("Zadej e-mail a heslo."); return; }
    setLoading(true); setError("");
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("Nesprávný e-mail nebo heslo."); return; }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <div className="text-center mb-8">
        <div className="text-3xl mb-2">🍴</div>
        <h1 className="text-xl font-semibold">Přihlášení</h1>
      </div>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">E-mail</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email"
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
      <p className="text-center text-sm text-[var(--muted)] mt-6">
        Nemáš účet? <Link href="/ucet/registrace" className="text-white underline">Zaregistruj se</Link>
      </p>
    </div>
  );
}

export default function CustomerLoginPage() {
  return <Suspense fallback={<div className="px-4 py-20 text-center text-[var(--muted)]">Načítám…</div>}><LoginForm /></Suspense>;
}
