"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart";
import { createSupabaseBrowser } from "@/lib/auth/client";
import { formatCzk } from "@/lib/types";
import type { MenuItem } from "@/lib/types";
import type { BrandTheme } from "@/lib/brand/registry";
import { ProductDetailModal } from "@/components/brand/ProductDetailModal";
import { useCustomerLocale, itemName, itemDesc, itemCategory, LangToggle } from "@/lib/customer-locale";

const SECTIONS = [
  { id: "uvod", label: "Úvod", labelEn: "Home" },
  { id: "menu", label: "Menu", labelEn: "Menu" },
  { id: "remeslo", label: "Řemeslo", labelEn: "Craft" },
  { id: "galerie", label: "Galerie", labelEn: "Gallery" },
  { id: "kontakt", label: "Kontakt", labelEn: "Contact" },
];

const COPY = {
  cs: {
    account: "Účet", login: "Přihlásit",
    h1a: "Umlácený. Roztavený.", h1b: "Tvůj.",
    lede: "Tence umlácené hovězí placky, roztavený cheddar a domácí omáčky. Žádný mrazák. Žádné kompromisy. Jen řemeslo.",
    cta1: "Objednat →", cta2: "Naše řemeslo",
    menuKicker: "Jídelní lístek", menuH2: "Menu",
    menuNote: "Malá karta, velká pozornost. Měníme podle sezóny a toho, co seženeme čerstvé.",
    menuEmpty: "Menu se právě připravuje…",
    craftKicker: "Jak to děláme", craftH2a: "Řemeslo,", craftH2b: "ne fastfood.",
    craftP: "Stojíme za plotnou s rukama v rukavicích a hlídáme každou placku. Kvalita má cenu — a my ji nesnižujeme.",
    process: [
      { n: "01", t: "Umlátíme", d: "Kulička hovězího z farmy, přímo na rozpálenou plotnu. Tlak, sekundy, křupavé okraje." },
      { n: "02", t: "Roztavíme", d: "Cheddar přímo na placku, dokud nezačne téct přes hranu. Žádný spěch." },
      { n: "03", t: "Složíme", d: "Bulka z lokální pekárny, kvašená okurka, naše tajná omáčka. Hotovo." },
    ],
    galKicker: "Backstage", galH2: "Galerie",
    galP: "Sem přijdou fotky z plotny a kuchyně. Zatím placeholdery.",
    ctaH2: "Pořádný hlad?",
    ctaP: "Objednej smash online — vyzvednutí za rohem, nebo rozvoz až ke dveřím.",
    contactKicker: "Napiš nám", contactH2: "Kontakt",
    thanks: "Díky!", thanksP: "Ozveme se co nejdřív.",
    phName: "Jméno", phEmail: "E-mail", phMsg: "Tvoje zpráva…",
    bistro: "L.T. Smash bistro", hours: "Po–Ne 11:00 — 22:00",
    terms: "Obchodní podmínky",
  },
  en: {
    account: "Account", login: "Sign in",
    h1a: "Smashed. Melted.", h1b: "Yours.",
    lede: "Thin-smashed beef patties, melted cheddar and house-made sauces. No freezer. No compromises. Just craft.",
    cta1: "Order →", cta2: "Our craft",
    menuKicker: "Menu", menuH2: "Menu",
    menuNote: "A short menu, full attention. It changes with the season and whatever we source fresh.",
    menuEmpty: "The menu is being prepared…",
    craftKicker: "How we do it", craftH2a: "Craft,", craftH2b: "not fast food.",
    craftP: "We stand at the griddle, gloves on, watching every single patty. Quality has a price — and we don't cut it.",
    process: [
      { n: "01", t: "We smash", d: "A ball of farm beef straight onto the hot griddle. Pressure, seconds, crispy edges." },
      { n: "02", t: "We melt", d: "Cheddar right on the patty until it runs over the edge. No rush." },
      { n: "03", t: "We build", d: "A bun from a local bakery, fermented pickle, our secret sauce. Done." },
    ],
    galKicker: "Backstage", galH2: "Gallery",
    galP: "Photos from the griddle and the kitchen are coming. Placeholders for now.",
    ctaH2: "Properly hungry?",
    ctaP: "Order your smash online — pickup around the corner, or delivery to your door.",
    contactKicker: "Write to us", contactH2: "Contact",
    thanks: "Thanks!", thanksP: "We'll get back to you shortly.",
    phName: "Name", phEmail: "E-mail", phMsg: "Your message…",
    bistro: "L.T. Smash bistro", hours: "Mon–Sun 11:00 — 22:00",
    terms: "Terms & Conditions",
  },
};

// Galerie – placeholder bloky (později nahradíš fotkami do /public/smash/)
const GALLERY = [
  { tall: true, label: "Plotna v 8 ráno" },
  { tall: false, label: "Smash #1" },
  { tall: false, label: "Hands at work" },
  { tall: true, label: "Cheddar pull" },
  { tall: false, label: "Backstage" },
  { tall: false, label: "Plný tác" },
];

const TICKER = "SMASHED DAILY ✶ NO FREEZER ✶ LOCAL BEEF ✶ HAND-BUILT ✶ ";

export function SmashSite({ brand: b, menu }: { brand: BrandTheme; menu: MenuItem[] }) {
  const { count, openCart } = useCart();
  const { locale } = useCustomerLocale();
  const c = COPY[locale];
  const [detail, setDetail] = useState<MenuItem | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("uvod");
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  useEffect(() => {
    const sb = createSupabaseBrowser();
    sb.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const categories = new Map<string, MenuItem[]>();
  for (const it of menu) {
    const list = categories.get(itemCategory(it, locale)) ?? [];
    list.push(it);
    categories.set(itemCategory(it, locale), list);
  }

  async function submitContact() {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setSending(true);
    try {
      await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, concept: "smash" }),
      });
    } catch { /* best-effort */ }
    setSending(false);
    setContactSent(true);
  }

  const INK = b.ink;        // krémová/světlá
  const BG = b.bg;          // skoro černá
  const SURF = b.surface;
  const MUTED = b.muted;
  const LINE = b.line;
  const ACC = b.accent;     // oranžová
  const AINK = b.accentInk;

  const DISPLAY = b.displayFont;
  const BODY = b.bodyFont;

  return (
    <div style={{ fontFamily: BODY, background: BG, color: INK, overflowX: "hidden" }}>
      <style>{`
        .sm-display { font-family: ${DISPLAY}; }
        .sm-grain {
          position:fixed; inset:0; z-index:1; pointer-events:none; opacity:.04; mix-blend-mode:overlay;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size:200px 200px;
        }
        .sm-ticker-track { display:inline-flex; white-space:nowrap; }
        .sm-hover-card { transition: transform .25s cubic-bezier(.2,.8,.2,1); }
        .sm-hover-card:hover { transform: translateY(-4px); }
        .sm-link-underline { position:relative; }
        .sm-link-underline::after {
          content:""; position:absolute; left:0; bottom:-3px; height:2px; width:0; background:${ACC}; transition:width .25s;
        }
        .sm-link-underline:hover::after { width:100%; }
        .sm-menu-row { transition: background .2s, padding-left .2s; }
        .sm-menu-row:hover { background:${SURF}; padding-left:14px; }
        .sm-add { transition: transform .12s, background .15s; }
        .sm-add:hover { transform: scale(1.12); }
        .sm-gal { transition: filter .35s, transform .35s; filter: grayscale(1) contrast(1.05); }
        .sm-gal:hover { filter: grayscale(0); transform: scale(1.02); }
        @keyframes sm-rotate { to { transform: rotate(360deg); } }
        .sm-spin-badge { animation: sm-rotate 22s linear infinite; }
        .sm-dots {
          background-image: radial-gradient(${MUTED} 1.4px, transparent 1.4px);
          background-size: 14px 14px;
        }
        @media(max-width:760px){ .sm-nav-links{ display:none !important; } }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="sm-grain" />

      {/* ── NAV ── */}
      <header className="sticky top-0 z-40"
        style={{
          background: scrolled ? `color-mix(in srgb, ${BG} 88%, transparent)` : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: `1px solid ${scrolled ? LINE : "transparent"}`,
          transition: "all .3s",
        }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <a href="#uvod" className="flex items-center gap-3">
            <span className="rounded-full overflow-hidden grid place-items-center"
              style={{ width: 42, height: 42, background: INK }}>
              <Image src="/brands/smash.png" alt="Smash" width={42} height={42} className="object-contain" style={{ width: "82%", height: "82%" }} />
            </span>
            <span className="sm-display text-2xl font-extrabold tracking-tight" style={{ color: INK }}>L.T. SMASH</span>
          </a>

          <nav className="sm-nav-links flex items-center gap-7">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}
                className="sm-link-underline text-sm font-medium tracking-wide uppercase"
                style={{ color: active === s.id ? INK : MUTED }}>
                {locale === "en" ? s.labelEn : s.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href={loggedIn ? "/ucet/profil" : `/${b.slug}/ucet/prihlaseni`}
              className="hidden sm:block text-sm font-medium uppercase tracking-wide transition hover:opacity-70"
              style={{ color: INK }}>
              {loggedIn ? c.account : c.login}
            </Link>
            <LangToggle ink={INK} line={LINE} />
            <button onClick={openCart}
              className="text-sm font-bold uppercase tracking-wide px-5 py-2.5 transition hover:scale-105"
              style={{ background: ACC, color: AINK, borderRadius: 2 }}>
              Košík{count > 0 ? ` (${count})` : ""}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2" style={{ color: INK }}>
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="px-5 pb-4 flex flex-col gap-1" style={{ borderTop: `1px solid ${LINE}` }}>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={() => setMenuOpen(false)}
                className="py-2.5 text-sm font-medium uppercase tracking-wide" style={{ color: INK }}>
                {locale === "en" ? s.labelEn : s.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* ── HERO (centrovaná editorial kompozice) ── */}
      <section id="uvod" className="scroll-mt-16 relative overflow-hidden" style={{ minHeight: "96vh", display: "flex", alignItems: "center" }}>
        {/* obří obrysový watermark text na pozadí */}
        <div aria-hidden className="sm-display absolute select-none pointer-events-none"
          style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontSize: "min(34vw, 460px)", fontWeight: 800, lineHeight: .8, color: "transparent", WebkitTextStroke: `1.5px ${LINE}`, zIndex: 0, whiteSpace: "nowrap" }}>
          SMASH
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-5 w-full text-center">
          {/* medailon nahoře, centrovaný, bez animace */}
          <div className="flex justify-center mb-10">
            <div className="relative grid place-items-center" style={{ width: "min(280px, 64vw)", aspectRatio: "1" }}>
              <svg viewBox="0 0 200 200" className="sm-spin-badge absolute inset-0 w-full h-full" style={{ zIndex: 1 }} aria-hidden>
                <defs>
                  <path id="sm-textcircle" d="M 100,100 m -82,0 a 82,82 0 1,1 164,0 a 82,82 0 1,1 -164,0" />
                </defs>
                <text fill={MUTED} style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
                  <textPath href="#sm-textcircle" startOffset="0%">
                    SMASHED TO ORDER ✶ LOCAL BEEF ✶ NO FREEZER ✶ HAND-BUILT ✶ 
                  </textPath>
                </text>
              </svg>
              <div className="absolute inset-0 rounded-full" style={{ border: `1px solid ${LINE}`, zIndex: 1 }} />
              <div className="absolute rounded-full grid place-items-center overflow-hidden"
                style={{ inset: "16%", background: INK, zIndex: 2 }}>
                <Image src="/brands/smash.png" alt="L.T. Smash logo" width={320} height={320} className="object-contain" style={{ width: "78%", height: "78%" }} />
              </div>
            </div>
          </div>

          {/* eyebrow s čarami po obou stranách */}
          <div className="flex items-center justify-center gap-4 mb-7">
            <span style={{ width: 40, height: 1, background: LINE }} />
            <p className="text-xs font-semibold tracking-[0.35em] uppercase" style={{ color: ACC }}>
              L.T. Smash
            </p>
            <span style={{ width: 40, height: 1, background: LINE }} />
          </div>

          {/* obří headline na plnou šířku */}
          <h1 className="sm-display font-extrabold uppercase mx-auto"
            style={{ fontSize: "clamp(48px, 11vw, 150px)", lineHeight: .82, letterSpacing: "-0.03em", color: INK }}>
            {c.h1a} <span style={{ color: ACC }}>{c.h1b}</span>
          </h1>

          <p className="mx-auto mt-8 max-w-lg text-lg leading-relaxed" style={{ color: MUTED }}>
            {c.lede}
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="#menu"
              className="text-sm font-bold uppercase tracking-wider px-9 py-4 transition hover:scale-105"
              style={{ background: ACC, color: AINK, borderRadius: 2 }}>
              {c.cta1}
            </a>
            <a href="#remeslo"
              className="text-sm font-bold uppercase tracking-wider px-9 py-4 transition hover:scale-105"
              style={{ color: INK, border: `1px solid ${LINE}`, borderRadius: 2 }}>
              {c.cta2}
            </a>
          </div>
        </div>
      </section>


      {/* ── TICKER ── */}
      <div className="py-4 overflow-hidden" style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, background: INK }}>
        <div className="sm-ticker-track">
          <span className="sm-display text-lg font-bold uppercase tracking-wider" style={{ color: BG }}>{TICKER.repeat(6)}</span>
        </div>
      </div>

      {/* ── MENU ── */}
      <section id="menu" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex items-end justify-between mb-14 flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: ACC }}>{c.menuKicker}</p>
              <h2 className="sm-display text-5xl sm:text-6xl font-extrabold uppercase" style={{ letterSpacing: "-0.02em", color: INK }}>{c.menuH2}</h2>
            </div>
            <p className="max-w-xs text-sm" style={{ color: MUTED }}>
              {c.menuNote}
            </p>
          </div>

          {(categories.size > 0 ? Array.from(categories.entries()) : []).map(([category, items]) => (
            <div key={category} className="mb-14">
              <h3 className="sm-display text-sm font-bold tracking-[0.25em] uppercase mb-2 pb-4"
                style={{ color: ACC, borderBottom: `1px solid ${LINE}` }}>
                {category}
              </h3>
              <div>
                {items.map((item) => (
                  <div key={item.id} className="sm-menu-row flex items-baseline gap-4 py-5"
                    style={{ borderBottom: `1px solid ${LINE}` }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3">
                        <span className="text-lg font-semibold" style={{ color: INK }}>{itemName(item, locale)}</span>
                        {item.tags?.includes("vegetarian") && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5" style={{ color: ACC, border: `1px solid ${ACC}`, borderRadius: 2 }}>veg</span>
                        )}
                      </div>
                      {itemDesc(item, locale) && <p className="mt-1 text-sm" style={{ color: MUTED }}>{itemDesc(item, locale)}</p>}
                    </div>
                    <span className="sm-display text-xl font-bold tabular-nums" style={{ color: INK }}>{formatCzk(item.priceCzk)}</span>
                    <button onClick={() => setDetail(item)} disabled={!item.available}
                      className="sm-add shrink-0 w-9 h-9 grid place-items-center text-lg font-bold disabled:opacity-30"
                      style={{ background: ACC, color: AINK, borderRadius: 2 }}>
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {categories.size === 0 && (
            <p style={{ color: MUTED }}>{c.menuEmpty}</p>
          )}
        </div>
      </section>

      {/* ── ŘEMESLO / PROCESS ── */}
      <section id="remeslo" className="scroll-mt-24 py-24 relative overflow-hidden" style={{ background: SURF }}>
        <div aria-hidden className="sm-dots absolute" style={{ width: 180, height: 180, right: "4%", top: "12%", opacity: .35 }} />
        <div className="relative mx-auto max-w-6xl px-5">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: ACC }}>{c.craftKicker}</p>
              <h2 className="sm-display text-4xl sm:text-5xl font-extrabold uppercase leading-[0.9]" style={{ color: INK }}>
                {c.craftH2a}<br />{c.craftH2b}
              </h2>
              <p className="mt-5 text-sm leading-relaxed" style={{ color: MUTED }}>
                {c.craftP}
              </p>
            </div>
            <div className="lg:col-span-8 grid sm:grid-cols-3 gap-px" style={{ background: LINE }}>
              {c.process.map((p) => (
                <div key={p.n} className="p-7" style={{ background: SURF }}>
                  <div className="sm-display text-5xl font-extrabold mb-4" style={{ color: ACC }}>{p.n}</div>
                  <h3 className="sm-display text-xl font-bold uppercase mb-2" style={{ color: INK }}>{p.t}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GALERIE ── */}
      <section id="galerie" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: ACC }}>{c.galKicker}</p>
              <h2 className="sm-display text-5xl sm:text-6xl font-extrabold uppercase" style={{ letterSpacing: "-0.02em", color: INK }}>{c.galH2}</h2>
            </div>
            <p className="max-w-xs text-sm" style={{ color: MUTED }}>{c.galP}</p>
          </div>

          {/* Masonry-ish grid placeholderů */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[220px]">
            {GALLERY.map((g, i) => (
              <div key={i} className={`sm-gal relative overflow-hidden grid place-items-center ${g.tall ? "row-span-2" : ""}`}
                style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 2 }}>
                <span className="sm-display text-7xl font-extrabold" style={{ color: LINE }}>✶</span>
                <span className="absolute bottom-3 left-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28" style={{ background: ACC, color: AINK }}>
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="sm-display text-5xl sm:text-7xl font-extrabold uppercase leading-[0.9]" style={{ letterSpacing: "-0.02em" }}>
            {c.ctaH2}
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg font-medium opacity-80">
            {c.ctaP}
          </p>
          <a href="#menu"
            className="mt-9 inline-block text-sm font-bold uppercase tracking-wider px-10 py-4 transition hover:scale-105"
            style={{ background: AINK, color: ACC, borderRadius: 2 }}>
            Objednat teď →
          </a>
        </div>
      </section>

      {/* ── KONTAKT ── */}
      <section id="kontakt" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-2xl px-5">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: ACC }}>{c.contactKicker}</p>
            <h2 className="sm-display text-4xl font-extrabold uppercase" style={{ color: INK }}>{c.contactH2}</h2>
          </div>
          {contactSent ? (
            <div className="text-center p-10" style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 2 }}>
              <div className="sm-display text-5xl font-extrabold mb-3" style={{ color: ACC }}>✶</div>
              <p className="sm-display text-xl font-bold uppercase" style={{ color: INK }}>{c.thanks}</p>
              <p className="mt-1" style={{ color: MUTED }}>{c.thanksP}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={c.phName} className="px-4 py-3.5 text-sm focus:outline-none"
                  style={{ background: SURF, border: `1px solid ${LINE}`, color: INK, borderRadius: 2 }} />
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  type="email" placeholder={c.phEmail} className="px-4 py-3.5 text-sm focus:outline-none"
                  style={{ background: SURF, border: `1px solid ${LINE}`, color: INK, borderRadius: 2 }} />
              </div>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={4} placeholder={c.phMsg} className="w-full px-4 py-3.5 text-sm focus:outline-none resize-none"
                style={{ background: SURF, border: `1px solid ${LINE}`, color: INK, borderRadius: 2 }} />
              <button onClick={submitContact} disabled={sending}
                className="w-full py-4 text-sm font-bold uppercase tracking-wider transition hover:scale-[1.01] disabled:opacity-50"
                style={{ background: ACC, color: AINK, borderRadius: 2 }}>
                {sending ? (locale === "en" ? "Sending…" : "Odesílám…") : (locale === "en" ? "Send" : "Odeslat")}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="mx-auto max-w-6xl px-5 py-12 grid sm:grid-cols-3 gap-8 items-start">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="rounded-full overflow-hidden grid place-items-center" style={{ width: 38, height: 38, background: INK }}>
                <Image src="/brands/smash.png" alt="Smash" width={38} height={38} className="object-contain" style={{ width: "82%", height: "82%" }} />
              </span>
              <span className="sm-display text-xl font-extrabold" style={{ color: INK }}>L.T. SMASH</span>
            </div>
            <p className="text-sm" style={{ color: MUTED }}>{c.bistro}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: ACC }}>Otevřeno</h4>
            <p className="text-sm" style={{ color: MUTED }}>{c.hours}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: ACC }}>Sledujte</h4>
            <p className="text-sm" style={{ color: MUTED }}>Instagram · Facebook</p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 py-5 flex items-center justify-between text-xs" style={{ borderTop: `1px solid ${LINE}`, color: MUTED }}>
          <span>© {new Date().getFullYear()} L.T. Smash · <a href="/" className="transition hover:underline underline-offset-2" style={{ color: "inherit" }}>Powered by Food Factory</a> · <a href="/obchodni-podminky" className="transition hover:underline underline-offset-2" style={{ color: "inherit" }}>{c.terms}</a></span>
        </div>
      </footer>

      {detail && (
        <ProductDetailModal
          item={detail}
          onClose={() => setDetail(null)}
          theme={{
            bg: BG, surface: SURF, ink: INK, muted: MUTED,
            line: LINE, accent: ACC, accentInk: AINK,
            radius: 4,
            displayFont: b.displayFont,
          }}
        />
      )}
    </div>
  );
}
