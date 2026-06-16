"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/auth/client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim()) { setError("Zadej jméno."); return; }
    if (password.length < 8) { setError("Heslo musí mít aspoň 8 znaků."); return; }
    setLoading(true); setError("");

    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (error) {
      setError(error.message.includes("already") ? "Tento e-mail je už registrovaný." : "Registrace se nezdařila.");
      return;
    }
    router.push("/ucet/profil");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <div className="text-center mb-8">
        <div className="text-3xl mb-2">🍴</div>
        <h1 className="text-xl font-semibold">Vytvořit účet</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Objednávej rychleji a sleduj stav</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Jméno</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">E-mail</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Heslo</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="new-password"
            onKeyDown={e => e.key === "Enter" && handleRegister()}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
        </div>
        {error && <p className="text-sm text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}
        <button onClick={handleRegister} disabled={loading}
          className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50 transition">
          {loading ? "Vytvářím…" : "Vytvořit účet"}
        </button>
      </div>
      <p className="text-center text-sm text-[var(--muted)] mt-6">
        Už máš účet? <Link href="/ucet/prihlaseni" className="text-white underline">Přihlas se</Link>
      </p>
    </div>
  );
}
