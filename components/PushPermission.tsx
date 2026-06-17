"use client";
import { useState, useEffect } from "react";

export function PushPermission() {
  const [state, setState] = useState<"loading"|"unsupported"|"granted"|"denied"|"prompt">("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported"); return;
    }
    setState(Notification.permission === "default" ? "prompt" : Notification.permission as "granted"|"denied");
  }, []);

  async function enable() {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); return; }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState("granted");
    } catch { setState("denied"); }
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setState("prompt");
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="border-t border-[var(--border)] pt-5">
      <h2 className="font-medium mb-2 text-sm">Notifikace</h2>
      {state === "granted" ? (
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <span className="text-sm text-green-400">✓ Notifikace zapnuty</span>
          <button onClick={disable} className="text-xs text-[var(--muted)] underline hover:text-white">Vypnout</button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted)]">Dostávej push notifikace o stavu objednávky přímo do telefonu.</p>
          {state === "denied" ? (
            <p className="text-sm text-amber-400">Notifikace jsou zablokovány v nastavení prohlížeče.</p>
          ) : (
            <button onClick={enable}
              className="w-full rounded-xl border border-[var(--border)] py-3 text-sm hover:border-neutral-600 transition">
              🔔 Zapnout notifikace o objednávce
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
