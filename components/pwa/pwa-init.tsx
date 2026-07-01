"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInit({ brandSlug, brandName, accentColor }: {
  brandSlug: string;
  brandName: string;
  accentColor: string;
}) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Registrace SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(console.error);
    }

    // Detekce iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const safari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    setIsIos(ios && safari);

    // Detekce installed (standalone mode)
    const installed = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(installed);

    // Prompt event (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      // Zobrazit prompt jen pokud nebyl dřív odmítnut
      const dismissed = sessionStorage.getItem(`pwa-dismissed-${brandSlug}`);
      if (!dismissed) setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS — zobrazit hint po 3s pokud ještě není nainstalovaná
    if (ios && safari && !installed) {
      const shown = sessionStorage.getItem(`pwa-ios-shown-${brandSlug}`);
      if (!shown) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [brandSlug]);

  function dismiss() {
    setShowPrompt(false);
    sessionStorage.setItem(`pwa-dismissed-${brandSlug}`, "1");
    if (isIos) sessionStorage.setItem(`pwa-ios-shown-${brandSlug}`, "1");
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setShowPrompt(false);
  }

  if (!showPrompt || isInstalled) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-[slideUp_0.3s_ease-out]"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div className="max-w-sm mx-auto">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: accentColor }}
          >
            {brandSlug === "dumply" ? "🥟" : brandSlug === "sunny-side" ? "🍳" : "🍔"}
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{brandName}</div>
            <div className="text-xs text-neutral-400 mt-0.5">
              Přidej na plochu pro rychlejší objednávání
            </div>
          </div>
          <button onClick={dismiss} className="ml-auto text-neutral-500 hover:text-white text-lg leading-none">×</button>
        </div>

        {isIos ? (
          <div className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-xs text-neutral-300 space-y-1.5">
            <p className="font-medium text-white">Jak přidat na plochu na iPhone:</p>
            <p>1. Klepni na <span className="text-blue-400">Sdílet</span> <span className="text-base">⬆</span> dole v Safari</p>
            <p>2. Vyber <span className="text-blue-400">Přidat na plochu</span></p>
            <p>3. Potvrď klepnutím na <span className="text-blue-400">Přidat</span></p>
          </div>
        ) : (
          <button
            onClick={install}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white"
            style={{ background: accentColor }}
          >
            Přidat na plochu
          </button>
        )}
      </div>
    </div>
  );
}
