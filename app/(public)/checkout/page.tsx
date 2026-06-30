"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useBrand } from "@/lib/brand-context";
import { formatCzk } from "@/lib/types";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { createSupabaseBrowser } from "@/lib/auth/client";

type Fulfilment = "delivery" | "pickup";
type Payment = "cash" | "card";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { brand } = useBrand();
  const router = useRouter();

  // Brand barvy nebo výchozí
  const accent    = brand?.accent    ?? "#ffffff";
  const accentInk = brand?.accentInk ?? "#000000";
  const surface   = brand?.surface   ?? "var(--card)";
  const line      = brand?.line      ?? "var(--border)";
  const ink       = brand?.ink       ?? "var(--fg)";
  const muted     = brand?.muted     ?? "var(--muted)";

  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [payment, setPayment] = useState<Payment>("card");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setAuthChecked(true); return; } // host pokračuje bez přihlášení
      setLoggedIn(true);
      setEmail(data.user.email ?? "");
      fetch("/api/account/profile").then(r => r.json()).then(d => {
        const p = d.profile ?? {};
        setName(p.full_name ?? "");
        setPhone(p.phone ?? "");
        setAddress(p.address ?? "");
        setHasCard(!!p.stripe_customer_id);
        setAuthChecked(true);
      });
    });
  }, [router]);

  const deliveryFee = fulfilment === "delivery" ? 59 : 0;
  const conceptSlugs = [...new Set(items.map(i => i.product.conceptSlug))];
  const primaryConcept = conceptSlugs[0] ?? brand?.slug ?? "smash";

  const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1";

  async function handleSubmit() {
    if (!name.trim()) { setError("Zadej jméno."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Zadej platný e-mail pro potvrzení."); return; }
    if (fulfilment === "delivery" && !address.trim()) { setError("Zadej adresu doručení."); return; }
    if (items.length === 0) { setError("Košík je prázdný."); return; }
    setLoading(true); setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptSlug: primaryConcept, channel: "web", fulfilment,
          customer: { name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim() },
          note: note.trim(),
          items: items.map(i => ({ productId: i.product.id, name: i.product.name, qty: i.qty, unitPriceCzk: i.product.priceCzk })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Chyba při odeslání."); setLoading(false); return; }

      if (payment === "card") {
        const payRes = await fetch("/api/checkout", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderId }),
        });
        const payData = await payRes.json();
        if (payRes.ok && payData.paid) { clearCart(); router.push(payData.redirect); return; }
        if (payRes.ok && payData.url) { clearCart(); window.location.href = payData.url; return; }
        setError(payData.error ?? "Platba kartou není dostupná."); setLoading(false); return;
      }
      clearCart();
      router.push(`/objednavka/${data.orderId}`);
    } catch {
      setError("Chyba připojení."); setLoading(false);
    }
  }

  if (!authChecked) return (
    <div className="px-4 py-20 text-center" style={{ color: muted }}>Načítám…</div>
  );

  if (items.length === 0) return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-4xl mb-4">🛒</p>
      <p style={{ color: muted }}>Košík je prázdný.</p>
      <a href="/" className="mt-4 inline-block text-sm underline" style={{ color: ink }}>Zpět na výběr jídla</a>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: brand?.bg ?? "var(--bg)" }}>
      {/* Brand hlavička */}
      <header className="border-b px-5 py-4" style={{ borderColor: line }}>
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          {brand ? (
            <BrandLogo brand={brand} size="md" />
          ) : (
            <span className="font-semibold" style={{ color: ink }}>Objednávka</span>
          )}
          <a href={brand ? `/${brand.slug}` : "/"} className="text-sm transition"
            style={{ color: muted }}>← Zpět na menu</a>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: ink, fontFamily: brand?.displayFont }}>
          Objednávka
        </h1>
        {authChecked && !loggedIn && (
          <p className="mb-8 text-sm" style={{ color: muted }}>
            Objednáváš jako host — registrace není potřeba.{" "}
            <a href="/ucet/prihlaseni?next=/checkout" className="underline" style={{ color: accent }}>Máš účet? Přihlas se</a>
          </p>
        )}
        {loggedIn && <div className="mb-8" />}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Formulář */}
          <div className="space-y-5">
            {/* Doručení */}
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: ink }}>Způsob doručení</label>
              <div className="grid grid-cols-2 gap-2">
                {([["delivery","🛵 Doručení","59 Kč"],["pickup","🏃 Vyzvednutí","zdarma"]] as const).map(([val,label,sub]) => (
                  <button key={val} onClick={() => setFulfilment(val)}
                    className="rounded-xl p-3 text-left transition"
                    style={{
                      background: fulfilment === val ? surface : "transparent",
                      border: `1px solid ${fulfilment === val ? accent : line}`,
                    }}>
                    <div className="text-sm font-medium" style={{ color: ink }}>{label}</div>
                    <div className="text-xs" style={{ color: muted }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Platba */}
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: ink }}>Platba</label>
              <div className="grid grid-cols-2 gap-2">
                {([["card", hasCard ? "💳 Uloženou kartou" : "💳 Kartou online", hasCard ? "jedním klikem" : "ihned"],["cash","💵 Při převzetí","hotově/kartou"]] as const).map(([val,label,sub]) => (
                  <button key={val} onClick={() => setPayment(val)}
                    className="rounded-xl p-3 text-left transition"
                    style={{
                      background: payment === val ? surface : "transparent",
                      border: `1px solid ${payment === val ? accent : line}`,
                    }}>
                    <div className="text-sm font-medium" style={{ color: ink }}>{label}</div>
                    <div className="text-xs" style={{ color: muted }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {[
              { label: "Jméno *", value: name, set: setName, type: "text", placeholder: "Jana Nováková" },
            ].map(f => (
              <div key={f.label}>
                <label className="mb-1 block text-sm font-medium" style={{ color: ink }}>{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} type={f.type} placeholder={f.placeholder}
                  className={inputCls} style={{ background: surface, border: `1px solid ${line}`, color: ink }} />
              </div>
            ))}

            {/* E-mail: u přihlášeného zamčený z účtu, u hosta editovatelný */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: ink }}>E-mail *</label>
              <input
                value={email}
                onChange={e => { if (!loggedIn) setEmail(e.target.value); }}
                type="email"
                placeholder="jana@email.cz"
                readOnly={loggedIn}
                disabled={loggedIn}
                className={inputCls}
                style={{ background: surface, border: `1px solid ${line}`, color: ink, opacity: loggedIn ? 0.7 : 1, cursor: loggedIn ? "not-allowed" : "text" }} />
              <p className="mt-1 text-xs" style={{ color: muted }}>
                {loggedIn
                  ? "E-mail z tvého účtu — potvrzení a stav objednávky pošleme sem."
                  : "Pošleme potvrzení a budeme informovat o stavu objednávky."}
              </p>
            </div>

            {[
              { label: "Telefon", value: phone, set: setPhone, type: "tel", placeholder: "+420 777 123 456" },
            ].map(f => (
              <div key={f.label}>
                <label className="mb-1 block text-sm font-medium" style={{ color: ink }}>{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} type={f.type} placeholder={f.placeholder}
                  className={inputCls} style={{ background: surface, border: `1px solid ${line}`, color: ink }} />
              </div>
            ))}

            {fulfilment === "delivery" && (
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: ink }}>Adresa doručení *</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ulice a číslo, město"
                  className={inputCls} style={{ background: surface, border: `1px solid ${line}`, color: ink }} />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: ink }}>Poznámka ke kuchyni</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                placeholder="Bez cibule, extra omáčka…"
                className={inputCls + " resize-none"} style={{ background: surface, border: `1px solid ${line}`, color: ink }} />
            </div>
          </div>

          {/* Souhrn */}
          <div className="rounded-2xl p-5 space-y-3 self-start" style={{ background: surface, border: `1px solid ${line}` }}>
            {brand && (
              <div className="flex items-center gap-2 pb-2 mb-1" style={{ borderBottom: `1px solid ${line}` }}>
                <BrandLogo brand={brand} size="sm" />
              </div>
            )}
            <h2 className="font-medium" style={{ color: ink }}>Souhrn objednávky</h2>
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span style={{ color: muted }}>{item.qty}× {item.product.name}</span>
                <span style={{ color: ink }}>{formatCzk(item.product.priceCzk * item.qty)}</span>
              </div>
            ))}
            <div className="pt-3 space-y-1" style={{ borderTop: `1px solid ${line}` }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: muted }}>Jídlo</span><span style={{ color: ink }}>{formatCzk(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: muted }}>Doručení</span>
                <span style={{ color: ink }}>{deliveryFee === 0 ? "zdarma" : formatCzk(deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1">
                <span style={{ color: ink }}>Celkem</span>
                <span style={{ color: ink }}>{formatCzk(total + deliveryFee)}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ background: accent, color: accentInk }}>
              {loading ? "Zpracovávám…" : payment === "card" ? (hasCard ? "Zaplatit uloženou kartou" : "Zaplatit kartou →") : "Odeslat objednávku"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
