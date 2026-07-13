"use client";
// Plovoucí pilulka „Máme zavřeno" na brandových webech.
// Fixed bottom, aby se nehádala s topbary jednotlivých webů.
import { useEffect, useState } from "react";
import { useCustomerLocale } from "@/lib/customer-locale";

export function OpeningBanner({ slug }: { slug: string }) {
  const { locale } = useCustomerLocale();
  const [state, setState] = useState<{ isOpen: boolean; nextOpen: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/concepts/${slug}/hours`)
      .then(r => r.json())
      .then(d => { if (!cancelled && typeof d.isOpen === "boolean") setState(d); })
      .catch(() => { /* bez banneru */ });
    return () => { cancelled = true; };
  }, [slug]);

  if (!state || state.isOpen) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 px-4 w-full max-w-md pointer-events-none">
      <div className="pointer-events-auto rounded-full bg-neutral-900/95 text-white border border-white/15 shadow-xl backdrop-blur px-5 py-3 text-sm text-center">
        🕐 <span className="font-semibold">{locale === "en" ? "We\u2019re closed" : "Máme zavřeno"}</span>
        {state.nextOpen && <span className="opacity-80"> {locale === "en" ? `— opening ${state.nextOpen}` : `— otevíráme ${state.nextOpen}`}</span>}
      </div>
    </div>
  );
}
