"use client";
// Brandové přihlášení a registrace — stejná auth logika jako sdílené
// /ucet/prihlaseni a /ucet/registrace, ale vizuálně v identitě značky.
// Každý provoz tak má vlastní auth frontend pod /[brand]/ucet/…
// (zůstává i ve scope PWA dané značky).
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/auth/client";
import type { BrandTheme } from "@/lib/brand/registry";

const EMOJI: Record<string, string> = { "sunny-side": "🍳", "dumply": "🥟", "smash": "🍔" };

// ── Sdílené UI stavební bloky ──
function Shell({ b, children }: { b: BrandTheme; children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-14 sm:py-10">
      <div className="w-full max-w-sm">
        <Link href={`/${b.slug}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70"
          style={{ color: b.muted }}>
          ← {b.name}
        </Link>
        <div className="rounded-3xl p-6 sm:p-8"
          style={{ background: b.surface, border: `1px solid ${b.line}`, boxShadow: `0 12px 40px color-mix(in srgb, ${b.ink} 10%, transparent)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Head({ b, title, sub }: { b: BrandTheme; title: string; sub?: string }) {
  return (
    <div className="text-center mb-7">
      <div className="text-4xl mb-3">{EMOJI[b.slug] ?? "🍴"}</div>
      <h1 className="text-2xl font-bold uppercase tracking-wide" style={{ fontFamily: b.displayFont, color: b.ink }}>{title}</h1>
      {sub && <p className="text-sm mt-1.5" style={{ color: b.muted }}>{sub}</p>}
      <div className="mx-auto mt-4 h-1 w-12 rounded-full" style={{ background: b.accent }} />
    </div>
  );
}

function Field({ b, label, hint, ...input }: { b: BrandTheme; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium" style={{ color: b.ink }}>{label}</label>
      <input {...input}
        className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
        style={{ background: b.bg, border: `1px solid ${b.line}`, color: b.ink, ["--tw-ring-color" as string]: b.accent }} />
      {hint && <p className="mt-1 text-xs" style={{ color: b.muted }}>{hint}</p>}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <p className="text-sm rounded-lg px-3 py-2" style={{ background: "rgba(220,60,40,.12)", color: "#B03020", border: "1px solid rgba(220,60,40,.35)" }}>{children}</p>;
}

function PrimaryBtn({ b, ...btn }: { b: BrandTheme } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...btn}
      className="w-full rounded-full py-3 text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
      style={{ background: b.accent, color: b.accentInk }} />
  );
}

// ═══════════════════ PŘIHLÁŠENÍ ═══════════════════
function LoginInner({ b }: { b: BrandTheme }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? `/${b.slug}`;
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
    <Shell b={b}>
      <Head b={b} title="Přihlášení" sub={b.name} />
      {params.get("confirmed") === "1" && (
        <div className="mb-5 rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(30,140,80,.12)", color: "#1E7A4A", border: "1px solid rgba(30,140,80,.35)" }}>
          ✓ E-mail potvrzen! Přihlas se a můžeš objednávat.
        </div>
      )}
      <div className="space-y-4">
        <Field b={b} label="E-mail" type="email" autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <Field b={b} label="Heslo" type="password" autoComplete="current-password"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()} />
        {error && <ErrorBox>{error}</ErrorBox>}
        <PrimaryBtn b={b} onClick={handleLogin} disabled={loading}>
          {loading ? "Přihlašuji…" : "Přihlásit se"}
        </PrimaryBtn>
      </div>
      <p className="text-center text-sm mt-6" style={{ color: b.muted }}>
        Nemáš účet?{" "}
        <Link href={`/${b.slug}/ucet/registrace${next !== `/${b.slug}` ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold underline underline-offset-2" style={{ color: b.accent }}>
          Zaregistruj se
        </Link>
      </p>
      <p className="text-center text-xs mt-4" style={{ color: b.muted, opacity: 0.75 }}>
        Jeden účet Food Factory platí pro všechny naše provozy
      </p>
    </Shell>
  );
}

export function BrandLogin({ brand }: { brand: BrandTheme }) {
  return (
    <Suspense fallback={<div className="flex-1 py-20 text-center text-sm" style={{ color: brand.muted }}>Načítám…</div>}>
      <LoginInner b={brand} />
    </Suspense>
  );
}

// ═══════════════════ REGISTRACE ═══════════════════
function RegisterInner({ b }: { b: BrandTheme }) {
  const params = useSearchParams();
  const next = params.get("next") ?? `/${b.slug}`;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [cooldown, setCooldown] = useState(0);
  const [consent, setConsent] = useState(false);

  async function handleRegister() {
    if (!name.trim()) { setError("Zadej jméno."); return; }
    if (password.length < 8) { setError("Heslo musí mít aspoň 8 znaků."); return; }
    setLoading(true); setError("");

    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email, password, brand: b.slug, marketing_consent: consent }),
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
      body: JSON.stringify({ email: sentTo, name: name.trim(), resend: true, brand: b.slug }),
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

  // ── Potvrzovací obrazovka po registraci ──
  if (sentTo) {
    return (
      <Shell b={b}>
        <div className="text-center">
          <div className="text-5xl mb-5">📧</div>
          <h1 className="text-xl font-bold uppercase tracking-wide mb-3" style={{ fontFamily: b.displayFont, color: b.ink }}>Zkontroluj svůj e-mail</h1>
          <p className="text-sm mb-1" style={{ color: b.muted }}>Poslali jsme potvrzovací odkaz na</p>
          <p className="text-base font-semibold mb-6 break-all" style={{ color: b.ink }}>{sentTo}</p>

          <div className="rounded-2xl px-5 py-4 text-left mb-7"
            style={{ background: b.bg, border: `1px solid ${b.line}` }}>
            <p className="text-sm font-medium mb-2" style={{ color: b.ink }}>Dokonči registraci ve 2 krocích:</p>
            <ol className="text-sm space-y-1.5 list-decimal list-inside" style={{ color: b.muted }}>
              <li>Otevři e-mail a klikni na <span className="font-semibold" style={{ color: b.ink }}>Potvrdit e-mail</span></li>
              <li>Přihlas se svým heslem — a můžeš objednávat</li>
            </ol>
            <p className="text-xs mt-3" style={{ color: b.muted, opacity: 0.8 }}>
              ⚠️ E-mail nikde? Zkontroluj <span className="font-semibold">spam</span> nebo složku Hromadné.
            </p>
          </div>

          <button onClick={handleResend} disabled={resendState === "sending" || cooldown > 0}
            className="rounded-full px-5 py-2.5 text-sm font-medium transition hover:opacity-80 disabled:opacity-50"
            style={{ border: `1px solid ${b.line}`, color: b.muted }}>
            {resendState === "sending" ? "Odesílám…"
              : cooldown > 0 ? `Odesláno ✓ (znovu za ${cooldown} s)`
              : "Odeslat e-mail znovu"}
          </button>

          <p className="text-sm mt-7" style={{ color: b.muted }}>
            Máš potvrzeno?{" "}
            <Link href={`/${b.slug}/ucet/prihlaseni`} className="font-semibold underline underline-offset-2" style={{ color: b.accent }}>
              Přihlas se
            </Link>
          </p>
        </div>
      </Shell>
    );
  }

  // ── Registrační formulář ──
  return (
    <Shell b={b}>
      <Head b={b} title="Vytvořit účet" sub="Objednávej rychleji a sleduj stav" />
      <div className="space-y-4">
        <Field b={b} label="Jméno" value={name} onChange={e => setName(e.target.value)} />
        <Field b={b} label="E-mail" type="email" autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <Field b={b} label="Heslo" type="password" autoComplete="new-password" hint="Aspoň 8 znaků."
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleRegister()} />
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: b.accent }} />
          <span className="text-xs leading-relaxed" style={{ color: b.muted }}>
            Chci e-mailem dostávat novinky a akce (volitelné, odhlášení kdykoli jedním klikem)
          </span>
        </label>
        {error && <ErrorBox>{error}</ErrorBox>}
        <PrimaryBtn b={b} onClick={handleRegister} disabled={loading}>
          {loading ? "Vytvářím…" : "Vytvořit účet"}
        </PrimaryBtn>
      </div>
      <p className="text-center text-sm mt-6" style={{ color: b.muted }}>
        Už máš účet?{" "}
        <Link href={`/${b.slug}/ucet/prihlaseni${next !== `/${b.slug}` ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold underline underline-offset-2" style={{ color: b.accent }}>
          Přihlas se
        </Link>
      </p>
    </Shell>
  );
}

export function BrandRegister({ brand }: { brand: BrandTheme }) {
  return (
    <Suspense fallback={<div className="flex-1 py-20 text-center text-sm" style={{ color: brand.muted }}>Načítám…</div>}>
      <RegisterInner b={brand} />
    </Suspense>
  );
}
