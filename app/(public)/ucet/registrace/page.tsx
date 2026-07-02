"use client";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [cooldown, setCooldown] = useState(0);

  async function handleRegister() {
    if (!name.trim()) { setError("Zadej jméno."); return; }
    if (password.length < 8) { setError("Heslo musí mít aspoň 8 znaků."); return; }
    setLoading(true); setError("");

    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email, password }),
    });
    const d = await r.json();
    setLoading(false);

    if (!r.ok) { setError(d.error ?? "Registrace se nezdařila."); return; }
    setSentTo(d.email ?? email);
  }

  async function handleResend() {
    if (!sentTo || cooldown > 0) return;
    setResendState("sending");
    await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sentTo, name: name.trim(), resend: true }),
    }).catch(() => null);
    setResendState("sent");
    setCooldown(30);
    const timer = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(timer); setResendState("idle"); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  // ── Velká potvrzovací obrazovka po registraci ──
  if (sentTo) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="text-6xl mb-6">📧</div>
        <h1 className="text-2xl font-semibold mb-3">Zkontroluj svůj e-mail</h1>
        <p className="text-[var(--muted)] mb-1">
          Poslali jsme potvrzovací odkaz na
        </p>
        <p className="text-lg font-semibold text-white mb-6 break-all">{sentTo}</p>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-left mb-8">
          <p className="text-sm text-amber-200 font-medium mb-2">Dokonči registraci ve 2 krocích:</p>
          <ol className="text-sm text-amber-100/80 space-y-1.5 list-decimal list-inside">
            <li>Otevři e-mail a klikni na <span className="font-semibold text-amber-100">Potvrdit e-mail</span></li>
            <li>Přihlas se svým heslem — a můžeš objednávat</li>
          </ol>
          <p className="text-xs text-amber-200/70 mt-3">
            ⚠️ E-mail nikde? Zkontroluj <span className="font-semibold">spam</span> nebo složku Hromadné.
          </p>
        </div>

        <button
          onClick={handleResend}
          disabled={resendState === "sending" || cooldown > 0}
          className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm text-[var(--muted)] hover:text-white hover:border-neutral-500 disabled:opacity-50 transition"
        >
          {resendState === "sending" ? "Odesílám…"
            : cooldown > 0 ? `Odesláno ✓ (znovu za ${cooldown} s)`
            : "Odeslat e-mail znovu"}
        </button>

        <p className="text-sm text-[var(--muted)] mt-8">
          Máš potvrzeno? <Link href="/ucet/prihlaseni" className="text-white underline">Přihlas se</Link>
        </p>
      </div>
    );
  }

  // ── Registrační formulář ──
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
          <p className="mt-1 text-xs text-[var(--muted)]">Aspoň 8 znaků.</p>
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
