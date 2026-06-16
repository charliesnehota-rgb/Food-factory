"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/auth/client";

export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  // Po kliknutí na e-mailový odkaz Supabase vytvoří dočasnou session
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSave() {
    if (password.length < 8) { setError("Heslo musí mít aspoň 8 znaků."); return; }
    if (password !== confirm) { setError("Hesla se neshodují."); return; }
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) { setError("Nepovedlo se nastavit heslo. Odkaz mohl vypršet — požádej o nový."); return; }
    setDone(true);
    setTimeout(() => { router.push("/admin"); router.refresh(); }, 1500);
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <div className="text-center mb-8">
        <div className="text-3xl mb-2">🔒</div>
        <h1 className="text-xl font-semibold">Nové heslo</h1>
      </div>

      {done ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300 text-center">
          ✓ Heslo nastaveno. Přesměrovávám do adminu…
        </div>
      ) : !ready ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 text-center">
          Otevři tuto stránku přes odkaz z e-mailu. Bez platného odkazu nelze heslo změnit.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nové heslo</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="new-password"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Heslo znovu</label>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" autoComplete="new-password"
              onKeyDown={e => e.key === "Enter" && handleSave()}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
          </div>

          {error && <p className="text-sm text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}

          <button onClick={handleSave} disabled={loading}
            className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50 transition">
            {loading ? "Ukládám…" : "Nastavit heslo"}
          </button>
        </div>
      )}
    </div>
  );
}
