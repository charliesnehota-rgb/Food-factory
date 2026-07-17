"use client";
// Našeptávač doručovací adresy. Debounce 250 ms, návrhy z /api/address-suggest
// (Photon/OSM, omezeno na Prahu). Výběr návrhu předá i přesné souřadnice —
// objednávka pak nese ověřenou polohu a chybným doručením se předchází.
// Volný text zůstává povolený (novostavby, hrany OSM): bez výběru se
// souřadnice jen nepošlou a server geokóduje po staru.
import { useEffect, useRef, useState } from "react";

export interface PickedAddress { label: string; lat: number; lng: number; district: string | null }

interface Props {
  value: string;
  onChange: (text: string) => void;
  onPick?: (a: PickedAddress | null) => void; // null = uživatel po výběru text ručně změnil
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  dropdownClassName?: string;
}

export default function AddressAutocomplete({ value, onChange, onPick, placeholder, className, style, dropdownClassName }: Props) {
  const [items, setItems] = useState<PickedAddress[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextFetch = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipNextFetch.current) { skipNextFetch.current = false; return; }
    if (debounce.current) clearTimeout(debounce.current);
    const q = value.trim();
    if (q.length < 3) { setItems([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      try {
        const d = await fetch(`/api/address-suggest?q=${encodeURIComponent(q)}`).then(r => r.json());
        const list: PickedAddress[] = Array.isArray(d.suggestions) ? d.suggestions : [];
        setItems(list);
        setOpen(list.length > 0);
        setHi(-1);
      } catch { /* našeptávač je bonus — ticho */ }
    }, 250);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [value]);

  // Zavření při kliknutí mimo
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); };
  }, []);

  function pick(a: PickedAddress) {
    skipNextFetch.current = true;
    onChange(a.label);
    onPick?.(a);
    setOpen(false);
    setItems([]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(h + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && hi >= 0) { e.preventDefault(); pick(items[hi]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); onPick?.(null); }}
        onFocus={() => { if (items.length > 0) setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        style={style}
      />
      {open && (
        <div className={"absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg shadow-lg " +
          (dropdownClassName ?? "border border-[var(--border)] bg-[var(--card)]")}>
          {items.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onMouseDown={e => { e.preventDefault(); pick(a); }}
              onMouseEnter={() => setHi(i)}
              className={"block w-full px-3 py-2 text-left text-sm transition " +
                (i === hi ? "bg-black/10 dark:bg-white/10" : "")}
            >
              📍 {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
