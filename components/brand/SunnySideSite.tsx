"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { createSupabaseBrowser } from "@/lib/auth/client";
import { formatCzk } from "@/lib/types";
import type { MenuItem } from "@/lib/types";
import type { BrandTheme } from "@/lib/brand/registry";

const SECTIONS = [
  { id: "uvod", label: "Úvod" },
  { id: "menu", label: "Menu" },
  { id: "hodiny", label: "Hodiny" },
  { id: "kontakt", label: "Kontakt" },
];

const DAYPARTS = [
  { emoji: "🌅", label: "Ranní", time: "7:00 – 10:30", items: ["Avocado toast", "Vejce benedict", "Granola bowl", "Flat white"] },
  { emoji: "☀️", label: "Dopolední", time: "10:30 – 13:00", items: ["Pancake stack", "Shakshuka", "Breakfast burrito", "Latte"] },
  { emoji: "🌤️", label: "Odpolední", time: "13:00 – 16:00", items: ["Celé menu stále dostupné", "Mimosa", "Domácí limonáda"] },
  { emoji: "🌙", label: "Pozdní", time: "16:00 – 21:00", items: ["Výběrové položky", "Večerní brunch", "Káva & dezert"] },
];

const MARQUEE_TEXT = "PROSTĚ SNÍDANĚ · ALWAYS BREAKFAST · SNÍDANĚ KDYKOLIV · OPEN ALL DAY · ";

export function SunnySideSite({ brand: b, menu }: { brand: BrandTheme; menu: MenuItem[] }) {
  const { addItem, count, openCart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("uvod");
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }); },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  // Kategorie menu
  const categories = new Map<string, MenuItem[]>();
  for (const it of menu) {
    const list = categories.get(it.category) ?? [];
    list.push(it);
    categories.set(it.category, list);
  }

  async function submitContact() {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setSending(true);
    try {
      await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, concept: "sunny-side" }),
      });
    } catch { /* best-effort */ }
    setSending(false);
    setContactSent(true);
  }

  // Atomic palette shortcuts
  const BRICK = b.accent;       // cihlová
  const TEAL  = b.pop;          // petrolejová
  const CREAM = b.bg;
  const INK   = b.ink;
  const MUTED = b.muted;
  const SURF  = b.surface;
  const LINE  = b.line;
  const AINK  = b.accentInk;

  return (
    <div style={{ fontFamily: b.bodyFont, background: CREAM, color: INK }}>

      {/* ── PLOVOUCÍ NAVIGACE ── */}
      <header className="sticky top-0 z-40 transition-all duration-300"
        style={{
          background: scrolled ? `color-mix(in srgb, ${CREAM} 94%, transparent)` : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
          borderBottom: `1px solid ${scrolled ? LINE : "transparent"}`,
        }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          {/* Wordmark */}
          <a href="#uvod" className="flex items-center gap-2.5 group">
            <span className="text-2xl font-black tracking-tighter uppercase"
              style={{ fontFamily: b.displayFont, color: BRICK }}>
              Prostě snídaně
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}
                className="rounded-full px-4 py-2 text-sm font-semibold transition"
                style={{ color: active === s.id ? BRICK : MUTED, background: active === s.id ? SURF : "transparent" }}>
                {s.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href={loggedIn ? "/ucet/profil" : "/ucet/prihlaseni"}
              className="hidden sm:block rounded-full px-3 py-2 text-sm font-semibold transition hover:opacity-70"
              style={{ color: INK }}>
              {loggedIn ? "Účet" : "Přihlásit"}
            </Link>
            <button onClick={openCart}
              className="rounded-full px-4 py-2 text-sm font-bold transition hover:scale-105"
              style={{ background: BRICK, color: AINK }}>
              Košík{count > 0 ? ` · ${count}` : ""}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden rounded-full p-2" style={{ color: INK }}>
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden px-5 pb-4 flex flex-col gap-1" style={{ borderTop: `1px solid ${LINE}` }}>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ color: INK }}>
                {s.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* ── HERO ── */}
      <section id="uvod" className="scroll-mt-16 relative overflow-hidden" style={{ minHeight: "92vh", display: "flex", alignItems: "center" }}>
        {/* Sunburst */}
        <div className="ss-rays" style={{ background: `repeating-conic-gradient(from 0deg, color-mix(in srgb, ${TEAL} 12%, transparent) 0deg 6deg, transparent 6deg 12deg)` }} />

        <div className="relative mx-auto max-w-5xl px-5 py-24 w-full">
          <div className="grid items-center gap-10 sm:grid-cols-2">
            <div>
              {/* Eyebrow */}
              <p className="mb-6 inline-block rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase"
                style={{ background: SURF, color: TEAL, border: `2px solid ${LINE}` }}>
                {b.eyebrow}
              </p>
              {/* Headline */}
              <h1 className="text-6xl font-black tracking-tight leading-[0.95] sm:text-7xl uppercase"
                style={{ fontFamily: b.displayFont, color: INK }}>
                Snídaně<br />
                <span style={{ color: BRICK }}>kdykoliv.</span>
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed" style={{ color: MUTED }}>
                {b.heroSub}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#menu"
                  className="rounded-full px-7 py-3.5 text-sm font-bold tracking-wide uppercase transition hover:scale-105"
                  style={{ background: BRICK, color: AINK }}>
                  Prohlédnout menu →
                </a>
                <a href="#hodiny"
                  className="rounded-full px-7 py-3.5 text-sm font-bold tracking-wide uppercase transition hover:scale-105"
                  style={{ background: SURF, color: INK, border: `2px solid ${LINE}` }}>
                  Hodiny
                </a>
              </div>
            </div>

            {/* Retro oval sign */}
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center"
                style={{ width: 320, height: 320 }}>
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full"
                  style={{ border: `8px solid ${TEAL}`, opacity: 0.25 }} />
                <div className="absolute inset-4 rounded-full"
                  style={{ border: `4px dashed ${BRICK}`, opacity: 0.35 }} />
                {/* Center */}
                <div className="relative flex flex-col items-center justify-center rounded-full"
                  style={{ width: 240, height: 240, background: SURF, border: `6px solid ${BRICK}` }}>
                  <span className="text-6xl">🍳</span>
                  <span className="mt-2 text-xs font-black tracking-widest uppercase" style={{ color: BRICK, fontFamily: b.displayFont }}>
                    Praha
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BRICK MARQUEE ── */}
      <div className="py-4 overflow-hidden" style={{ background: BRICK, color: AINK }}>
        <div className="whitespace-nowrap">
          <span className="ss-marquee text-sm font-black tracking-widest uppercase" style={{ fontFamily: b.displayFont }}>
            {MARQUEE_TEXT.repeat(6)}
          </span>
          <span className="ss-marquee text-sm font-black tracking-widest uppercase" style={{ fontFamily: b.displayFont }}>
            {MARQUEE_TEXT.repeat(6)}
          </span>
        </div>
      </div>

      {/* ── DINER MENU BOARD ── */}
      <section id="menu" className="scroll-mt-24 py-20" style={{ background: "#1A1208", color: "#F5EDD8" }}>
        <div className="mx-auto max-w-5xl px-5">
          {/* Board header */}
          <div className="text-center mb-12">
            <p className="text-xs tracking-widest uppercase mb-3" style={{ color: TEAL }}>Náš jídelní lístek</p>
            <h2 className="text-5xl font-black uppercase tracking-tight" style={{ fontFamily: b.displayFont, color: "#F5EDD8" }}>
              Menu
            </h2>
            <div className="mt-4 mx-auto h-0.5 w-24" style={{ background: BRICK }} />
          </div>

          {/* Menu categories */}
          {categories.size > 0 ? (
            Array.from(categories.entries()).map(([category, items]) => (
              <div key={category} className="mb-10">
                <h3 className="text-xs font-black tracking-[0.3em] uppercase mb-6 flex items-center gap-3"
                  style={{ color: TEAL }}>
                  <span className="flex-1 h-px" style={{ background: TEAL, opacity: 0.3 }} />
                  {category}
                  <span className="flex-1 h-px" style={{ background: TEAL, opacity: 0.3 }} />
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="group flex items-baseline gap-2">
                      {/* Name */}
                      <span className="font-semibold text-base shrink-0" style={{ color: "#F5EDD8" }}>
                        {item.name}
                      </span>
                      {/* Description */}
                      {item.description && (
                        <span className="text-xs shrink-0" style={{ color: "#9A8870" }}>
                          — {item.description}
                        </span>
                      )}
                      {/* Dotted leader */}
                      <span className="flex-1 border-b border-dotted mb-1" style={{ borderColor: "#4A3C28" }} />
                      {/* Price */}
                      <span className="font-bold shrink-0 tabular-nums" style={{ color: TEAL }}>
                        {formatCzk(item.priceCzk)}
                      </span>
                      {/* Add button */}
                      <button
                        onClick={() => addItem(item)}
                        disabled={!item.available}
                        className="shrink-0 ml-2 w-7 h-7 rounded-full text-sm font-bold transition hover:scale-110 disabled:opacity-30"
                        style={{ background: BRICK, color: AINK }}>
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            /* Fallback static menu if DB empty */
            <div className="space-y-10">
              {[
                {
                  cat: "Hlavní jídla", items: [
                    { name: "Avocado toast", desc: "Kváskový chléb, avokádo, pošírované vejce", price: "159 Kč" },
                    { name: "Pancake stack", desc: "Americké lívance, javorový sirup, máslo", price: "149 Kč" },
                    { name: "Shakshuka", desc: "Vejce v rajčatové omáčce, feta, pečivo", price: "169 Kč" },
                    { name: "Breakfast burrito", desc: "Míchaná vejce, slanina, sýr, fazole", price: "159 Kč" },
                    { name: "Granola bowl", desc: "Jogurt, domácí granola, sezónní ovoce", price: "129 Kč" },
                  ]
                },
                {
                  cat: "Nápoje", items: [
                    { name: "Flat white", desc: "Dvojité espresso, jemně našlehané mléko", price: "79 Kč" },
                    { name: "Domácí limonáda", desc: "Citron & máta, perlivá", price: "69 Kč" },
                  ]
                }
              ].map(({ cat, items }) => (
                <div key={cat}>
                  <h3 className="text-xs font-black tracking-[0.3em] uppercase mb-6 flex items-center gap-3" style={{ color: TEAL }}>
                    <span className="flex-1 h-px" style={{ background: TEAL, opacity: 0.3 }} />
                    {cat}
                    <span className="flex-1 h-px" style={{ background: TEAL, opacity: 0.3 }} />
                  </h3>
                  <div className="space-y-3">
                    {items.map((it) => (
                      <div key={it.name} className="flex items-baseline gap-2">
                        <span className="font-semibold text-base" style={{ color: "#F5EDD8" }}>{it.name}</span>
                        <span className="text-xs" style={{ color: "#9A8870" }}>— {it.desc}</span>
                        <span className="flex-1 border-b border-dotted mb-1" style={{ borderColor: "#4A3C28" }} />
                        <span className="font-bold tabular-nums" style={{ color: TEAL }}>{it.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── OTEVŘENO CELÝ DEN ── */}
      <section className="py-16" style={{ background: TEAL }}>
        <div className="mx-auto max-w-5xl px-5 text-center">
          <div className="inline-block rounded-full px-12 py-6"
            style={{ background: CREAM, border: `6px solid #fff`, boxShadow: `0 0 0 3px ${TEAL}` }}>
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: MUTED }}>Praha · Cloud kitchen</p>
            <h2 className="text-4xl font-black uppercase tracking-tight sm:text-5xl"
              style={{ fontFamily: b.displayFont, color: BRICK }}>
              Otevřeno celý den
            </h2>
            <p className="mt-2 text-sm font-semibold tracking-wider" style={{ color: MUTED }}>
              7:00 — 21:00 · Pondělí — Neděle
            </p>
          </div>
        </div>
      </section>

      {/* ── HODINY / DAYPARTS ── */}
      <section id="hodiny" className="scroll-mt-24 py-20" style={{ background: SURF }}>
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-12">
            <p className="text-xs tracking-widest uppercase mb-3" style={{ color: BRICK }}>Denní doby</p>
            <h2 className="text-4xl font-black uppercase" style={{ fontFamily: b.displayFont, color: INK }}>
              Snídáme celý den
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DAYPARTS.map((dp) => (
              <div key={dp.label} className="rounded-2xl p-5"
                style={{ background: CREAM, border: `2px solid ${LINE}` }}>
                <div className="text-3xl mb-3">{dp.emoji}</div>
                <div className="font-black text-lg uppercase tracking-tight" style={{ fontFamily: b.displayFont, color: BRICK }}>
                  {dp.label}
                </div>
                <div className="text-xs font-bold tracking-widest mt-1 mb-4" style={{ color: TEAL }}>
                  {dp.time}
                </div>
                <ul className="space-y-1">
                  {dp.items.map((it) => (
                    <li key={it} className="text-sm" style={{ color: MUTED }}>· {it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20" style={{ background: BRICK, color: AINK }}>
        <div className="mx-auto max-w-5xl px-5 text-center">
          <h2 className="text-4xl font-black uppercase sm:text-5xl" style={{ fontFamily: b.displayFont }}>
            {b.ctaTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-md opacity-80">{b.ctaSub}</p>
          <a href="#menu"
            className="mt-8 inline-block rounded-full px-8 py-4 text-sm font-bold uppercase tracking-wide transition hover:scale-105"
            style={{ background: CREAM, color: BRICK }}>
            Objednat teď →
          </a>
        </div>
      </section>

      {/* ── KONTAKT ── */}
      <section id="kontakt" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-2xl px-5">
          <div className="text-center mb-10">
            <p className="text-xs tracking-widest uppercase mb-3" style={{ color: BRICK }}>Napiš nám</p>
            <h2 className="text-4xl font-black uppercase" style={{ fontFamily: b.displayFont, color: INK }}>Kontakt</h2>
          </div>

          {contactSent ? (
            <div className="rounded-3xl p-8 text-center" style={{ background: SURF, border: `2px solid ${LINE}` }}>
              <div className="text-4xl mb-3">🍳</div>
              <p className="font-black text-lg uppercase" style={{ fontFamily: b.displayFont, color: INK }}>Děkujeme!</p>
              <p className="mt-1" style={{ color: MUTED }}>Ozveme se ti co nejdřív.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Jméno" className="rounded-2xl px-4 py-3 text-sm focus:outline-none"
                  style={{ background: SURF, border: `2px solid ${LINE}`, color: INK }} />
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  type="email" placeholder="E-mail" className="rounded-2xl px-4 py-3 text-sm focus:outline-none"
                  style={{ background: SURF, border: `2px solid ${LINE}`, color: INK }} />
              </div>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={4} placeholder="Tvoje zpráva…" className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none resize-none"
                style={{ background: SURF, border: `2px solid ${LINE}`, color: INK }} />
              <button onClick={submitContact} disabled={sending}
                className="w-full rounded-full py-3.5 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.02] disabled:opacity-50"
                style={{ background: BRICK, color: AINK }}>
                {sending ? "Odesílám…" : "Odeslat zprávu"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: INK, color: CREAM }}>
        <div className="mx-auto max-w-5xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-black text-lg uppercase" style={{ fontFamily: b.displayFont, color: BRICK }}>
            Prostě snídaně
          </span>
          <p className="text-sm opacity-60">© {new Date().getFullYear()} Prostě snídaně · Praha</p>
          <a href="/" className="text-sm opacity-50 hover:opacity-100 transition" style={{ color: CREAM }}>Food Factory</a>
        </div>
      </footer>
    </div>
  );
}
