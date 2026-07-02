"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { createSupabaseBrowser } from "@/lib/auth/client";
import type { MenuItem } from "@/lib/types";
import type { BrandTheme } from "@/lib/brand/registry";
import { ProductDetailModal } from "@/components/brand/ProductDetailModal";

// Sdílená base64 WebP ikona (šálek + croissant)
const LOGO_SRC =
  "data:image/webp;base64,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";

const SPARK_SVG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0Z'/></svg>")`;

const MENU_ITEMS_STATIC = [
  { cat: "Z pánve", items: [
    { n: "Míchaná vejce na másle", d: "Tři vejce, pažitka, křupavý toast", p: 99 },
    { n: "Šakšuka", d: "Vejce v rajčatové omáčce, feta, pečivo", p: 169 },
    { n: "Anglická snídaně", d: "Vejce, slanina, fazole, klobáska, žampiony", p: 189 },
    { n: "Breakfast burrito", d: "Míchaná vejce, slanina, sýr, fazole", p: 159 },
  ]},
  { cat: "Toasty & sladké", items: [
    { n: "Avokádový toast", d: "Kváskový chléb, avokádo, pošírované vejce", p: 159 },
    { n: "Americké lívance", d: "Stack tří, javorový sirup, máslo", p: 149 },
    { n: "French toast", d: "Skořice, mascarpone, sezónní ovoce", p: 155 },
    { n: "Granola miska", d: "Jogurt, domácí granola, ovoce", p: 129 },
  ]},
  { cat: "Káva", items: [
    { n: "Flat white", d: "", p: 79 },
    { n: "Cappuccino", d: "", p: 75 },
    { n: "Espresso", d: "", p: 59 },
    { n: "Filtr dne", d: "", p: 69 },
  ]},
  { cat: "K pití", items: [
    { n: "Čerstvý pomerančový džus", d: "", p: 85 },
    { n: "Matcha latte", d: "", p: 95 },
    { n: "Domácí limonáda", d: "", p: 75 },
    { n: "Horká čokoláda", d: "", p: 79 },
  ]},
];

const DAYPARTS = [
  { h: "30deg", m: "0deg", time: "07:00–10:00", label: "Ráno", desc: "Espresso, croissant a vejce. Klasický start dne." },
  { h: "90deg", m: "200deg", time: "10:00–13:00", label: "Dopoledne", desc: "Lívance, avokádový toast a flat white v klidu." },
  { h: "150deg", m: "80deg", time: "13:00–17:00", label: "Odpoledne", desc: "Pozdní brunch nebo šakšuka, když jsi prospal ráno." },
  { h: "230deg", m: "300deg", time: "17:00–22:00", label: "Večer", desc: "Breakfast burrito a horká čokoláda na dobrou noc." },
];

const MARQUEE = "Vajíčka jak je máš rád ✦ Poctivá káva ✦ Lívance s javorovým sirupem ✦ Křupavý toast ✦ Šakšuka ✦ Flat white ✦ Od rána do večera ✦ ";

function Spark({ size = "1em", color = "currentColor" }: { size?: string; color?: string }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, verticalAlign: "middle",
      background: color,
      WebkitMask: SPARK_SVG + " center/contain no-repeat",
      mask: SPARK_SVG + " center/contain no-repeat",
    }} />
  );
}

export function SunnySideSite({ brand: _b, menu }: { brand: BrandTheme; menu: MenuItem[] }) {
  const { count, openCart } = useCart();
  const [detail, setDetail] = useState<MenuItem | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [accMode, setAccMode] = useState<"login" | "reg">("login");
  const bulbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = createSupabaseBrowser();
    sb.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, []);

  useEffect(() => {
    const box = bulbsRef.current;
    if (!box) return;
    box.innerHTML = "";
    for (let i = 0; i < 26; i++) {
      const t = (i / 26) * 2 * Math.PI;
      const b = document.createElement("span");
      b.className = "ss-bulb";
      b.style.left = `${50 + 47 * Math.cos(t)}%`;
      b.style.top = `${50 + 45 * Math.sin(t)}%`;
      b.style.animationDelay = i % 2 ? "0s" : ".7s";
      box.appendChild(b);
    }
  }, []);

  const closeAll = () => setAccOpen(false);

  // Merge DB menu + static fallback.
  // U DB položek neseme celý MenuItem (kvůli detailu s customizacemi);
  // statický fallback je jen k zobrazení — bez objednávání (nemá DB id).
  type DisplayItem = { n: string; d: string; p: number; item: MenuItem | null };
  const displayGroups: { cat: string; items: DisplayItem[] }[] = (() => {
    if (menu && menu.length > 0) {
      const map = new Map<string, DisplayItem[]>();
      for (const it of menu) {
        const g = map.get(it.category) ?? [];
        g.push({ n: it.name, d: it.description ?? "", p: it.priceCzk, item: it });
        map.set(it.category, g);
      }
      return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
    }
    return MENU_ITEMS_STATIC.map(g => ({ cat: g.cat, items: g.items.map(i => ({ ...i, item: null })) }));
  })();

  return (
    <div style={{ fontFamily: '"DM Sans", system-ui, sans-serif', background: "var(--cream)", color: "var(--ink)", overflowX: "hidden" }}>
      <style>{`
        :root {
          --cream: #F2E7CF; --paper: #F7EFDC; --teal: #2E807A; --teal-deep: #1E5B56;
          --brick: #BB4A2E; --brick-deep: #963822; --amber: #E7A52C; --ink: #231A12; --ink-soft: #5a4a38;
        }
        .ss-grain { position:fixed;inset:0;z-index:9;pointer-events:none;opacity:.09;mix-blend-mode:multiply;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size:240px 240px }
        .ss-vignette { position:fixed;inset:0;z-index:8;pointer-events:none;
          background:radial-gradient(120% 120% at 50% 40%,transparent 62%,rgba(35,26,18,.16)) }
        .ss-topbar { position:sticky;top:0;z-index:50;background:var(--paper);border-bottom:3px solid var(--ink) }
        .ss-topbar .row { display:flex;align-items:center;gap:14px;height:128px;max-width:1080px;margin:0 auto;padding:0 24px }
        .ss-brand { display:flex;align-items:center;gap:14px }
        .ss-brand img { width:108px;height:108px;display:block;border-radius:50%;filter:drop-shadow(2px 4px 4px rgba(0,0,0,.3)) }
        .ss-nav { display:flex;gap:24px;margin-left:auto;align-items:center }
        .ss-nav a { font-weight:500;font-size:15px;letter-spacing:.02em;color:inherit;text-decoration:none }
        .ss-nav a:hover { color:var(--brick) }
        .ss-icon-btn { font-family:"DM Sans",sans-serif;cursor:pointer;background:none;border:none;font-weight:600;font-size:15px;color:var(--ink);display:inline-flex;align-items:center;gap:7px }
        .ss-icon-btn:hover { color:var(--brick) }
        .ss-cart-btn { background:var(--brick);color:var(--paper);padding:10px 18px;border-radius:999px;border:3px solid var(--ink);font-weight:700;box-shadow:3px 3px 0 var(--ink);transition:transform .12s,box-shadow .12s }
        .ss-cart-btn:hover { transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--ink) }
        .ss-hero { position:relative;background:var(--teal);color:var(--paper);border-bottom:6px solid var(--ink);overflow:hidden;padding:64px 0 76px }
        .ss-hero::before { content:"";position:absolute;inset:-100%;z-index:0;
          background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(247,239,220,.11) 0deg 8deg,transparent 8deg 16deg);
          animation:ss-spin 110s linear infinite }
        @keyframes ss-spin { to { transform:rotate(360deg) } }
        .ss-hero .inner { position:relative;z-index:1;display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;max-width:1080px;margin:0 auto;padding:0 24px }
        .ss-eyebrow { display:inline-flex;align-items:center;gap:8px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;font-size:13px;color:var(--amber) }
        .ss-h1 { font-family:"Anton",Impact,sans-serif;text-transform:uppercase;letter-spacing:.01em;line-height:.95;font-size:clamp(56px,9vw,118px);margin:6px 0 22px;color:var(--paper) }
        .ss-h1 .y { color:var(--amber) }
        .ss-lede { max-width:30ch;font-size:18px;color:#e9e0cd;margin-bottom:26px }
        .ss-hero-cta { display:flex;gap:14px;flex-wrap:wrap }
        .ss-btn-amber { background:var(--amber);color:var(--ink);padding:14px 26px;border-radius:999px;border:3px solid var(--ink);font-weight:700;cursor:pointer;box-shadow:4px 4px 0 var(--ink);transition:transform .12s,box-shadow .12s;text-decoration:none;display:inline-block }
        .ss-btn-amber:hover { transform:translate(-1px,-1px);box-shadow:6px 6px 0 var(--ink) }
        .ss-btn-ghost { padding:14px 24px;border-radius:999px;border:3px solid var(--paper);color:var(--paper);font-weight:700;text-decoration:none;display:inline-block }
        .ss-btn-ghost:hover { background:var(--paper);color:var(--teal-deep) }
        .ss-hero-badge { justify-self:center;position:relative }
        .ss-hero-badge img { width:min(360px,80%);display:block;margin:0 auto;border-radius:50%;filter:drop-shadow(4px 9px 7px rgba(0,0,0,.28)) }
        .ss-bs1 { position:absolute;color:var(--amber);top:-2px;right:24px;font-size:30px;animation:ss-tw 3s ease-in-out infinite }
        .ss-bs2 { position:absolute;color:var(--amber);bottom:30px;left:2px;font-size:20px;animation:ss-tw 3s ease-in-out infinite .8s }
        @keyframes ss-tw { 0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.25);opacity:1} }
        .ss-band { overflow:hidden;background:var(--brick);color:var(--paper);border-bottom:6px solid var(--ink) }
        .ss-band .line { display:flex;align-items:center;gap:34px;white-space:nowrap;font-family:"Anton",Impact,sans-serif;text-transform:uppercase;font-size:clamp(26px,4.4vw,46px);padding:26px 0 }
        .ss-marquee { display:inline-block;animation:ss-slide 28s linear infinite }
        @keyframes ss-slide { to { transform:translateX(-50%) } }
        .ss-menu-sec { position:relative;padding:84px 0 90px;background:radial-gradient(circle at 12% 8%,rgba(46,128,122,.10),transparent 38%),radial-gradient(circle at 88% 92%,rgba(187,74,46,.10),transparent 40%),var(--cream) }
        .ss-sec-head { text-align:center;margin-bottom:48px }
        .ss-kicker { display:inline-flex;align-items:center;gap:10px;color:var(--brick);font-weight:700;letter-spacing:.18em;text-transform:uppercase;font-size:13px }
        .ss-h2 { font-family:"Anton",Impact,sans-serif;text-transform:uppercase;letter-spacing:.01em;line-height:.95;font-size:clamp(40px,6vw,68px);margin-top:8px }
        .ss-board { position:relative;background:var(--paper);border:4px solid var(--ink);border-radius:14px;padding:40px clamp(24px,5vw,56px);box-shadow:0 0 0 5px var(--paper),0 0 0 9px var(--ink),10px 12px 0 rgba(35,26,18,.18);max-width:1080px;margin:0 auto }
        .ss-enamel { box-shadow:0 0 0 5px var(--cream),0 0 0 9px var(--ink),10px 12px 0 rgba(35,26,18,.18) }
        .ss-board-cols { display:grid;grid-template-columns:1fr 1fr;gap:46px 56px }
        .ss-cat h3 { font-family:"Anton",Impact,sans-serif;text-transform:uppercase;letter-spacing:.03em;font-size:24px;color:var(--teal-deep);display:flex;align-items:center;gap:10px;padding-bottom:10px;margin-bottom:14px;border-bottom:3px solid var(--ink) }
        .ss-item-wrap { padding:6px 0;border-bottom:1px solid rgba(35,26,18,.10) }
        .ss-item-wrap:last-child { border-bottom:0 }
        .ss-row-item { display:flex;align-items:flex-end;gap:8px;padding:9px 0 }
        .ss-nm { font-family:"DM Mono",monospace;font-weight:500;font-size:16px }
        .ss-ds { flex:1;border-bottom:2px dotted var(--ink-soft);transform:translateY(-5px);opacity:.6 }
        .ss-pr { font-family:"DM Mono",monospace;font-weight:500;font-size:16px;color:var(--brick);white-space:nowrap }
        .ss-add { flex:0 0 auto;width:27px;height:27px;border-radius:50%;border:2px solid var(--ink);background:var(--brick);color:var(--paper);font-weight:700;cursor:pointer;line-height:1;font-size:17px;display:inline-flex;align-items:center;justify-content:center;transition:transform .1s }
        .ss-add:hover { background:var(--brick-deep);transform:scale(1.12) }
        .ss-desc { display:block;font-size:13px;color:var(--ink-soft);margin-top:2px }
        .ss-openday { position:relative;background:var(--teal-deep);padding:90px 0;border-top:6px solid var(--ink);border-bottom:6px solid var(--ink);overflow:hidden }
        .ss-openday::before { content:"";position:absolute;inset:-100%;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(231,165,44,.08) 0 7deg,transparent 7deg 14deg);animation:ss-spin 140s linear infinite }
        .ss-sign { position:relative;z-index:1;max-width:760px;margin:0 auto;text-align:center;background:var(--brick);border:5px solid var(--ink);border-radius:200px/120px;padding:50px 56px;box-shadow:0 0 0 6px var(--paper),0 0 0 11px var(--ink) }
        .ss-sign .small { color:var(--amber);font-weight:700;letter-spacing:.25em;text-transform:uppercase;font-size:13px }
        .ss-sign h2 { color:var(--paper);font-family:"Anton",Impact,sans-serif;text-transform:uppercase;font-size:clamp(34px,5.4vw,60px);margin:8px 0 6px }
        .ss-sign .hrs { color:#f1e7d4;font-family:"DM Mono",monospace;letter-spacing:.04em;font-size:17px }
        .ss-bulbs-wrap { position:absolute;inset:14px;border-radius:185px/108px;pointer-events:none }
        .ss-bulb { position:absolute;width:11px;height:11px;border-radius:50%;background:var(--amber);box-shadow:0 0 8px rgba(231,165,44,.9);border:2px solid var(--ink);animation:ss-blink 1.4s steps(1) infinite }
        @keyframes ss-blink { 0%,49%{opacity:1}50%,100%{opacity:.25} }
        .ss-dayparts { position:relative;padding:84px 0 92px;background:var(--cream) }
        .ss-dp-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:46px;max-width:1080px;margin-left:auto;margin-right:auto;padding:0 24px }
        .ss-dp { background:var(--paper);border:4px solid var(--ink);border-radius:14px;padding:26px 22px;box-shadow:6px 6px 0 var(--ink);transition:transform .15s,box-shadow .15s }
        .ss-dp:hover { transform:translate(-2px,-2px);box-shadow:9px 9px 0 var(--ink) }
        .ss-clock { width:70px;height:70px;border-radius:50%;border:4px solid var(--ink);background:var(--teal);position:relative;margin-bottom:16px;box-shadow:0 0 0 4px var(--paper),0 0 0 7px var(--ink) }
        .ss-clock-h { position:absolute;left:50%;top:50%;background:var(--paper);transform-origin:bottom center;border-radius:2px;width:3px;height:20px }
        .ss-clock-m { position:absolute;left:50%;top:50%;background:var(--paper);transform-origin:bottom center;border-radius:2px;width:3px;height:26px }
        .ss-clock-dot { position:absolute;left:50%;top:50%;width:8px;height:8px;background:var(--amber);border:2px solid var(--ink);border-radius:50%;transform:translate(-50%,-50%);z-index:2 }
        .ss-dp .time { font-family:"DM Mono",monospace;color:var(--brick);font-weight:500;font-size:13px;letter-spacing:.04em }
        .ss-dp h3 { font-family:"Anton",Impact,sans-serif;text-transform:uppercase;font-size:22px;margin:2px 0 8px }
        .ss-dp p { font-size:15px;color:var(--ink-soft) }
        .ss-cta { background:var(--amber);padding:78px 0;border-top:6px solid var(--ink);text-align:center }
        .ss-cta h2 { font-family:"Anton",Impact,sans-serif;text-transform:uppercase;font-size:clamp(38px,6vw,64px);margin-bottom:12px }
        .ss-cta p { font-size:19px;margin-bottom:28px;max-width:34ch;margin-left:auto;margin-right:auto }
        .ss-btn-dark { display:inline-flex;align-items:center;gap:10px;background:var(--ink);color:var(--paper);padding:16px 34px;border-radius:999px;font-weight:700;font-size:18px;border:3px solid var(--ink);cursor:pointer;box-shadow:5px 5px 0 var(--brick-deep);transition:transform .12s,box-shadow .12s }
        .ss-btn-dark:hover { transform:translate(-2px,-2px);box-shadow:7px 7px 0 var(--brick-deep);color:var(--paper) }
        .ss-footer { background:var(--ink);color:var(--cream);padding:54px 0 40px;border-top:6px solid var(--brick) }
        .ss-foot { display:flex;justify-content:space-between;gap:30px;flex-wrap:wrap;align-items:flex-start;max-width:1080px;margin:0 auto;padding:0 24px }
        .ss-foot-col h4 { font-family:"Anton",Impact,sans-serif;text-transform:uppercase;font-size:15px;letter-spacing:.05em;color:var(--amber);margin-bottom:10px }
        .ss-foot-col p,.ss-foot-col a { display:block;color:#d8cdb6;font-size:14px;line-height:1.9;text-decoration:none }
        .ss-foot-col a:hover { color:var(--cream) }
        .ss-copy { margin-top:34px;padding-top:18px;border-top:1px solid #3a2c1f;color:#9c8e76;font-size:13px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;max-width:1080px;margin-left:auto;margin-right:auto;padding-left:24px;padding-right:24px }
        .ss-backdrop { position:fixed;inset:0;background:rgba(35,26,18,.55);z-index:80;opacity:0;visibility:hidden;transition:.25s }
        .ss-backdrop.open { opacity:1;visibility:visible }
        .ss-cart { position:fixed;top:0;right:0;height:100%;width:min(400px,92vw);background:var(--cream);z-index:90;border-left:5px solid var(--ink);transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;box-shadow:-12px 0 30px rgba(0,0,0,.25) }
        .ss-cart.open { transform:translateX(0) }
        .ss-cart-head { background:var(--brick);color:var(--paper);padding:22px 24px;border-bottom:4px solid var(--ink);display:flex;align-items:center;justify-content:space-between }
        .ss-cart-head h3 { font-family:"Anton",Impact,sans-serif;text-transform:uppercase;font-size:24px }
        .ss-x { background:none;border:none;color:inherit;font-size:24px;cursor:pointer;line-height:1 }
        .ss-cart-body { flex:1;overflow-y:auto;padding:18px 24px }
        .ss-empty { color:var(--ink-soft);text-align:center;margin-top:40px;font-size:15px }
        .ss-ci { padding:14px 0;border-bottom:1px solid rgba(35,26,18,.12) }
        .ss-ci-main { display:flex;justify-content:space-between;gap:10px }
        .ss-ci-n { font-weight:600 }
        .ss-ci-p { font-family:"DM Mono",monospace;color:var(--brick) }
        .ss-ci-q { display:flex;align-items:center;gap:10px;margin-top:8px }
        .ss-ci-q button { width:26px;height:26px;border-radius:50%;border:2px solid var(--ink);background:var(--paper);cursor:pointer;font-weight:700;display:inline-flex;align-items:center;justify-content:center;font-size:15px }
        .ss-ci-q button:hover { background:var(--amber) }
        .ss-cart-foot { border-top:4px solid var(--ink);padding:20px 24px;background:var(--paper) }
        .ss-cart-total { display:flex;justify-content:space-between;font-size:19px;margin-bottom:14px }
        .ss-cart-total b { font-family:"Anton",Impact,sans-serif;font-weight:400 }
        .ss-checkout { width:100%;background:var(--ink);color:var(--paper);border:3px solid var(--ink);border-radius:12px;padding:15px;font-weight:700;font-size:17px;cursor:pointer;box-shadow:4px 4px 0 var(--brick-deep) }
        .ss-checkout:disabled { opacity:.4;cursor:not-allowed;box-shadow:none }
        .ss-ff-note { text-align:center;font-size:12px;color:var(--ink-soft);margin-top:10px }
        .ss-modal { position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;visibility:hidden;transition:.25s }
        .ss-modal.open { opacity:1;visibility:visible }
        .ss-modal-card { background:var(--cream);border:5px solid var(--ink);border-radius:18px;width:min(400px,100%);box-shadow:10px 12px 0 rgba(35,26,18,.3);overflow:hidden }
        .ss-modal-head { background:var(--teal);color:var(--paper);padding:22px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid var(--ink) }
        .ss-modal-head h3 { font-family:"Anton",Impact,sans-serif;text-transform:uppercase;font-size:22px }
        .ss-modal-body { padding:24px }
        .ss-tabs { display:flex;gap:8px;margin-bottom:18px }
        .ss-tab { flex:1;padding:10px;border:3px solid var(--ink);border-radius:10px;background:var(--paper);cursor:pointer;font-weight:700 }
        .ss-tab.active { background:var(--amber) }
        .ss-field { margin-bottom:14px }
        .ss-field label { display:block;font-size:13px;font-weight:600;margin-bottom:5px }
        .ss-field input { width:100%;padding:12px;border:3px solid var(--ink);border-radius:10px;background:var(--paper);font-family:inherit;font-size:15px }
        @media(max-width:860px){
          .ss-nav a { display:none }
          .ss-hero .inner { grid-template-columns:1fr;text-align:center }
          .ss-hero-badge { order:-1;margin-bottom:20px }
          .ss-hero-cta { justify-content:center }
          .ss-board-cols { grid-template-columns:1fr;gap:30px }
          .ss-dp-grid { grid-template-columns:1fr 1fr }
        }
        @media(max-width:520px){ .ss-dp-grid{grid-template-columns:1fr} }
        @font-face { }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="ss-grain" />
      <div className="ss-vignette" />

      {/* TOP BAR */}
      <header className="ss-topbar">
        <div className="row">
          <a className="ss-brand" href="#">
            <img src={LOGO_SRC} alt="Prostě snídaně" />
            <span className="ss-nav" style={{ fontFamily: '"Anton", Impact, sans-serif', textTransform: "uppercase", fontSize: 24 }}>Prostě snídaně</span>
          </a>
          <nav className="ss-nav">
            <a href="#menu">Jídelní lístek</a>
            <a href="#otevreno">Otevřeno</a>
            <a href="#doby">Denní doby</a>
            <button className="ss-icon-btn" onClick={() => setAccOpen(true)}>Účet</button>
            <button className="ss-icon-btn ss-cart-btn" onClick={openCart}>
              Košík {count > 0 && <span style={{ background: "var(--amber)", color: "var(--ink)", borderRadius: 999, minWidth: 20, height: 20, padding: "0 5px", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--ink)" }}>{count}</span>}
            </button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="ss-hero">
        <div className="inner">
          <div className="ss-hero-text">
            <span className="ss-eyebrow"><Spark size="1em" color="var(--amber)" /> Snídaně po celý den</span>
            <h1 className="ss-h1">Snídaně<br /><span className="y">kdykoliv.</span></h1>
            <p className="ss-lede">Vajíčka, lívance, toasty a poctivá káva. Od první kávy ráno až do večerního brunche.</p>
            <div className="ss-hero-cta">
              <a className="ss-btn-amber" href="#menu">Objednat snídani</a>
              <a className="ss-btn-ghost" href="#menu">Mrknout na lístek</a>
            </div>
          </div>
          <div className="ss-hero-badge">
            <span className="ss-bs1"><Spark size="30px" color="var(--amber)" /></span>
            <img src={LOGO_SRC} alt="Prostě snídaně — šálek a croissant" />
            <span className="ss-bs2"><Spark size="20px" color="var(--amber)" /></span>
          </div>
        </div>
      </section>

      {/* MARQUEE BAND */}
      <section className="ss-band">
        <div className="line">
          <span className="ss-marquee">{MARQUEE.repeat(4)}&nbsp;&nbsp;&nbsp;&nbsp;{MARQUEE.repeat(4)}</span>
        </div>
      </section>

      {/* MENU */}
      <section className="ss-menu-sec" id="menu">
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
          <div className="ss-sec-head">
            <span className="ss-kicker"><Spark size="13px" color="var(--brick)" /> Jídelní lístek <Spark size="13px" color="var(--brick)" /></span>
            <h2 className="ss-h2">Co dneska bude</h2>
          </div>
          <div className="ss-board ss-enamel">
            <div className="ss-board-cols">
              {displayGroups.map(({ cat, items }) => (
                <div className="ss-cat" key={cat}>
                  <h3><Spark size="18px" color="var(--brick)" /> {cat}</h3>
                  {items.map((it) => (
                    <div className="ss-item-wrap" key={it.n}>
                      <div className="ss-row-item">
                        <span className="ss-nm">{it.n}</span>
                        <span className="ss-ds" />
                        <span className="ss-pr">{it.p} Kč</span>
                        {it.item && (
                          <button className="ss-add" aria-label={`Vybrat ${it.n}`} onClick={() => setDetail(it.item)}>+</button>
                        )}
                      </div>
                      {it.d && <span className="ss-desc">{it.d}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* OPEN ALL DAY */}
      <section className="ss-openday" id="otevreno">
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
          <div className="ss-sign">
            <div className="ss-bulbs-wrap" ref={bulbsRef} />
            <div className="small">Bez výmluv na pozdní ráno</div>
            <h2>Otevřeno celý den</h2>
            <div className="hrs">Po–Pá 7:00–22:00 · So–Ne 8:00–22:00</div>
          </div>
        </div>
      </section>

      {/* DAYPARTS */}
      <section className="ss-dayparts" id="doby">
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
          <div className="ss-sec-head">
            <span className="ss-kicker"><Spark size="13px" color="var(--brick)" /> Kdykoliv ti vyhládne <Spark size="13px" color="var(--brick)" /></span>
            <h2 className="ss-h2">Snídaně podle hodin</h2>
          </div>
        </div>
        <div className="ss-dp-grid">
          {DAYPARTS.map((dp) => (
            <div className="ss-dp" key={dp.label}>
              <div className="ss-clock">
                <div className="ss-clock-h" style={{ transform: `translate(-50%, -100%) rotate(${dp.h})` }} />
                <div className="ss-clock-m" style={{ transform: `translate(-50%, -100%) rotate(${dp.m})` }} />
                <div className="ss-clock-dot" />
              </div>
              <div className="time">{dp.time}</div>
              <h3>{dp.label}</h3>
              <p>{dp.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="ss-cta">
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
          <h2>Není hlad po ránu?</h2>
          <p>Nevadí — jsme tady pro vás celý den. Stav se, nebo si nech snídani dovézt až ke dveřím.</p>
          <a className="ss-btn-dark" href="#menu" style={{ textDecoration: "none" }}>Objednat online <Spark size="20px" color="var(--paper)" /></a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ss-footer">
        <div className="ss-foot">
          <div>
            <a className="ss-brand" href="#" style={{ alignItems: "center" }}>
              <img src={LOGO_SRC} alt="" style={{ width: 54, height: 54 }} />
              <span style={{ fontFamily: '"Anton",Impact,sans-serif', textTransform: "uppercase", fontSize: 24, color: "var(--cream)" }}>Prostě snídaně</span>
            </a>
            <p style={{ color: "#b9ab92", maxWidth: "30ch", marginTop: 12, fontSize: 14 }}>Snídaně po celý den.</p>
          </div>
          <div className="ss-foot-col"><h4>Lístek</h4><a href="#menu">Z pánve</a><a href="#menu">Toasty & sladké</a><a href="#menu">Káva</a></div>
          <div className="ss-foot-col"><h4>Otevřeno</h4><p>Po–Pá 7–22</p><p>So–Ne 8–22</p></div>
          <div className="ss-foot-col"><h4>Sledujte nás</h4><a href="#">Instagram</a><a href="#">Facebook</a></div>
        </div>
        <div className="ss-copy">
          <span>© 2026 Prostě snídaně · <a href="/" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}>Powered by Food Factory</a></span>
          <span>Snídaně kdykoliv <Spark size="11px" color="#9c8e76" /></span>
        </div>
      </footer>

      {/* BACKDROP */}
      <div className={`ss-backdrop${accOpen ? " open" : ""}`} onClick={closeAll} />

      {/* ACCOUNT MODAL */}
      <div className={`ss-modal${accOpen ? " open" : ""}`}>
        <div className="ss-modal-card">
          <div className="ss-modal-head">
            <h3>{accMode === "login" ? "Přihlásit se" : "Vytvořit účet"}</h3>
            <button className="ss-x" onClick={() => setAccOpen(false)}>✕</button>
          </div>
          <div className="ss-modal-body">
            <div className="ss-tabs">
              <button className={`ss-tab${accMode === "login" ? " active" : ""}`} onClick={() => setAccMode("login")}>Přihlásit</button>
              <button className={`ss-tab${accMode === "reg" ? " active" : ""}`} onClick={() => setAccMode("reg")}>Registrace</button>
            </div>
            <div className="ss-field"><label>E-mail</label><input type="email" placeholder="jmeno@email.cz" /></div>
            {accMode === "reg" && <div className="ss-field"><label>Jméno</label><input type="text" placeholder="Tvoje jméno" /></div>}
            <div className="ss-field"><label>Heslo</label><input type="password" placeholder="••••••••" /></div>
            <button className="ss-checkout" onClick={() => setAccOpen(false)}>Pokračovat</button>
            <div className="ss-ff-note">Jeden účet Food Factory pro všechny provozy</div>
          </div>
        </div>
      </div>

      {detail && (
        <ProductDetailModal
          item={detail}
          onClose={() => setDetail(null)}
          theme={{
            bg: "#F2E7CF", surface: "#F7EFDC", ink: "#231A12", muted: "#5a4a38",
            line: "#231A12", accent: "#BB4A2E", accentInk: "#F7EFDC",
            radius: 18, border: "4px solid #231A12",
            displayFont: '"Anton", Impact, sans-serif',
          }}
        />
      )}
    </div>
  );
}
