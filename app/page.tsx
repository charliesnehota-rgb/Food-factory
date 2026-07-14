import Link from "next/link";

// ═══════════════════════════════════════════════════════════
// MANIFEST — dočasná tvář Food Factory.
// Rozcestník značek je záměrně skrytý: restaurace běží na vlastních
// doménách jako samostatné podniky (viz middleware.ts). Tahle stránka
// říká JEN vizi — láká, ale neprozrazuje. Odkryjeme při „sjednocení"
// (6+ restaurací + mobilní aplikace); starý hub je v git historii.
// ═══════════════════════════════════════════════════════════

export const metadata = {
  title: "Food Factory — je čas změnit českou gastronomii",
  description: "Levně. Kvalitně. Rychle. Stavíme něco, co tu ještě nebylo.",
};

const LINES = ["JE ČAS", "ZMĚNIT", "ČESKOU", "GASTRONOMII."];

export default function Manifest() {
  const year = new Date().getFullYear();
  return (
    <div className="mf">
      <style>{`
        .mf {
          --ink:#0D0D0F; --paper:#F4F1EA; --accent:#E7A52C;
          --mono:"DM Mono", ui-monospace, monospace;
          background:var(--ink); color:var(--paper); min-height:100dvh;
          display:flex; flex-direction:column; overflow:hidden;
          font-family:"DM Sans", system-ui, sans-serif;
        }
        .mf a { color:inherit; text-decoration:none; }
        .mf-wrap { width:100%; max-width:1180px; margin:0 auto; padding:0 clamp(20px,4vw,48px); }

        /* top */
        .mf-top { display:flex; justify-content:space-between; align-items:center; padding:26px 0; }
        .mf-mark { font-family:var(--mono); font-size:13px; letter-spacing:.34em; text-transform:uppercase; }
        .mf-mark b { color:var(--accent); font-weight:500; }
        .mf-year { font-family:var(--mono); font-size:12px; letter-spacing:.2em; color:rgba(244,241,234,.45); }

        /* manifest headline */
        .mf-hero { flex:1; display:flex; flex-direction:column; justify-content:center; padding:56px 0 40px; }
        .mf-h { font-weight:800; text-transform:uppercase; letter-spacing:-0.02em;
          font-size:clamp(52px, 11.5vw, 168px); line-height:.92; margin:0; }
        .mf-h .ln { display:block; opacity:0; transform:translateY(28px);
          animation:mf-in .8s cubic-bezier(.2,.8,.2,1) forwards; }
        .mf-h .ln:nth-child(1){ animation-delay:.05s }
        .mf-h .ln:nth-child(2){ animation-delay:.18s }
        .mf-h .ln:nth-child(3){ animation-delay:.31s }
        .mf-h .ln:nth-child(4){ animation-delay:.44s; color:var(--accent); }
        @keyframes mf-in { to { opacity:1; transform:none } }

        /* triáda hesel */
        .mf-triad { margin-top:clamp(34px,5vh,64px); display:flex; gap:clamp(14px,3vw,34px);
          flex-wrap:wrap; align-items:baseline;
          font-weight:800; text-transform:uppercase; letter-spacing:-0.01em;
          font-size:clamp(24px, 4.4vw, 54px); }
        .mf-triad span { opacity:0; animation:mf-in .7s ease forwards; }
        .mf-triad span:nth-child(1){ animation-delay:.75s }
        .mf-triad span:nth-child(3){ animation-delay:.95s }
        .mf-triad span:nth-child(5){ animation-delay:1.15s }
        .mf-triad .dot { color:var(--accent); opacity:0; animation:mf-in .4s ease forwards; }
        .mf-triad .dot:nth-child(2){ animation-delay:.88s }
        .mf-triad .dot:nth-child(4){ animation-delay:1.08s }
        .mf-outline { color:transparent; -webkit-text-stroke:1.5px var(--paper); }

        /* tajemný text */
        .mf-copy { margin-top:clamp(30px,4.5vh,52px); max-width:52ch; color:rgba(244,241,234,.62);
          font-size:clamp(15px,1.6vw,18px); line-height:1.75;
          opacity:0; animation:mf-in .8s ease 1.35s forwards; }
        .mf-copy b { color:var(--paper); font-weight:600; }

        /* běžící pás — bezešvý (perioda dělí šířku) */
        .mf-band { border-top:1px solid rgba(244,241,234,.14); border-bottom:1px solid rgba(244,241,234,.14);
          padding:14px 0; overflow:hidden; }
        .mf-band-track { display:inline-flex; white-space:nowrap; animation:mf-slide 26s linear infinite; }
        .mf-band-track span { font-family:var(--mono); font-size:12px; letter-spacing:.32em;
          text-transform:uppercase; color:rgba(244,241,234,.5); }
        @keyframes mf-slide { to { transform:translateX(-50%) } }
        @media (prefers-reduced-motion: reduce) {
          .mf-h .ln, .mf-triad span, .mf-triad .dot, .mf-copy { animation:none; opacity:1; transform:none }
          .mf-band-track { animation:none }
        }

        /* footer */
        .mf-foot { display:flex; justify-content:space-between; align-items:center;
          padding:22px 0 26px; font-family:var(--mono); font-size:11.5px;
          letter-spacing:.16em; text-transform:uppercase; color:rgba(244,241,234,.4); }
        .mf-foot a { border-bottom:1px solid transparent; transition:.2s; }
        .mf-foot a:hover { color:var(--paper); border-color:var(--accent); }
        .mf-pulse { display:inline-block; width:7px; height:7px; border-radius:50%;
          background:var(--accent); margin-right:9px; animation:mf-pulse 2.2s ease-in-out infinite; }
        @keyframes mf-pulse { 0%,100%{ opacity:.35 } 50%{ opacity:1 } }
      `}</style>

      <header className="mf-wrap mf-top">
        <span className="mf-mark">Food<b>·</b>Factory</span>
        <span className="mf-year">Praha — {year}</span>
      </header>

      <main className="mf-wrap mf-hero">
        <h1 className="mf-h">
          {LINES.map(l => <span className="ln" key={l}>{l}</span>)}
        </h1>

        <div className="mf-triad" aria-label="Levně. Kvalitně. Rychle.">
          <span>Levně</span><span className="dot">·</span>
          <span className="mf-outline">Kvalitně</span><span className="dot">·</span>
          <span>Rychle</span>
        </div>

        <p className="mf-copy">
          Stavíme něco, co v Česku ještě nebylo. Kuchyni, kde technologie
          nevaří místo lidí — <b>vaří s nimi</b>. Kde poctivé jídlo nestojí
          majlant a nečeká se na něj hodinu. Zatím pracujeme potichu.
          <b> Brzy uslyšíte víc.</b>
        </p>
      </main>

      <div className="mf-band" aria-hidden>
        <div className="mf-band-track">
          <span>{"Připravujeme · Levně · Kvalitně · Rychle · ".repeat(6)}</span>
          <span>{"Připravujeme · Levně · Kvalitně · Rychle · ".repeat(6)}</span>
        </div>
      </div>

      <footer className="mf-wrap mf-foot">
        <span><span className="mf-pulse" />Ve výstavbě</span>
        <Link href="/admin">Přihlášení</Link>
      </footer>
    </div>
  );
}
