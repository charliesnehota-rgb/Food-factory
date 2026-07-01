"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6"
      style={{ background: "#111", color: "#fff" }}>
      <div className="text-6xl">📡</div>
      <h1 className="text-2xl font-semibold">Jsi offline</h1>
      <p className="text-neutral-400 max-w-xs">
        Zkontroluj připojení k internetu a zkus to znovu.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-xl bg-white text-black px-6 py-3 text-sm font-semibold hover:bg-neutral-200"
      >
        Zkusit znovu
      </button>
    </div>
  );
}
