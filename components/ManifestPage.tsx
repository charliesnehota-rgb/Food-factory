import Link from "next/link";

// ═══════════════════════════════════════════════════════════
// MANIFEST — dočasná tvář Free City (skrytý režim), CZ + EN.
// Bílý papír, grafit, tužkové skici co se samy dokreslují —
// projekt se teprve rýsuje. Rozcestník značek odkryjeme až při
// „sjednocení" (6+ restaurací + appka); starý hub je v git historii.
// Jazykové mutace: / (čeština) a /en (angličtina), přepínač v hlavičce.
// ═══════════════════════════════════════════════════════════

export type ManifestLang = "cs" | "en";

const COPY: Record<ManifestLang, {
  lines: string[];
  triad: [string, string, string];
  triadLabel: string;
  city: string;
  copy: React.ReactNode;
  band: string;
  building: string;
  signIn: string;
  langLabel: string;
  langHref: string;
}> = {
  cs: {
    lines: ["JE ČAS", "ZMĚNIT", "ČESKOU", "GASTRONOMII."],
    triad: ["Férově", "Chutně", "Doma"],
    triadLabel: "Férově. Chutně. Doma.",
    city: "Praha",
    copy: (
      <>
        Stavíme něco, co v Česku ještě nebylo. Kuchyni, kde technologie
        nevaří místo lidí — <b>vaří s nimi</b>. Kde poctivé jídlo nestojí
        majlant a nečeká se na něj hodinu. Zatím rýsujeme potichu.
        <b> Brzy uslyšíte víc.</b>
      </>
    ),
    band: "Připravujeme ✎ Férově · Chutně · Doma ✎ ",
    building: "Ve výstavbě",
    signIn: "Přihlášení",
    langLabel: "EN",
    langHref: "/en",
  },
  en: {
    lines: ["IT'S TIME", "TO CHANGE", "CZECH", "GASTRONOMY."],
    triad: ["Fair", "Tasty", "Home"],
    triadLabel: "Fair. Tasty. Home.",
    city: "Prague",
    copy: (
      <>
        We&apos;re building something Czechia hasn&apos;t seen yet. A kitchen where
        technology doesn&apos;t cook instead of people — <b>it cooks with them</b>.
        Where honest food doesn&apos;t cost a fortune or take an hour. For now
        we&apos;re sketching quietly. <b>You&apos;ll hear more soon.</b>
      </>
    ),
    band: "Coming soon ✎ Fair · Tasty · Home ✎ ",
    building: "Under construction",
    signIn: "Sign in",
    langLabel: "CZ",
    langHref: "/",
  },
};

// Tužkový dvojtah — podtržení (lehce roztřesené, dva překrývající se tahy)
function SketchUnderline() {
  return (
    <svg className="mf-sk mf-sk-underline" viewBox="0 0 520 26" fill="none" aria-hidden>
      <path className="mf-stroke mf-stroke-1" d="M6 14 C 90 8, 180 18, 262 12 S 430 9, 514 15" />
      <path className="mf-stroke mf-stroke-2" d="M10 20 C 110 15, 210 23, 300 17 S 450 14, 508 20" />
    </svg>
  );
}

// Tužkový kroužek kolem slova (dva nedotažené oblouky jako od ruky)
function SketchCircle() {
  return (
    <svg className="mf-sk mf-sk-circle" viewBox="0 0 300 110" fill="none" aria-hidden>
      <path className="mf-stroke mf-stroke-3"
        d="M150 8 C 62 4, 10 28, 12 56 C 14 88, 84 106, 158 102 C 236 98, 292 74, 288 48 C 284 20, 216 4, 138 10" />
      <path className="mf-stroke mf-stroke-4"
        d="M162 14 C 84 10, 24 32, 26 58 C 28 84, 92 100, 160 96 C 228 92, 280 70, 276 46" />
    </svg>
  );
}

export default function ManifestPage({ lang }: { lang: ManifestLang }) {
  const c = COPY[lang];
  const year = new Date().getFullYear();
  return (
    <div className="mf">
      <style>{`
        .mf {
          --paper:#FAFAF7; --ink:#161618; --muted:#8B8B90;
          --hair:#E7E7E2; --graphite:#3B3B40;
          --mono:"DM Mono", ui-monospace, monospace;
          background:var(--paper); color:var(--ink); min-height:100dvh;
          display:flex; flex-direction:column; overflow:hidden; position:relative;
          font-family:"DM Sans", system-ui, sans-serif;
        }
        .mf a { color:inherit; text-decoration:none; }
        .mf-wrap { width:100%; max-width:1180px; margin:0 auto; padding:0 clamp(20px,4vw,48px); }

        /* jemné tužkové šrafování v rohu papíru */
        .mf::before {
          content:""; position:absolute; top:-40px; right:-60px; width:340px; height:340px;
          background:repeating-linear-gradient(-42deg, rgba(22,22,24,.055) 0 1px, transparent 1px 7px);
          transform:rotate(2deg); pointer-events:none;
          -webkit-mask-image:radial-gradient(closest-side, #000 30%, transparent 72%);
                  mask-image:radial-gradient(closest-side, #000 30%, transparent 72%);
        }

        /* top */
        .mf-top { display:flex; justify-content:space-between; align-items:center; padding:26px 0;
          border-bottom:1px solid var(--hair); }
        .mf-mark { font-family:var(--mono); font-size:13px; letter-spacing:.34em; text-transform:uppercase; }
        .mf-mark b { color:var(--graphite); font-weight:500; }
        .mf-meta { display:flex; align-items:center; gap:18px; }
        .mf-year { font-family:var(--mono); font-size:12px; letter-spacing:.2em; color:var(--muted); }
        .mf-lang { font-family:var(--mono); font-size:12px; letter-spacing:.2em; color:var(--muted);
          border-bottom:1px solid var(--hair); padding-bottom:1px; transition:.2s; }
        .mf-lang:hover { color:var(--ink); border-color:var(--graphite); }

        /* manifest headline */
        .mf-hero { flex:1; display:flex; flex-direction:column; justify-content:center; padding:52px 0 40px; }
        .mf-h { font-weight:800; text-transform:uppercase; letter-spacing:-0.02em;
          font-size:clamp(52px, 11.5vw, 168px); line-height:.92; margin:0; }
        .mf-h .ln { display:block; opacity:0; transform:translateY(28px);
          animation:mf-in .8s cubic-bezier(.2,.8,.2,1) forwards; }
        .mf-h .ln:nth-child(1){ animation-delay:.05s }
        .mf-h .ln:nth-child(2){ animation-delay:.18s }
        .mf-h .ln:nth-child(3){ animation-delay:.31s }
        .mf-h .ln:nth-child(4){ animation-delay:.44s }
        .mf-h .ln-last { position:relative; display:inline-block; }
        @keyframes mf-in { to { opacity:1; transform:none } }

        /* tužkové skici — kreslí se tahem */
        .mf-sk { position:absolute; pointer-events:none; overflow:visible; }
        .mf-stroke { stroke:var(--graphite); stroke-width:3; stroke-linecap:round; fill:none;
          stroke-dasharray:900; stroke-dashoffset:900; opacity:.75;
          animation:mf-draw 1.1s ease-out forwards; }
        .mf-stroke-2, .mf-stroke-4 { stroke-width:2; opacity:.35; }
        .mf-stroke-1 { animation-delay:1.0s }
        .mf-stroke-2 { animation-delay:1.25s }
        .mf-stroke-3 { animation-delay:1.7s; stroke-dasharray:1100; stroke-dashoffset:1100; }
        .mf-stroke-4 { animation-delay:2.0s; stroke-dasharray:1100; stroke-dashoffset:1100; }
        @keyframes mf-draw { to { stroke-dashoffset:0 } }
        .mf-sk-underline { left:0; bottom:-14px; width:min(100%, 9.2em); height:.32em; }

        /* triáda hesel */
        .mf-triad { margin-top:clamp(38px,6vh,70px); display:flex; gap:clamp(14px,3vw,34px);
          flex-wrap:wrap; align-items:baseline;
          font-weight:800; text-transform:uppercase; letter-spacing:-0.01em;
          font-size:clamp(24px, 4.4vw, 54px); }
        .mf-triad > span { opacity:0; animation:mf-in .7s ease forwards; }
        .mf-triad > span:nth-child(1){ animation-delay:.75s }
        .mf-triad > span:nth-child(3){ animation-delay:.95s }
        .mf-triad > span:nth-child(5){ animation-delay:1.15s }
        .mf-triad .dot { color:var(--muted); }
        .mf-triad .dot:nth-child(2){ animation-delay:.88s }
        .mf-triad .dot:nth-child(4){ animation-delay:1.08s }
        .mf-outline { color:transparent; -webkit-text-stroke:1.5px var(--ink); }
        .mf-circled { position:relative; display:inline-block; }
        .mf-sk-circle { left:-8%; top:-24%; width:116%; height:148%; }

        /* tajemný text */
        .mf-copy { margin-top:clamp(30px,4.5vh,52px); max-width:52ch; color:var(--muted);
          font-size:clamp(15px,1.6vw,18px); line-height:1.75;
          opacity:0; animation:mf-in .8s ease 1.35s forwards; }
        .mf-copy b { color:var(--ink); font-weight:600; }

        /* běžící pás — bezešvý */
        .mf-band { border-top:1px solid var(--hair); border-bottom:1px solid var(--hair);
          padding:14px 0; overflow:hidden; background:#FFFFFF; }
        .mf-band-track { display:inline-flex; white-space:nowrap; animation:mf-slide 26s linear infinite; }
        .mf-band-track span { font-family:var(--mono); font-size:12px; letter-spacing:.32em;
          text-transform:uppercase; color:var(--muted); }
        @keyframes mf-slide { to { transform:translateX(-50%) } }

        @media (prefers-reduced-motion: reduce) {
          .mf-h .ln, .mf-triad > span, .mf-copy { animation:none; opacity:1; transform:none }
          .mf-band-track { animation:none }
          .mf-stroke { animation:none; stroke-dashoffset:0 }
        }

        /* footer */
        .mf-foot { display:flex; justify-content:space-between; align-items:center;
          padding:22px 0 26px; font-family:var(--mono); font-size:11.5px;
          letter-spacing:.16em; text-transform:uppercase; color:var(--muted); }
        .mf-foot a { border-bottom:1px solid transparent; transition:.2s; }
        .mf-foot a:hover { color:var(--ink); border-color:var(--graphite); }
        .mf-pulse { display:inline-block; width:7px; height:7px; border-radius:50%;
          background:var(--graphite); margin-right:9px; animation:mf-pulse 2.2s ease-in-out infinite; }
        @keyframes mf-pulse { 0%,100%{ opacity:.3 } 50%{ opacity:1 } }
      `}</style>

      <header className="mf-wrap mf-top">
        <span className="mf-mark">Free<b>·</b>City</span>
        <span className="mf-meta">
          <span className="mf-year">{c.city} — {year}</span>
          <Link className="mf-lang" href={c.langHref} lang={lang === "cs" ? "en" : "cs"} aria-label={lang === "cs" ? "English version" : "Česká verze"}>
            {c.langLabel}
          </Link>
        </span>
      </header>

      <main className="mf-wrap mf-hero">
        <h1 className="mf-h">
          {c.lines.map((l, i) => (
            <span className="ln" key={l}>
              {i === c.lines.length - 1
                ? <span className="ln-last">{l}<SketchUnderline /></span>
                : l}
            </span>
          ))}
        </h1>

        <div className="mf-triad" aria-label={c.triadLabel}>
          <span className="mf-circled">{c.triad[0]}<SketchCircle /></span><span className="dot">·</span>
          <span className="mf-outline">{c.triad[1]}</span><span className="dot">·</span>
          <span>{c.triad[2]}</span>
        </div>

        <p className="mf-copy">{c.copy}</p>
      </main>

      <div className="mf-band" aria-hidden>
        <div className="mf-band-track">
          <span>{c.band.repeat(6)}</span>
          <span>{c.band.repeat(6)}</span>
        </div>
      </div>

      <footer className="mf-wrap mf-foot">
        <span><span className="mf-pulse" />{c.building}</span>
        <Link href="/admin">{c.signIn}</Link>
      </footer>
    </div>
  );
}
