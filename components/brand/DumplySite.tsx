"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { createSupabaseBrowser } from "@/lib/auth/client";
import { formatCzk } from "@/lib/types";
import type { MenuItem } from "@/lib/types";
import type { BrandTheme } from "@/lib/brand/registry";
import { ProductDetailModal } from "@/components/brand/ProductDetailModal";

const SECTIONS = [
  { id: "uvod", label: "Úvod" },
  { id: "menu", label: "Menu" },
  { id: "o-nas", label: "O nás" },
  { id: "galerie", label: "Galerie" },
  { id: "kontakt", label: "Kontakt" },
];

export function DumplySite({ brand: b, menu }: { brand: BrandTheme; menu: MenuItem[] }) {
  const { count, openCart } = useCart();
  const [detail, setDetail] = useState<MenuItem | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("uvod");
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, []);

  // Sticky nav stín + aktivní sekce
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  // Kategorie menu
  const categories = new Map<string, MenuItem[]>();
  for (const it of menu) {
    const list = categories.get(it.category) ?? [];
    list.push(it);
    categories.set(it.category, list);
  }

  return (
    <div style={{ fontFamily: b.bodyFont }}>
      {/* ── PLOVOUCÍ NAVIGACE ── */}
      <header className="sticky top-0 z-40 transition-all duration-300"
        style={{
          background: scrolled ? `color-mix(in srgb, ${b.bg} 92%, transparent)` : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
          borderBottom: `1px solid ${scrolled ? b.line : "transparent"}`,
          boxShadow: scrolled ? "0 4px 24px rgba(92,51,23,0.06)" : "none",
        }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <a href="#uvod" className="flex items-center gap-2.5">
            <span className="block rounded-full overflow-hidden shrink-0"
              style={{ width: 40, height: 40, border: `2px solid ${b.line}` }}>
              <Image src="/brands/dumply.png" alt="Dumply" width={40} height={40} className="object-cover" />
            </span>
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: b.displayFont, color: b.ink }}>Dumply</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}
                className="relative rounded-full px-4 py-2 text-sm font-semibold transition"
                style={{ color: active === s.id ? b.accent : b.muted }}>
                {s.label}
                {active === s.id && (
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-1 h-1 w-1 rounded-full"
                    style={{ background: b.pop }} />
                )}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href={loggedIn ? "/ucet/profil" : "/ucet/prihlaseni"}
              className="hidden sm:block rounded-full px-3 py-2 text-sm font-semibold transition hover:opacity-70"
              style={{ color: b.ink }}>
              {loggedIn ? "Účet" : "Přihlásit"}
            </Link>
            <button onClick={openCart}
              className="rounded-full px-4 py-2 text-sm font-bold transition hover:scale-105"
              style={{ background: b.accent, color: b.accentInk }}>
              Košík{count > 0 ? ` · ${count}` : ""}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden rounded-full p-2" style={{ color: b.ink }}>
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobilní menu */}
        {menuOpen && (
          <nav className="md:hidden px-5 pb-4 flex flex-col gap-1" style={{ borderTop: `1px solid ${b.line}` }}>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ color: b.ink }}>
                {s.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* ── ÚVOD / HERO ── */}
      <section id="uvod" className="scroll-mt-24 relative overflow-hidden">
        {/* růžové blob pozadí */}
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full blur-3xl opacity-40" style={{ background: b.pop }} />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full blur-3xl opacity-30" style={{ background: b.surface }} />
        <div className="relative mx-auto max-w-5xl px-5 pt-12 pb-20 sm:pt-20">
          <div className="grid items-center gap-10 sm:grid-cols-2">
            <div>
              <p className="mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-bold tracking-wide"
                style={{ background: b.surface, color: b.accent, border: `2px solid ${b.line}` }}>
                {b.eyebrow}
              </p>
              <h1 className="whitespace-pre-line text-5xl font-bold leading-[1.05] sm:text-6xl"
                style={{ fontFamily: b.displayFont, color: b.ink }}>
                {b.heroTitle}
              </h1>
              <p className="mt-5 max-w-md text-lg" style={{ color: b.muted }}>{b.heroSub}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#menu" className="rounded-full px-7 py-3.5 text-sm font-bold transition hover:scale-105"
                  style={{ background: b.accent, color: b.accentInk }}>Prohlédnout menu →</a>
                <a href="#o-nas" className="rounded-full px-7 py-3.5 text-sm font-bold transition hover:scale-105"
                  style={{ background: b.pop, color: b.ink }}>Náš příběh</a>
              </div>
            </div>
            {/* Velké logo s jemným pohupováním */}
            <div className="flex justify-center">
              <div className="ff-float" style={{ animation: "ff-float 4s ease-in-out infinite" }}>
                <span className="block rounded-full overflow-hidden drop-shadow-xl"
                  style={{ width: 340, height: 340, border: `3px solid ${b.line}` }}>
                  <Image src="/brands/dumply.png" alt="Dumply knedlíček" width={340} height={340}
                    className="object-cover" priority />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MENU (s vyskakováním) ── */}
      <section id="menu" className="scroll-mt-24 py-20" style={{ background: b.surface }}>
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold" style={{ fontFamily: b.displayFont, color: b.ink }}>Menu</h2>
            <p className="mt-2" style={{ color: b.muted }}>Najeď myší na knedlíček 🥟</p>
          </div>

          {Array.from(categories.entries()).map(([category, list]) => (
            <div key={category} className="mb-12">
              <h3 className="mb-6 text-sm font-bold uppercase tracking-[0.2em]" style={{ color: b.accent }}>{category}</h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((item) => (
                  <div key={item.id}
                    className="group rounded-3xl p-5 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03]"
                    style={{ background: b.bg, border: `2px solid ${b.line}`, boxShadow: "0 2px 0 " + b.line }}>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-lg" style={{ fontFamily: b.displayFont, color: b.ink }}>{item.name}</h4>
                      <span className="shrink-0 rounded-full px-2.5 py-1 text-sm font-bold"
                        style={{ background: b.pop, color: b.ink }}>{formatCzk(item.priceCzk)}</span>
                    </div>
                    <p className="mt-2 text-sm min-h-[40px]" style={{ color: b.muted }}>{item.description}</p>
                    <button onClick={() => setDetail(item)} disabled={!item.available}
                      className="mt-4 w-full rounded-full py-2.5 text-sm font-bold transition group-hover:scale-105 disabled:opacity-40"
                      style={{ background: b.accent, color: b.accentInk }}>
                      {item.available ? "Přidat do košíku" : "Vyprodáno"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── O NÁS ── */}
      <section id="o-nas" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-5xl px-5 grid gap-10 sm:grid-cols-2 items-center">
          <div className="flex justify-center order-2 sm:order-1">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: b.pop }} />
              <span className="relative block rounded-full overflow-hidden"
                style={{ width: 260, height: 260, border: `3px solid ${b.line}` }}>
                <Image src="/brands/dumply.png" alt="Dumply" width={260} height={260} className="object-cover" />
              </span>
            </div>
          </div>
          <div className="order-1 sm:order-2">
            <h2 className="text-4xl font-bold" style={{ fontFamily: b.displayFont, color: b.ink }}>O nás</h2>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: b.muted }}>
              Dumply je malá kuchyně v srdci Prahy, kde milujeme ruční knedlíčky. Každé ráno skládáme
              těsto, plníme čerstvými surovinami a paříme v bambusových košících.
            </p>
            <p className="mt-3 text-lg leading-relaxed" style={{ color: b.muted }}>
              Žádné mražené polotovary — jen poctivá práce, špetka lásky a omáčky, co lepí prsty.
              Věříme, že dobré jídlo má dělat radost. A taky se trochu usmívat. 🥟
            </p>
            <div className="mt-6 flex gap-6">
              <div>
                <div className="text-3xl font-bold" style={{ fontFamily: b.displayFont, color: b.accent }}>100%</div>
                <div className="text-sm" style={{ color: b.muted }}>ručně skládané</div>
              </div>
              <div>
                <div className="text-3xl font-bold" style={{ fontFamily: b.displayFont, color: b.accent }}>každé ráno</div>
                <div className="text-sm" style={{ color: b.muted }}>čerstvé</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALERIE ── */}
      <section id="galerie" className="scroll-mt-24 py-20" style={{ background: b.surface }}>
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-4xl font-bold text-center mb-3" style={{ fontFamily: b.displayFont, color: b.ink }}>Galerie</h2>
          <p className="text-center mb-10" style={{ color: b.muted }}>Brzy sem přibydou fotky našich knedlíčků</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[0,1,2,3,4,5].map((i) => (
              <div key={i}
                className="aspect-square rounded-3xl flex items-center justify-center transition hover:scale-105"
                style={{ background: i % 2 ? b.bg : b.pop, border: `2px solid ${b.line}` }}>
                <span className="text-5xl opacity-60">🥟</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KONTAKT + FORMULÁŘ + SOCIÁLNÍ SÍTĚ ── */}
      <section id="kontakt" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="text-4xl font-bold text-center" style={{ fontFamily: b.displayFont, color: b.ink }}>Napiš nám</h2>
          <p className="text-center mt-2 mb-10" style={{ color: b.muted }}>Máš dotaz, nápad nebo chuť na spolupráci?</p>
          <ContactForm brand={b} />

          <div className="mt-12 text-center">
            <p className="text-sm mb-4" style={{ color: b.muted }}>Sleduj nás</p>
            <div className="flex justify-center gap-4">
              <a href="#" aria-label="Facebook"
                className="flex items-center justify-center rounded-full transition hover:scale-110"
                style={{ width: 48, height: 48, background: b.surface, border: `2px solid ${b.line}` }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={b.accent}><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
              </a>
              <a href="#" aria-label="Instagram"
                className="flex items-center justify-center rounded-full transition hover:scale-110"
                style={{ width: 48, height: 48, background: b.surface, border: `2px solid ${b.line}` }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={b.accent} strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="1" fill={b.accent} stroke="none"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: b.accent }}>
        <div className="mx-auto max-w-5xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="block rounded-full overflow-hidden" style={{ width: 36, height: 36 }}>
              <Image src="/brands/dumply.png" alt="Dumply" width={36} height={36} className="object-cover" />
            </span>
            <span className="font-bold text-lg" style={{ fontFamily: b.displayFont, color: b.accentInk }}>Dumply</span>
          </div>
          <p className="text-sm" style={{ color: b.accentInk, opacity: 0.8 }}>© {new Date().getFullYear()} Dumply · <a href="/" className="underline-offset-2 hover:underline" style={{ color: "inherit" }}>Powered by Food Factory</a></p>
          <a href="/" className="text-sm" style={{ color: b.accentInk, opacity: 0.7 }}>Food Factory</a>
        </div>
      </footer>

      {detail && (
        <ProductDetailModal
          item={detail}
          onClose={() => setDetail(null)}
          theme={{
            bg: b.bg, surface: b.surface, ink: b.ink, muted: b.muted,
            line: b.line, accent: b.accent, accentInk: b.accentInk,
            radius: 24, border: `2px solid ${b.line}`,
            displayFont: b.displayFont,
          }}
        />
      )}
    </div>
  );
}

function ContactForm({ brand: b }: { brand: BrandTheme }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    try {
      await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, concept: "dumply" }),
      });
    } catch { /* best-effort */ }
    setSending(false);
    setSent(true);
  }

  const inputStyle = { background: b.bg, border: `2px solid ${b.line}`, color: b.ink };

  if (sent) {
    return (
      <div className="rounded-3xl p-8 text-center" style={{ background: b.surface, border: `2px solid ${b.line}` }}>
        <div className="text-4xl mb-3">🥟</div>
        <p className="font-bold text-lg" style={{ fontFamily: b.displayFont, color: b.ink }}>Děkujeme!</p>
        <p className="mt-1" style={{ color: b.muted }}>Ozveme se ti co nejdřív.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Jméno"
          className="rounded-2xl px-4 py-3 text-sm focus:outline-none" style={inputStyle} />
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="E-mail"
          className="rounded-2xl px-4 py-3 text-sm focus:outline-none" style={inputStyle} />
      </div>
      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Tvoje zpráva…"
        className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none resize-none" style={inputStyle} />
      <button onClick={submit} disabled={sending}
        className="w-full rounded-full py-3.5 text-sm font-bold transition hover:scale-[1.02] disabled:opacity-50"
        style={{ background: b.accent, color: b.accentInk }}>
        {sending ? "Odesílám…" : "Odeslat zprávu"}
      </button>
    </div>
  );
}
