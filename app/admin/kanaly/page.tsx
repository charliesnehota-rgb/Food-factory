"use client";
// Channel manager: napojení Wolt / foodora per koncept.
// Admin je zdroj pravdy — změny cen, fotek, dostupnosti a hodin se
// automaticky frontují a worker je posílá na platformy (cron á 5 min).
import { useEffect, useState, useCallback } from "react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/lib/toast";

interface Connection {
  id: string; channel: "wolt" | "foodora"; concept_slug: string;
  external_venue_id: string | null; enabled: boolean; price_multiplier: number;
}
interface QueueItem {
  id: string; channel: string; concept_slug: string; event_type: string;
  status: string; attempts: number; error: string | null;
  created_at: string; processed_at: string | null;
}

const CONCEPT_META: Record<string, { name: string; emoji: string }> = {
  "sunny-side": { name: "Prostě snídaně", emoji: "🍳" },
  "dumply":     { name: "Dumply",          emoji: "🥟" },
  "smash":      { name: "L.T. Smash",      emoji: "🍔" },
};
const CHANNEL_META: Record<string, { name: string; emoji: string }> = {
  wolt:    { name: "Wolt",    emoji: "🟦" },
  foodora: { name: "foodora", emoji: "🟪" },
};

const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

export default function ChannelsPage() {
  const t = useT();
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [stats, setStats] = useState<Record<string, { pending: number; failed: number; skipped: number }>>({});
  const [configured, setConfigured] = useState<{ wolt: boolean; foodora: boolean }>({ wolt: false, foodora: false });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const [c, q] = await Promise.all([
      fetch("/api/admin/channels").then(r => r.json()),
      fetch("/api/admin/channels/queue").then(r => r.json()),
    ]);
    setConnections(Array.isArray(c.connections) ? c.connections : []);
    setStats(c.stats ?? {});
    setConfigured(c.configured ?? { wolt: false, foodora: false });
    setQueue(Array.isArray(q) ? q : []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveConn(conn: Connection, patch: Partial<Connection>) {
    setSavingId(conn.id);
    const r = await fetch("/api/admin/channels", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: conn.id, ...patch }),
    });
    const d = await r.json();
    setSavingId(null);
    if (d.error) { toast(d.error, "error"); return; }
    setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, ...d, price_multiplier: Number(d.price_multiplier) } : c));
  }

  async function fullSync(conn: Connection) {
    const r = await fetch("/api/admin/channels/full-sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: conn.channel, concept_slug: conn.concept_slug }),
    });
    const d = await r.json();
    if (d.error) { toast(d.error, "error"); return; }
    toast(t("channels.queued"), "success");
    load();
  }

  async function runNow() {
    setRunning(true);
    const r = await fetch("/api/admin/channels/run", { method: "POST" });
    const d = await r.json();
    setRunning(false);
    if (d.error) { toast(d.error, "error"); return; }
    toast(`${t("channels.runDone")}: ✓${d.done} · ✕${d.failed} · ⏭${d.skipped} · ⏳${d.deferred}`, d.failed > 0 ? "warning" : "success");
    load();
  }

  const statusBadge = (s: string) =>
    s === "done" ? "bg-green-500/15 text-green-400"
    : s === "failed" ? "bg-red-500/15 text-red-400"
    : s === "skipped" ? "bg-amber-500/15 text-amber-400"
    : "bg-neutral-800 text-[var(--muted)]";

  return (
    <div>
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">📡 {t("channels.title")}</h1>
          <p className="text-sm text-[var(--muted)]">{t("channels.desc")}</p>
        </div>
        <button onClick={runNow} disabled={running}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50 transition">
          {running ? t("channels.running") : "▶ " + t("channels.runNow")}
        </button>
      </div>

      {/* Stav API klíčů */}
      <div className="mb-5 grid sm:grid-cols-2 gap-3">
        {(["wolt", "foodora"] as const).map(ch => (
          <div key={ch} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 flex items-center justify-between">
            <span className="font-medium">{CHANNEL_META[ch].emoji} {CHANNEL_META[ch].name}</span>
            <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium " + (configured[ch] ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>
              {configured[ch] ? t("channels.keysOk") : t("channels.keysMissing")}
            </span>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">{t("common.loading")}</p>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => {
            const cm = CONCEPT_META[conn.concept_slug] ?? { name: conn.concept_slug, emoji: "🍴" };
            const chm = CHANNEL_META[conn.channel];
            const st = stats[`${conn.channel}:${conn.concept_slug}`];
            const keysOk = configured[conn.channel];
            return (
              <div key={conn.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{chm.emoji} {chm.name}</span>
                    <span className="text-[var(--muted)]">·</span>
                    <span>{cm.emoji} {cm.name}</span>
                    {st && (st.pending > 0 || st.failed > 0) && (
                      <span className="text-xs text-[var(--muted)]">
                        {st.pending > 0 && `⏳ ${st.pending}`} {st.failed > 0 && <span className="text-red-400">✕ {st.failed}</span>}
                      </span>
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                    <input type="checkbox" checked={conn.enabled}
                      disabled={savingId === conn.id || (!conn.enabled && (!keysOk || !conn.external_venue_id))}
                      onChange={e => saveConn(conn, { enabled: e.target.checked })}
                      className="h-4 w-4 accent-white" />
                    {conn.enabled ? t("channels.on") : t("channels.off")}
                  </label>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs text-[var(--muted)]">{conn.channel === "wolt" ? t("channels.venueId") : t("channels.vendorCode")}</label>
                    <input defaultValue={conn.external_venue_id ?? ""} className={inputCls}
                      onBlur={e => { if (e.target.value.trim() !== (conn.external_venue_id ?? "")) saveConn(conn, { external_venue_id: e.target.value }); }} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)]">{t("channels.multiplier")}</label>
                    <input type="number" step="0.05" min="0.5" max="3" defaultValue={conn.price_multiplier} className={inputCls}
                      onBlur={e => { const v = Number(e.target.value); if (v !== conn.price_multiplier) saveConn(conn, { price_multiplier: v }); }} />
                  </div>
                  <button onClick={() => fullSync(conn)}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:border-neutral-500 transition">
                    ⟳ {t("channels.fullSync")}
                  </button>
                </div>
                {!keysOk && (
                  <p className="mt-2 text-xs text-amber-400/80">{t("channels.keysHint." + conn.channel)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fronta */}
      <div className="mt-8">
        <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider mb-3">{t("channels.queueTitle")}</h2>
        {queue.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t("channels.queueEmpty")}</p>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <tr>
                  <th className="p-2.5 font-medium">{t("channels.col.when")}</th>
                  <th className="p-2.5 font-medium">{t("channels.col.channel")}</th>
                  <th className="p-2.5 font-medium">{t("channels.col.event")}</th>
                  <th className="p-2.5 font-medium">{t("channels.col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {queue.map(q => (
                  <tr key={q.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-2.5 whitespace-nowrap text-[var(--muted)]">{new Date(q.created_at).toLocaleString("cs-CZ")}</td>
                    <td className="p-2.5 whitespace-nowrap">{CHANNEL_META[q.channel]?.name ?? q.channel} · {CONCEPT_META[q.concept_slug]?.emoji ?? ""} {CONCEPT_META[q.concept_slug]?.name ?? q.concept_slug}</td>
                    <td className="p-2.5">{t("channels.event." + q.event_type)}</td>
                    <td className="p-2.5">
                      <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + statusBadge(q.status)}>
                        {t("channels.status." + q.status)}
                      </span>
                      {q.error && <span className="ml-2 text-xs text-[var(--muted)]">{q.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">{t("channels.footnote")}</p>
    </div>
  );
}
