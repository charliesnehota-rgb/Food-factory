"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { translations, type Lang } from "@/lib/i18n/translations";

const STORAGE_KEY = "ff_lang";
const DEFAULT_LANG: Lang = "cs";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LangCtx>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (k) => k,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "cs" || stored === "zh") setLangState(stored);
    } catch {
      /* SSR / private mode */
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch { /* ignore */ }
  }

  function t(key: string, vars?: Record<string, string | number>): string {
    const dict = translations[lang];
    let str = dict[key] ?? translations["cs"][key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return str;
  }

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useT() {
  return useContext(Ctx).t;
}

export function useLang() {
  const { lang, setLang } = useContext(Ctx);
  return { lang, setLang };
}

// ---------------------------------------------------------------------------
// Toggle button — CS ↔ 中文
// ---------------------------------------------------------------------------

export function LangToggle() {
  const { lang, setLang, t } = useContext(Ctx);
  const next: Lang = lang === "cs" ? "zh" : "cs";
  return (
    <button
      onClick={() => setLang(next)}
      className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600 transition"
      title="Switch language / Přepnout jazyk"
    >
      {t("lang.other")}
    </button>
  );
}
