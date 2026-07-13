// Provozní doba per koncept. Server (Vercel) běží v UTC — všechny
// výpočty "teď" se dělají v Europe/Prague přes Intl API.
export interface DayHours { open: string; close: string; closed: boolean }
export type WeekHours = Record<string, DayHours>; // klíč "0"–"6" = JS getDay (0 = Ne)

export const DAY_LABELS_CS = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

/** Aktuální den (0–6) a čas "HH:MM" v Praze. */
export function nowInPrague(date = new Date()): { day: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const wd = parts.find(p => p.type === "weekday")?.value ?? "Mon";
  const hh = parts.find(p => p.type === "hour")?.value ?? "00";
  const mm = parts.find(p => p.type === "minute")?.value ?? "00";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: dayMap[wd] ?? 1, hhmm: `${hh}:${mm}` };
}

/** Je koncept právě otevřený? Podporuje i přes půlnoc (close < open). */
export function isOpenNow(hours: WeekHours | null | undefined, date = new Date()): boolean {
  if (!hours || Object.keys(hours).length === 0) return true; // bez nastavení neblokujeme
  const { day, hhmm } = nowInPrague(date);
  const today = hours[String(day)];

  // Interval dneška
  if (today && !today.closed && today.open && today.close) {
    if (today.close > today.open) {
      if (hhmm >= today.open && hhmm < today.close) return true;
    } else if (today.close !== today.open) {
      // přes půlnoc: otevřeno od open do 24:00
      if (hhmm >= today.open) return true;
    }
  }
  // Včerejší interval přesahující přes půlnoc do dneška
  const yest = hours[String((day + 6) % 7)];
  if (yest && !yest.closed && yest.open && yest.close && yest.close < yest.open) {
    if (hhmm < yest.close) return true;
  }
  return false;
}

/** Text nejbližšího otevření: "dnes v 11:00" / "zítra v 07:30" / "v pátek v 11:00". */
export function nextOpenText(hours: WeekHours | null | undefined, date = new Date()): string | null {
  if (!hours || Object.keys(hours).length === 0) return null;
  const { day, hhmm } = nowInPrague(date);
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    const h = hours[String(d)];
    if (!h || h.closed || !h.open) continue;
    if (i === 0 && h.open <= hhmm) continue; // dnešní otevírání už proběhlo
    const when = i === 0 ? "dnes" : i === 1 ? "zítra" : `v ${DAY_LABELS_CS[d].toLowerCase().replace("úterý", "úterý")}`;
    const prefix = i >= 2 ? (d === 2 ? "v úterý" : d === 0 ? "v neděli" : d === 3 ? "ve středu" : d === 4 ? "ve čtvrtek" : d === 5 ? "v pátek" : d === 6 ? "v sobotu" : "v pondělí") : when;
    return `${prefix} v ${h.open}`;
  }
  return null;
}
