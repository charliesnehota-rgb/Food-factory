"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatCzk } from "@/lib/types";
import { createSupabaseBrowser } from "@/lib/auth/client";

type Fulfilment = "delivery" | "pickup";
type Payment = "cash" | "card";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [payment, setPayment] = useState<Payment>("card");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Ověř přihlášení + předvyplň profil
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/ucet/prihlaseni?next=/checkout"); return; }
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
  const primaryConcept = conceptSlugs[0] ?? "smash";

  async function handleSubmit() {
    if (!name.trim()) { setError("Zadej jméno."); return; }
    if (fulfilment === "delivery" && !address.trim()) { setError("Zadej adresu doručení."); return; }
    if (items.length === 0) { setError("Košík je prázdný."); return; }
    setLoading(true); setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptSlug: primaryConcept, channel: "web", fulfilment,
          customer: { name: name.trim(), phone: phone.trim(), address: address.trim() },
          note: note.trim(),
          items: items.map(i => ({ productId: i.product.id, name: i.product.name, qty: i.qty, unitPriceCzk: i.product.priceCzk })),
        }),
      });
      const data = await res.json();
      if (res.status === 401) { router.push("/ucet/prihlaseni?next=/checkout"); return; }
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
      setError("Chyba připojení. Zkus to znovu."); setLoading(false);
    }
  }

  if (!authChecked) return <div className="px-4 py-20 text-center text-[var(--muted)]">Načítám…</div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-4xl mb-4">🛒</p>
        <p className="text-[var(--muted)]">Košík je prázdný.</p>
        <a href="/" className="mt-4 inline-block text-sm underline">Zpět na výběr jídla</a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold mb-8">Objednávka</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">Způsob doručení</label>
            <div className="grid grid-cols-2 gap-2">
              {([["delivery","🛵 Doručení","59 Kč"],["pickup","🏃 Vyzvednutí","zdarma"]] as const).map(([val,label,sub]) => (
                <button key={val} onClick={() => setFulfilment(val)}
                  className={`rounded-xl border p-3 text-left transition ${fulfilment===val?"border-white bg-[var(--card)]":"border-[var(--border)] hover:border-neutral-600"}`}>
                  <div className="text-sm font-medium">{label}</div><div className="text-xs text-[var(--muted)]">{sub}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Platba</label>
            <div className="grid grid-cols-2 gap-2">
              {([["card", hasCard ? "💳 Uloženou kartou" : "💳 Kartou online", hasCard ? "jedním klikem" : "ihned"],["cash","💵 Při převzetí","hotově/kartou"]] as const).map(([val,label,sub]) => (
                <button key={val} onClick={() => setPayment(val)}
                  className={`rounded-xl border p-3 text-left transition ${payment===val?"border-white bg-[var(--card)]":"border-[var(--border)] hover:border-neutral-600"}`}>
                  <div className="text-sm font-medium">{label}</div><div className="text-xs text-[var(--muted)]">{sub}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Jméno *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Telefon</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
          </div>
          {fulfilment === "delivery" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Adresa doručení *</label>
              <input value={address} onChange={e => setAddress(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Poznámka ke kuchyni</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none resize-none" />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3 self-start">
          <h2 className="font-medium mb-3">Souhrn objednávky</h2>
          {items.map(item => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">{item.qty}× {item.product.name}</span>
              <span>{formatCzk(item.product.priceCzk * item.qty)}</span>
            </div>
          ))}
          <div className="border-t border-[var(--border)] pt-3 space-y-1">
            <div className="flex justify-between text-sm text-[var(--muted)]"><span>Jídlo</span><span>{formatCzk(total)}</span></div>
            <div className="flex justify-between text-sm text-[var(--muted)]"><span>Doručení</span><span>{deliveryFee===0?"zdarma":formatCzk(deliveryFee)}</span></div>
            <div className="flex justify-between font-semibold text-base pt-1"><span>Celkem</span><span>{formatCzk(total+deliveryFee)}</span></div>
          </div>
          {error && <p className="text-sm text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}
          <button onClick={handleSubmit} disabled={loading}
            className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50 transition mt-2">
            {loading ? "Zpracovávám…" : payment === "card" ? (hasCard ? "Zaplatit uloženou kartou" : "Zaplatit kartou →") : "Odeslat objednávku"}
          </button>
        </div>
      </div>
    </div>
  );
}
