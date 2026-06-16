"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/auth/client";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email) { setError("Zadej e-mail."); return; }
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/nove-heslo`,
    });

    setLoading(false);
    if (error) { setError("Něco se nepovedlo. Zkus to znovu."); return; }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <div className="text-center mb-8">
        <div className="text-3xl mb-2">🔑</div>
        <h1 className="text-xl font-semibold">Obnova hesla</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Pošleme ti odkaz na e-mail</p>
      </div>

      {sent ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300 text-center">
          ✓ Pokud účet s tímto e-mailem existuje, poslali jsme na něj odkaz pro nastavení nového hesla. Zkontroluj schránku (i spam).
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email"
              onKeyDown={e => e.key === "Enter" && handleReset()}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
          </div>

          {error && <p className="text-sm text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}

          <button onClick={handleReset} disabled={loading}
            className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50 transition">
            {loading ? "Odesílám…" : "Poslat odkaz"}
          </button>
        </div>
      )}

      <p className="text-center mt-6">
        <Link href="/admin/login" className="text-xs text-[var(--muted)] hover:text-white underline">
          ← Zpět na přihlášení
        </Link>
      </p>
    </div>
  );
}
