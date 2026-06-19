import Link from "next/link";
import Image from "next/image";
import { concepts } from "@/lib/data/concepts";

// Brandy se skutečným logem (kulatý ořez), ostatní emoji
const LOGOS: Record<string, string> = {
  dumply: "/brands/dumply.png",
  "sunny-side": "/brands/sunny-side.webp",
  smash: "/brands/smash.png",
};

export const metadata = {
  title: "Food Factory — naše projekty",
  description: "Jedna kuchyně, jedna platforma, několik značek.",
};

export default function Hub() {
  const year = new Date().getFullYear();
  return (
    <div className="hub">
      <style>{`
        .hub {
          --paper:#FBFBFA; --surface:#FFFFFF; --ink:#16161A; --muted:#6B6B72;
          --hair:#ECECEC; --hair-soft:#F2F2F0;
          --mono:"DM Mono", ui-monospace, monospace;
          --sans:"DM Sans", system-ui, sans-serif;
          background:var(--paper); color:var(--ink); min-height:100vh;
          display:flex; flex-direction:column; font-family:var(--sans);
        }
        .hub a { color:inherit; text-decoration:none; }
        .hub-wrap { width:100%; max-width:940px; margin:0 auto; padding:0 24px; }

        /* top bar */
        .hub-top { border-bottom:1px solid var(--hair); }
        .hub-top-inner { display:flex; align-items:center; justify-content:space-between; padding:20px 0; }
        .hub-mark { display:flex; align-items:center; gap:10px; font-weight:600; letter-spacing:-0.01em; font-size:16px; }
        .hub-mark-dot { width:9px; height:9px; border-radius:50%; background:var(--ink); display:inline-block; }
        .hub-top-meta { font-family:var(--mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }

        /* hero */
        .hub-hero { padding:84px 0 52px; }
        .hub-eyebrow { font-family:var(--mono); font-size:12px; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); margin-bottom:22px; display:flex; align-items:center; gap:10px; }
        .hub-eyebrow::before { content:""; width:24px; height:1px; background:var(--ink); display:inline-block; opacity:.4; }
        .hub-h1 { font-size:clamp(40px, 7vw, 72px); font-weight:600; letter-spacing:-0.035em; line-height:1.0; margin:0; }
        .hub-sub { margin-top:20px; max-width:46ch; font-size:17px; line-height:1.6; color:var(--muted); }
        .hub-stats { margin-top:30px; display:flex; gap:28px; flex-wrap:wrap; font-family:var(--mono); font-size:12px; letter-spacing:.06em; color:var(--muted); }
        .hub-stats b { color:var(--ink); font-weight:500; }

        /* projects list */
        .hub-list-head { font-family:var(--mono); font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); padding:0 0 14px; border-bottom:1px solid var(--hair); }
        .hub-row {
          --acc:var(--ink);
          position:relative; display:grid; grid-template-columns:56px 1fr auto auto;
          align-items:center; gap:22px; padding:26px 16px 26px 14px;
          border-bottom:1px solid var(--hair);
          transition: background .25s ease;
        }
        .hub-row::before {
          content:""; position:absolute; left:0; top:0; bottom:0; width:3px;
          background:var(--acc); transform:scaleY(0); transform-origin:center;
          transition:transform .28s cubic-bezier(.2,.8,.2,1);
        }
        .hub-row:hover { background:color-mix(in srgb, var(--acc) 5%, transparent); }
        .hub-row:hover::before { transform:scaleY(1); }

        .hub-logo {
          width:56px; height:56px; border-radius:50%; overflow:hidden;
          display:grid; place-items:center; border:1px solid var(--hair);
          background:var(--surface); flex:none;
          filter:grayscale(1); opacity:.78; transition:filter .3s, opacity .3s;
        }
        .hub-row:hover .hub-logo { filter:grayscale(0); opacity:1; }
        .hub-logo--light { background:#fff; }
        .hub-logo img { width:100%; height:100%; object-fit:cover; }
        .hub-logo .emoji { font-size:26px; }

        .hub-name { font-size:23px; font-weight:600; letter-spacing:-0.02em; line-height:1.15; }
        .hub-tag { margin-top:3px; font-size:14px; color:var(--muted); }

        .hub-status { font-family:var(--mono); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); display:inline-flex; align-items:center; gap:7px; white-space:nowrap; }
        .hub-status .dot { width:6px; height:6px; border-radius:50%; background:var(--acc); display:inline-block; }

        .hub-arrow { font-size:20px; color:var(--muted); transform:translateX(0); transition:transform .25s, color .25s; }
        .hub-row:hover .hub-arrow { transform:translateX(5px); color:var(--acc); }

        /* footer */
        .hub-foot { margin-top:auto; border-top:1px solid var(--hair); }
        .hub-foot-inner { display:flex; align-items:center; justify-content:space-between; padding:22px 0; font-size:13px; color:var(--muted); }
        .hub-foot a { font-family:var(--mono); font-size:11px; letter-spacing:.12em; text-transform:uppercase; opacity:.6; transition:opacity .2s; }
        .hub-foot a:hover { opacity:1; }

        @media (max-width:620px){
          .hub-hero { padding:56px 0 36px; }
          .hub-row { grid-template-columns:48px 1fr auto; gap:16px; padding:22px 10px; }
          .hub-status { display:none; }
          .hub-logo { width:48px; height:48px; }
        }
        @media (prefers-reduced-motion: reduce){
          .hub-row, .hub-row::before, .hub-arrow, .hub-logo { transition:none !important; }
        }
      `}</style>

      {/* ── TOP BAR ── */}
      <header className="hub-top">
        <div className="hub-wrap hub-top-inner">
          <span className="hub-mark"><span className="hub-mark-dot" /> Food Factory</span>
          <span className="hub-top-meta">Kuchyňská platforma</span>
        </div>
      </header>

      {/* ── HERO ── */}
      <main>
        <section className="hub-wrap hub-hero">
          <div className="hub-eyebrow">Food Factory</div>
          <h1 className="hub-h1">Naše projekty</h1>
          <p className="hub-sub">
            Jedna kuchyně, jedna platforma, několik samostatných značek.
            Každá s vlastním světem — postavená na sdílené technologii.
          </p>
          <div className="hub-stats">
            <span><b>{concepts.length}</b> značky</span>
            <span><b>1</b> kuchyně</span>
            <span><b>1</b> platforma</span>
            <span>Est. <b>2026</b></span>
          </div>
        </section>

        {/* ── PROJECTS ── */}
        <section className="hub-wrap" style={{ paddingBottom: 80 }}>
          <div className="hub-list-head">Projekty / {String(concepts.length).padStart(2, "0")}</div>
          {concepts.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className="hub-row" style={{ ["--acc" as string]: c.accent }}>
              <span className={`hub-logo${c.slug === "smash" ? " hub-logo--light" : ""}`}>
                {LOGOS[c.slug]
                  ? <Image src={LOGOS[c.slug]} alt={c.name} width={56} height={56} />
                  : <span className="emoji">{c.emoji}</span>}
              </span>
              <span>
                <span className="hub-name">{c.name}</span>
                <span className="hub-tag">{c.tagline}</span>
              </span>
              <span className="hub-status"><span className="dot" /> V provozu</span>
              <span className="hub-arrow">→</span>
            </Link>
          ))}
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="hub-foot">
        <div className="hub-wrap hub-foot-inner">
          <span>© {year} · Powered by Food Factory</span>
          <Link href="/admin">Admin</Link>
        </div>
      </footer>
    </div>
  );
}
