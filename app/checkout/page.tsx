"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatCzk } from "@/lib/types";

type Fulfilment = "delivery" | "pickup";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const deliveryFee = fulfilment === "delivery" ? 59 : 0;

  // Seskupení košíku podle konceptu
  const conceptSlugs = [...new Set(items.map(i => i.product.conceptSlug))];
  const primaryConcept = conceptSlugs[0] ?? "smash";

  async function handleSubmit() {
    if (!name.trim()) { setError("Zadej jméno."); return; }
    if (fulfilment === "delivery" && !address.trim()) { setError("Zadej adresu doručení."); return; }
    if (items.length === 0) { setError("Košík je prázdný."); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptSlug: primaryConcept,
          channel: "web",
          fulfilment,
          customer: { name: name.trim(), phone: phone.trim(), address: address.trim() },
          note: note.trim(),
          items: items.map(i => ({
            productId: i.product.id,
            name: i.product.name,
            qty: i.qty,
            unitPriceCzk: i.product.priceCzk,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Chyba při odeslání objednávky.");
        setLoading(false);
        return;
      }

      clearCart();
      router.push(`/objednavka/${data.orderId}`);
    } catch {
      setError("Chyba připojení. Zkus to znovu.");
      setLoading(false);
    }
  }

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
        {/* Levý sloupec — formulář */}
        <div className="space-y-5">
          {/* Způsob doručení */}
          <div>
            <label className="mb-2 block text-sm font-medium">Způsob doručení</label>
            <div className="grid grid-cols-2 gap-2">
              {([["delivery", "🛵 Doručení", "59 Kč"], ["pickup", "🏃 Vyzvednutí", "zdarma"]] as const).map(([val, label, sub]) => (
                <button
                  key={val}
                  onClick={() => setFulfilment(val)}
                  className={`rounded-xl border p-3 text-left transition ${fulfilment === val ? "border-white bg-[var(--card)]" : "border-[var(--border)] hover:border-neutral-600"}`}
                >
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-[var(--muted)]">{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Kontaktní údaje */}
          <div>
            <label className="mb-1 block text-sm font-medium">Jméno *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Jana Nováková"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Telefon</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+420 777 123 456" type="tel"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
          </div>
          {fulfilment === "delivery" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Adresa doručení *</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Korunní 12, Praha 2"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Poznámka ke kuchyni</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Bez cibule, extra omáčka..."
              rows={2} className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none resize-none" />
          </div>
        </div>

        {/* Pravý sloupec — souhrn */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3 self-start">
          <h2 className="font-medium mb-3">Souhrn objednávky</h2>
          {items.map(item => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">{item.qty}× {item.product.name}</span>
              <span>{formatCzk(item.product.priceCzk * item.qty)}</span>
            </div>
          ))}
          <div className="border-t border-[var(--border)] pt-3 space-y-1">
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>Jídlo</span><span>{formatCzk(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>Doručení</span><span>{deliveryFee === 0 ? "zdarma" : formatCzk(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>Celkem</span><span>{formatCzk(total + deliveryFee)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50 transition mt-2"
          >
            {loading ? "Odesílám..." : "Odeslat objednávku"}
          </button>
          <p className="text-xs text-center text-[var(--muted)]">
            Platba při převzetí nebo kartou (brzy)
          </p>
        </div>
      </div>
    </div>
  );
}
