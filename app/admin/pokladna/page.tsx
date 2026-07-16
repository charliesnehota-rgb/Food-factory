"use client";
// Pokladna — pultovní prodej na tabletu. Mřížka produktů podle konceptu,
// košík (klidně napříč koncepty — server ho rozdělí po kuchyních sám),
// odběr / na místě / rozvoz po telefonu, platba hotově nebo kartou na
// samostatném terminálu (jen se zaznamená). Objednávka vzniká rovnou
// zaplacená a padá do KDS jako „Přijatá".
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/lib/toast";

const BRANDS = [
  { slug: "sunny-side", name: "Prostě snídaně", emoji: "🍳", accent: "#f59e0b" },
  { slug: "dumply",     name: "Dumply",          emoji: "🥟", accent: "#ec4899" },
  { slug: "smash",      name: "L.T. Smash",      emoji: "🍔", accent: "#f97316" },
];
// Musí odpovídat serveru (POST /api/orders účtuje dopravu jednou za skupinu)
const DELIVERY_FEE = 59;

interface Product { id: string; concept_slug: string; name: string; price_czk: number; category: string }
interface Cust { id: string; name: string; price_czk: number }
interface CartLine {
  key: string; productId: string; brand: string;
  name: string; unitPrice: number; qty: number; custs: Cust[];
}
type Fulfilment = "pickup" | "dine_in" | "delivery";

const czk = (n: number) => `${Math.round(n)} Kč`;

export default function PokladnaPage() {
  const t = useT();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [brand, setBrand] = useState(BRANDS[0].slug);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [fulfilment, setFulfilment] = useState<Fulfilment>("pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [custCache] = useState<Map<string, Cust[]>>(new Map());
  const [modal, setModal] = useState<{ product: Product; custs: Cust[]; sel: Set<string> } | null>(null);
  const [success, setSuccess] = useState<{ ids: string[]; total: number; method: string } | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/products").then(r => r.json())
        .then(d => setProducts(Array.isArray(d) ? d : []))
        .catch(() => { /* další pokus za minutu */ })
        .finally(() => setLoading(false));
    load();
    // Dostupnost (86nutí položky v KDS) i ceny z cenotvorby se mění za směny —
    // mřížka se drží čerstvá sama, obsluha nemusí nic obnovovat.
    const iv = setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(iv); window.removeEventListener("focus", onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byCategory = useMemo(() => {
    const out: { category: string; items: Product[] }[] = [];
    for (const p of products.filter(p => p.concept_slug === brand)) {
      const g = out.find(x => x.category === p.category);
      if (g) g.items.push(p); else out.push({ category: p.category, items: [p] });
    }
    return out;
  }, [products, brand]);

  function lineKey(productId: string, custs: Cust[]) {
    return productId + "|" + custs.map(c => c.id).sort().join(",");
  }

  function addLine(p: Product, custs: Cust[]) {
    const key = lineKey(p.id, custs);
    setCart(prev => {
      const ex = prev.find(l => l.key === key);
      if (ex) return prev.map(l => l.key === key ? { ...l, qty: l.qty + 1 } : l);
      const custSum = custs.reduce((s, c) => s + Number(c.price_czk), 0);
      return [...prev, {
        key, productId: p.id, brand: p.concept_slug, name: p.name,
        unitPrice: Number(p.price_czk) + custSum, qty: 1, custs,
      }];
    });
  }

  async function tapProduct(p: Product) {
    let custs = custCache.get(p.id);
    if (!custs) {
      try {
        const d = await fetch(`/api/products/${p.id}/customizations`).then(r => r.json());
        custs = Array.isArray(d) ? d : [];
      } catch { custs = []; }
      custCache.set(p.id, custs);
    }
    if (custs.length === 0) { addLine(p, []); return; }
    setModal({ product: p, custs, sel: new Set() });
  }

  function changeQty(key: string, delta: number) {
    setCart(prev => prev
      .map(l => l.key === key ? { ...l, qty: l.qty + delta } : l)
      .filter(l => l.qty > 0));
  }

  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const deliveryFee = fulfilment === "delivery" ? DELIVERY_FEE : 0;

  function reset() {
    setCart([]); setName(""); setPhone(""); setAddress(""); setNote("");
    setFulfilment("pickup"); setSuccess(null);
  }

  async function pay(method: "cash" | "card_terminal") {
    if (cart.length === 0 || busy) return;
    if (fulfilment === "delivery" && (!name.trim() || !phone.trim() || !address.trim())) {
      toast(t("pokladna.deliveryFields"), "error");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "pos", fulfilment, payment: method,
          customer: {
            name: name.trim() || t("pokladna.walkIn"),
            phone: phone.trim() || undefined,
            address: fulfilment === "delivery" ? address.trim() : undefined,
          },
          note: note.trim() || undefined,
          items: cart.map(l => ({
            productId: l.productId, qty: l.qty,
            customizations: l.custs.length ? l.custs.map(c => ({ id: c.id })) : undefined,
          })),
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { toast(d.error ?? t("pokladna.failed"), "error"); return; }
      setSuccess({ ids: d.orderIds ?? [d.orderId], total: Number(d.total), method });
    } catch {
      toast(t("pokladna.failed"), "error");
    } finally {
      setBusy(false);
    }
  }

  // Prefix ID objednávky se odvozuje ze JMÉNA značky (stejně jako makeOrderId
  // na serveru): "Prostě snídaně" → PROSTE_SNIDANE, "L.T. Smash" → L_T_SMASH.
  const brandCode = (name: string) => name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const brandOf = (id: string) => BRANDS.find(b => id.startsWith(brandCode(b.name) + "-"));

  if (loading) return <div className="p-6 text-sm text-[var(--muted)]">{t("common.loading")}</div>;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-semibold">🧾 {t("pokladna.title")}</h1>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* ── Produkty ── */}
        <div className="w-full lg:flex-1 min-w-0">
          <div className="mb-3 flex gap-1.5 flex-wrap">
            {BRANDS.map(b => (
              <button key={b.slug} onClick={() => setBrand(b.slug)}
                className={"rounded-xl px-3.5 py-2 text-sm font-medium transition " +
                  (b.slug === brand ? "bg-white text-black" : "bg-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)]")}>
                {b.emoji} {b.name}
              </button>
            ))}
          </div>

          {byCategory.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t("pokladna.noProducts")}</p>
          ) : byCategory.map(g => (
            <div key={g.category} className="mb-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{g.category}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {g.items.map(p => (
                  <button key={p.id} onClick={() => tapProduct(p)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-left hover:border-white/40 active:scale-[0.98] transition">
                    <div className="text-sm font-medium leading-snug line-clamp-2">{p.name}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{czk(Number(p.price_czk))}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Košík ── */}
        <div className="w-full lg:w-[340px] shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:sticky lg:top-4">
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-[var(--bg)] p-1">
            {(["pickup", "dine_in", "delivery"] as Fulfilment[]).map(f => (
              <button key={f} onClick={() => setFulfilment(f)}
                className={"rounded-lg px-2 py-1.5 text-xs font-medium transition " +
                  (fulfilment === f ? "bg-white text-black" : "text-[var(--muted)]")}>
                {t(`pokladna.f.${f}`)}
              </button>
            ))}
          </div>

          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">{t("pokladna.empty")}</p>
          ) : (
            <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
              {cart.map(l => {
                const b = BRANDS.find(x => x.slug === l.brand);
                return (
                  <div key={l.key} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm leading-snug">{b?.emoji} {l.name}</div>
                      {l.custs.length > 0 && (
                        <div className="text-[11px] text-[var(--muted)]">+ {l.custs.map(c => c.name).join(", ")}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => changeQty(l.key, -1)} className="h-6 w-6 rounded bg-[var(--bg)] text-sm leading-none">−</button>
                      <span className="w-5 text-center text-sm tabular-nums">{l.qty}</span>
                      <button onClick={() => changeQty(l.key, +1)} className="h-6 w-6 rounded bg-[var(--bg)] text-sm leading-none">+</button>
                    </div>
                    <div className="w-16 shrink-0 text-right text-sm tabular-nums">{czk(l.unitPrice * l.qty)}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 space-y-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t("pokladna.name")}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            {fulfilment === "delivery" && (
              <>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("pokladna.phone")}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder={t("pokladna.address")}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
              </>
            )}
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={t("pokladna.note")}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
          </div>

          <div className="mt-3 space-y-1 text-sm">
            {deliveryFee > 0 && (
              <div className="flex justify-between text-[var(--muted)]">
                <span>{t("pokladna.delivery")}</span><span className="tabular-nums">{czk(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base">
              <span>{t("pokladna.total")}</span><span className="tabular-nums">{czk(subtotal + deliveryFee)}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => pay("cash")} disabled={busy || cart.length === 0}
              className="rounded-xl bg-white px-3 py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-40 transition">
              💵 {t("pokladna.cash")}
            </button>
            <button onClick={() => pay("card_terminal")} disabled={busy || cart.length === 0}
              className="rounded-xl bg-white px-3 py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-40 transition">
              💳 {t("pokladna.card")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal přídavků ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-medium">{modal.product.name}</h3>
            <div className="mt-3 space-y-1.5 max-h-[50vh] overflow-y-auto">
              {modal.custs.map(c => {
                const on = modal.sel.has(c.id);
                return (
                  <button key={c.id}
                    onClick={() => setModal(m => {
                      if (!m) return m;
                      const sel = new Set(m.sel);
                      if (sel.has(c.id)) sel.delete(c.id); else sel.add(c.id);
                      return { ...m, sel };
                    })}
                    className={"w-full flex justify-between rounded-lg border px-3 py-2 text-sm transition " +
                      (on ? "border-white bg-white/10" : "border-[var(--border)] bg-[var(--bg)]")}>
                    <span>{on ? "✓ " : ""}{c.name}</span>
                    <span className="text-[var(--muted)] tabular-nums">{Number(c.price_czk) > 0 ? `+${czk(Number(c.price_czk))}` : ""}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setModal(null)}
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]">
                {t("pokladna.cancel")}
              </button>
              <button onClick={() => { addLine(modal.product, modal.custs.filter(c => modal.sel.has(c.id))); setModal(null); }}
                className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black">
                {t("pokladna.add")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Úspěch ── */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
            <div className="text-4xl">✅</div>
            <h3 className="mt-2 text-lg font-semibold">{t("pokladna.paid")} · {czk(success.total)}</h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {success.method === "cash" ? `💵 ${t("pokladna.cash")}` : `💳 ${t("pokladna.card")}`}
            </p>
            <div className="mt-4 space-y-1.5">
              {success.ids.map(id => {
                const b = brandOf(id);
                return (
                  <div key={id} className="rounded-xl bg-[var(--bg)] py-2 font-mono text-xl font-bold tracking-wide">
                    {b?.emoji} {id.split("-").pop()}
                  </div>
                );
              })}
            </div>
            <button onClick={reset}
              className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-neutral-200 transition">
              {t("pokladna.newOrder")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
