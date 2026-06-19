// Brandová identita každého konceptu: paleta, typografie, texty.
// Úroveň A: sdílená kostra, jiný "kabát". Snadno rozšiřitelné.

export interface ProcessStep { step: string; title: string; text: string }

export interface BrandTheme {
  slug: string;
  name: string;
  // Paleta (CSS proměnné se z toho odvodí)
  bg: string;
  surface: string;
  ink: string;       // hlavní text
  muted: string;     // sekundární text
  line: string;      // okraje
  accent: string;    // hlavní barva značky
  accentInk: string; // text na accentu
  pop: string;       // sekundární doplněk
  // Typografie
  displayFont: string;
  bodyFont: string;
  // Texty
  eyebrow: string;
  heroTitle: string;
  heroSub: string;
  processTitle: string;
  process: ProcessStep[];
  ctaTitle: string;
  ctaSub: string;
}

export const brands: Record<string, BrandTheme> = {
  dumply: {
    slug: "dumply",
    name: "Dumply",
    bg: "#FFFAF3",
    surface: "#FCEAEE",
    ink: "#5C3317",
    muted: "#A98C72",
    line: "#EFDFCB",
    accent: "#6B3410",
    accentInk: "#FFF8EF",
    pop: "#F2A9B8",
    displayFont: "'Fredoka', system-ui, sans-serif",
    bodyFont: "'Nunito', system-ui, sans-serif",
    eyebrow: "Praha · ruční knedlíčky & dim sum",
    heroTitle: "Ruční knedlíčky\ns úsměvem.",
    heroSub: "Čínské dumplingy a dim sum, skládané každé ráno. Pára, křup a omáčky, co lepí prsty.",
    processTitle: "Jak je děláme",
    process: [
      { step: "01", title: "Skládáme", text: "Každé ráno plníme a skládáme těsto ručně. Nic mraženého." },
      { step: "02", title: "Paříme", text: "V bambusových košících do měkka, na pánvi do zlatova a křupava." },
      { step: "03", title: "Omáčíme", text: "Chilli olej, sója, černý ocet, zázvor. Namáčej, nebo rovnou polej." },
    ],
    ctaTitle: "Dostaneš chuť na 8 kousků?",
    ctaSub: "Objednej online, vyzvedni za rohem, nebo nech dovézt.",
  },

  "sunny-side": {
    slug: "sunny-side",
    name: "Prostě snídaně",
    bg: "#FDF6EC",
    surface: "#F5EBD8",
    ink: "#1C1612",
    muted: "#7A6850",
    line: "#DDD0BB",
    accent: "#BF3B16",
    accentInk: "#FDF6EC",
    pop: "#1A7A72",
    displayFont: "'Anton', 'Impact', system-ui, sans-serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    eyebrow: "Praha · snídaně po celý den",
    heroTitle: "Snídaně.\nKdykoliv.",
    heroSub: "Vajíčka, lívance, toasty a poctivá káva. Od rána do večera — žádné kompromisy.",
    processTitle: "Čím začneš den",
    process: [
      { step: "01", title: "Vejce", text: "Pošírovaná, míchaná, sázená. Jak je máš rád." },
      { step: "02", title: "Sladké", text: "Americké lívance a granola s ovocem." },
      { step: "03", title: "Káva", text: "Flat white, který vás probudí." },
    ],
    ctaTitle: "Hlad hned po ránu?",
    ctaSub: "Objednej snídani online a nech ji dovézt až ke dveřím.",
  },

  smash: {
    slug: "smash",
    name: "L.T. Smash",
    bg: "#121113",
    surface: "#1D1B1E",
    ink: "#F2EEE9",
    muted: "#9B9498",
    line: "#322E33",
    accent: "#F97316",
    accentInk: "#1A1206",
    pop: "#FFD23F",
    displayFont: "'Bricolage Grotesque', system-ui, sans-serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    eyebrow: "Praha · smashburgery & wrapy",
    heroTitle: "Umlácený.\nRoztavený. Tvůj.",
    heroSub: "Tence umlácené hovězí placky, roztavený cheddar, domácí omáčky.",
    processTitle: "Náš smash",
    process: [
      { step: "01", title: "Umlátíme", text: "Kulička hovězího na rozpálené plotně do křupavých okrajů." },
      { step: "02", title: "Roztavíme", text: "Cheddar přímo na placku, dokud nezačne téct." },
      { step: "03", title: "Složíme", text: "Měkká bulka, okurka, naše tajná omáčka." },
    ],
    ctaTitle: "Pořádný hlad?",
    ctaSub: "Objednej smash online — vyzvednutí nebo rozvoz.",
  },


};

export function getBrand(slug: string): BrandTheme | undefined {
  return brands[slug];
}

export function brandStyle(b: BrandTheme): React.CSSProperties {
  return {
    // přepíšeme globální proměnné lokálně → přebarví i sdílené prvky
    ["--bg" as string]: b.bg,
    ["--fg" as string]: b.ink,
    ["--muted" as string]: b.muted,
    ["--card" as string]: b.surface,
    ["--border" as string]: b.line,
    ["--brand-accent" as string]: b.accent,
    ["--brand-accent-ink" as string]: b.accentInk,
    ["--brand-pop" as string]: b.pop,
    ["--brand-display" as string]: b.displayFont,
    ["--brand-body" as string]: b.bodyFont,
    background: b.bg,
    color: b.ink,
    fontFamily: b.bodyFont,
  };
}
