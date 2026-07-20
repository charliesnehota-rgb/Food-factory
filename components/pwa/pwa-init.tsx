"use client";

import { useEffect } from "react";

// Registruje service worker (push notifikace o stavu objednávky, offline cache).
//
// POZNÁMKA: Banner „Přidat na plochu" byl záměrně odstraněn (07/2026).
// Instalace se vrátí, až poběží samostatná aplikace Free City —
// jedna appka se všemi restauracemi, na kterou budou brand weby odkazovat.
// Manifesty per brand zůstávají, ruční instalace přes menu prohlížeče funguje dál.
export function PWAInit() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(console.error);
    }
  }, []);

  return null;
}
