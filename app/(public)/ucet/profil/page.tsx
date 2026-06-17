"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PushPermission } from "@/components/PushPermission";
import { createSupabaseBrowser } from "@/lib/auth/client";

interface Profile {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  stripe_customer_id: string | null;
}

function ProfileInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cardAdded = params.get("card") === "added";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hasCard, setHasCard] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "cash">("card");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/account/profile").then(r => r.json()).then(d => {
      if (d.error) { router.push("/ucet/prihlaseni?next=/ucet/profil"); return; }
      setEmail(d.email ?? "");
      const p: Profile = d.profile ?? {};
      setName(p.full_name ?? "");
      setPhone(p.phone ?? "");
      setAddress(p.address ?? "");
      setHasCard(!!p.stripe_customer_id);
      setLoading(false);
    });
  }, [router]);

  async function save() {
    setSaving(true); setSaved(false);
    await fetch("/api/account/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name, phone, address }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addCard() {
    const res = await fetch("/api/account/setup-card", { method: "POST" });
    const d = await res.json();
    if (d.url) window.location.href = d.url;
  }

  async function signOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) return <div className="px-4 py-20 text-center text-[var(--muted)]">Načítám…</div>;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Můj účet</h1>
        <button onClick={signOut} className="text-xs text-[var(--muted)] hover:text-white rounded-md border border-[var(--border)] px-3 py-1.5 hover:border-neutral-600">
          Odhlásit se
        </button>
      </div>

      {cardAdded && (
        <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          ✓ Karta byla úspěšně uložena. Příště zaplatíš jedním kliknutím.
        </div>
      )}

      <p className="text-sm text-[var(--muted)] mb-6">{email}</p>

      <div className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Jméno</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Telefon</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Adresa doručení</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Korunní 12, Praha 2"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
        </div>

        <button onClick={save} disabled={saving}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50 transition">
          {saving ? "Ukládám…" : saved ? "✓ Uloženo" : "Uložit údaje"}
        </button>

        {/* Platba */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="font-medium mb-3">Platba</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {([["card","💳 Kartou"],["cash","💵 Při převzetí"]] as const).map(([v,l]) => (
              <button key={v} onClick={() => setPayMethod(v)}
                className={`rounded-xl border p-3 text-sm font-medium transition ${payMethod===v?"border-white bg-[var(--card)]":"border-[var(--border)] hover:border-neutral-600"}`}>
                {l}
              </button>
            ))}
          </div>

          {payMethod === "card" && (
            hasCard ? (
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
                <span className="text-green-400">✓ Karta uložena</span>
                <button onClick={addCard} className="text-xs text-[var(--muted)] underline hover:text-white">Změnit kartu</button>
              </div>
            ) : (
              <button onClick={addCard}
                className="w-full rounded-xl border border-[var(--border)] py-3 text-sm hover:border-neutral-600 transition">
                + Přidat platební kartu
              </button>
            )
          )}
        </div>

        <PushPermission />

        <div className="border-t border-[var(--border)] pt-6">
          <Link href="/ucet/objednavky" className="text-sm underline hover:text-white">
            Moje objednávky →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return <Suspense fallback={<div className="px-4 py-20 text-center text-[var(--muted)]">Načítám…</div>}><ProfileInner /></Suspense>;
}
