// Parsování reportů z partnerských portálů (Wolt / Foodora) pro import
// objednávek. Čisté funkce bez Reactu — stránka /admin/kanaly/import je
// používá a dají se testovat samostatně. Formáty exportů se mezi platformami
// i verzemi liší, proto: autodetekce oddělovače, tolerantní čísla (česká
// i anglická), víc formátů data a hádání sloupců podle hlaviček s ručním
// přemapováním v UI.

/** CSV → pole řádků. Zvládá uvozovky, "" escape, ; , i tab, CRLF a BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.slice(0, src.indexOf("\n") === -1 ? src.length : src.indexOf("\n"));
  const counts: [string, number][] = [";", ",", "\t"].map(d => [d, firstLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  const delim = counts[0][1] > 0 ? counts[0][0] : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(c => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c.trim() !== "")) rows.push(row);
  return rows;
}

/** Peněžní částka: "1 234,56 Kč", "1.234,56", "1,234.56", "159" → number | null */
export function parseAmount(raw: string): number | null {
  let v = String(raw ?? "").replace(/[^\d.,-]/g, "");
  if (!v) return null;
  const commas = (v.match(/,/g) ?? []).length;
  const dots = (v.match(/\./g) ?? []).length;
  if (commas && dots) {
    v = v.lastIndexOf(",") > v.lastIndexOf(".")
      ? v.replace(/\./g, "").replace(",", ".")   // 1.234,56 (CZ)
      : v.replace(/,/g, "");                     // 1,234.56 (EN)
  } else if (commas) {
    v = commas > 1 ? v.replace(/,/g, "") : v.replace(",", ".");
  } else if (dots > 1) {
    v = v.replace(/\./g, "");
  } else if (dots === 1) {
    const after = v.length - v.indexOf(".") - 1;
    if (after === 3 && v.length > 4) v = v.replace(".", ""); // 1.234 = tisíce
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Datum: ISO, "16.07.2026 11:49", "16. 7. 2026", "16/07/2026" → Date | null.
 *  U data bez času se bere poledne, ať posun časové zóny nikdy nepřehodí den. */
export function parseReportDate(raw: string): Date | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  let m = t.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], m[4] !== undefined ? +m[4] : 12, m[5] !== undefined ? +m[5] : 0, m[6] !== undefined ? +m[6] : 0);
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], m[4] !== undefined ? +m[4] : 12, m[5] !== undefined ? +m[5] : 0);
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12);
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Ohodnoť hlavičky a odhadni sloupce: číslo objednávky, datum, částka, stav. */
export function guessMapping(headers: string[]): { id: number; date: number; total: number; status: number } {
  const h = headers.map(strip);
  const best = (scorer: (col: string) => number): number => {
    let idx = -1, top = 0;
    h.forEach((col, i) => { const s = scorer(col); if (s > top) { top = s; idx = i; } });
    return idx;
  };
  const id = best(c => {
    const hasOrder = /(order|objedn)/.test(c);
    const hasNum = /(\bid\b|\bno\b|number|cislo|code|#)/.test(c);
    if (hasOrder && hasNum) return 3;              // "Order number" i "Číslo objednávky"
    if (/^(objednavka|order)$/.test(c)) return 2;
    if (/\b(id|kod|code)\b/.test(c)) return 1;
    return 0;
  });
  const date = best(c => {
    if (/(datum|date).*(objedn|order|vytvo|created|placed)|((objedn|order|created|placed).*(datum|date))/.test(c)) return 3;
    if (/^(datum|date)$/.test(c)) return 2;
    if (/(datum|date|time|cas|created|placed|vytvo)/.test(c)) return 1;
    return 0;
  });
  const total = best(c => {
    if (/(total|celkem|gross|brutto).*/.test(c)) return 3;
    if (/(trzba|amount|suma|hodnota|value)/.test(c)) return 2;
    if (/(cena|price|czk|kc)/.test(c)) return 1;
    return 0;
  });
  const status = best(c => (/(^|\b)(status|stav)(\b|$)/.test(c) ? 2 : 0));
  return { id, date, total, status };
}

/** Stornované/odmítnuté řádky se neimportují. */
export function isCancelledStatus(raw: string): boolean {
  return /storn|zrus|cancel|refund|declin|reject|odmit/i.test(strip(String(raw ?? "")));
}
