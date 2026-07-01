"use client";

import { useEffect, useState, useCallback } from "react";
import { useT } from "@/lib/i18n";

// --- Typy ---
interface Proposal {
  id: string; type: string; status: string; trigger_type: string;
  concept_slug: string | null; title: string; reason: string;
  payload: Record<string, unknown>;
  valid_from: string | null; valid_until: string | null;
  reviewed_by: string | null; reviewed_at: string | null;
  review_note: string | null; applied_at: string | null;
  created_at: string;
}

// --- Helpers ---
const CONCEPT_META: Record<string, { name: string; accent: string; emoji: string }> = {
  "sunny-side": { name: "Prostě snídaně", accent: "#f59e0b", emoji: "🍳" },
  "dumply":     { name: "Dumply",          accent: "#ec4899", emoji: "🥟" },
  "smash":      { name: "L.T. Smash",      accent: "#f97316", emoji: "🍔" },
};
const TRIGGER_LABELS: Record<string, string> = {
  expiry: "expirace", peak: "špička", off_peak: "mimo špičku",
  surge: "vytížení", manual: "manuální",
};
const TYPE_ICONS: Record<string, string> = {
  price_override: "💲", push_notification: "🔔", happy_hour: "🎉",
};
const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-500/15 text-amber-400",
  approved: "bg-blue-500/15 text-blue-400",
  applied:  "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
  expired:  "bg-neutral-500/15 text-neutral-400",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "čeká", approved: "schváleno", applied: "provedeno",
  rejected: "zamítnuto", expired: "expirováno",
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

// --- Karta návrhu ---
function ProposalCard({
  p, onApprove, onReject, onApply, loading,
}: {
  p: Proposal;
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
  onApply: (id: string) => void;
  loading: string | null;
}) {
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);
  const meta = p.concept_slug ? CONCEPT_META[p.concept_slug] : null;
  const isBusy = loading === p.id;

  const payload = p.payload;
  const discountPct = payload.discount_pct != null ? Number(payload.discount_pct) : undefined;
  const productIds = Array.isArray(payload.product_ids) ? payload.product_ids as string[] : undefined;
  const validH = payload.valid_hours != null ? Number(payload.valid_hours) : undefined;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <span className="text-2xl mt-0.5">{TYPE_ICONS[p.type] ?? "📋"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium">{p.title}</span>
            <Badge label={STATUS_LABELS[p.status] ?? p.status} cls={STATUS_STYLES[p.status] ?? ""} />
            <Badge label={TRIGGER_LABELS[p.trigger_type] ?? p.trigger_type} cls="bg-[var(--bg)] text-[var(--muted)]" />
            {meta && <span className="text-xs" style={{ color: meta.accent }}>{meta.emoji} {meta.name}</span>}
          </div>
          <p className="text-sm text-[var(--muted)]">{p.reason}</p>
          {/* Klíčové číslo */}
          {discountPct !== undefined && (
            <div className="mt-2 text-sm">
              <span className={discountPct < 0 ? "text-green-400 font-semibold" : "text-amber-400 font-semibold"}>
                {discountPct > 0 ? "+" : ""}{discountPct} %
              </span>
              {productIds && <span className="text-[var(--muted)] ml-2">na {productIds.length} produktu/ů</span>}
              {validH && <span className="text-[var(--muted)] ml-2">· platnost {validH} h</span>}
            </div>
          )}
          {/* Push preview */}
          {(payload.push_title != null || payload.title != null) && p.type !== "price_override" && (
            <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs">
              <div className="font-medium">{String(payload.push_title ?? payload.title ?? "")}</div>
              <div className="text-[var(--muted)]">{String(payload.push_body ?? payload.body ?? "")}</div>
            </div>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-[var(--muted)] hover:text-white shrink-0 mt-1">
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Rozbalený JSON payload */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <pre className="text-[10px] text-[var(--muted)] whitespace-pre-wrap break-all">
            {JSON.stringify(p.payload, null, 2)}
          </pre>
        </div>
      )}

      {/* Akce */}
      {p.status === "pending" && (
        <div className="border-t border-[var(--border)] px-4 py-3 flex flex-wrap items-center gap-2">
          <input
            placeholder="Poznámka (volitelné)"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs focus:border-neutral-500 focus:outline-none flex-1 min-w-0"
          />
          <button
            onClick={() => onApprove(p.id, note)}
            disabled={isBusy}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {isBusy ? "…" : "✓ Schválit"}
          </button>
          <button
            onClick={() => onReject(p.id, note)}
            disabled={isBusy}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:border-red-500/60 disabled:opacity-50"
          >
            ✕ Zamítnout
          </button>
        </div>
      )}

      {p.status === "approved" && (
        <div className="border-t border-[var(--border)] px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-[var(--muted)]">Schváleno — připraveno k provedení</span>
          <button
            onClick={() => onApply(p.id)}
            disabled={isBusy}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50 ml-auto"
          >
            {isBusy ? "Provádím…" : "▶ Provést"}
          </button>
        </div>
      )}

      {p.status === "applied" && (
        <div className="border-t border-[var(--border)] px-4 py-2">
          <span className="text-xs text-green-400">✓ Provedeno {p.applied_at ? new Date(p.applied_at).toLocaleString("cs-CZ") : ""}</span>
        </div>
      )}

      {p.status === "rejected" && p.review_note && (
        <div className="border-t border-[var(--border)] px-4 py-2">
          <span className="text-xs text-[var(--muted)]">Zamítnuto: {p.review_note}</span>
        </div>
      )}
    </div>
  );
}

// --- Hlavní stránka ---
export default function MarketingPage() {
  const t = useT();
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState("");

  const load = useCallback(async (status = tab) => {
    setLoading(true);
    const statuses = status === "pending"
      ? ["pending", "approved"]
      : ["applied", "rejected", "expired"];
    const results = await Promise.all(
      statuses.map(s => fetch(`/api/admin/marketing/proposals?status=${s}`).then(r => r.json()))
    );
    setProposals(results.flat().sort((a: Proposal, b: Proposal) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function analyze() {
    setAnalyzing(true); setAnalyzeMsg("");
    const r = await fetch("/api/admin/marketing/analyze", { method: "POST" });
    const d = await r.json();
    setAnalyzing(false);
    if (d.error) { setAnalyzeMsg(`Chyba: ${d.error}`); return; }
    setAnalyzeMsg(d.created > 0
      ? `Agent navrhl ${d.created} nové akce.`
      : d.message ?? "Žádné nové akce.");
    if (d.created > 0) load("pending");
  }

  async function handleApprove(id: string, note: string) {
    setActionLoading(id);
    await fetch("/api/admin/marketing/proposals", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "approve", note }),
    });
    setActionLoading(null); load();
  }

  async function handleReject(id: string, note: string) {
    setActionLoading(id);
    await fetch("/api/admin/marketing/proposals", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "reject", note }),
    });
    setActionLoading(null); load();
  }

  async function handleApply(id: string) {
    setActionLoading(id);
    const r = await fetch("/api/admin/marketing/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const d = await r.json();
    setActionLoading(null);
    if (d.error) alert(d.error);
    load();
  }

  const pendingCount = proposals.filter(p => p.status === "pending").length;
  const approvedCount = proposals.filter(p => p.status === "approved").length;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("marketing.title")}</h1>
          <p className="text-sm text-[var(--muted)]">{t("marketing.desc")}</p>
        </div>
        <div className="flex items-center gap-2">
          {analyzeMsg && <span className="text-xs text-[var(--muted)]">{analyzeMsg}</span>}
          <button
            onClick={analyze}
            disabled={analyzing}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {analyzing ? "Analyzuji…" : "🤖 " + t("marketing.analyze")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-[var(--border)] pb-px">
        {[
          { key: "pending", label: `${t("marketing.tab.pending")}${pendingCount > 0 ? ` (${pendingCount})` : ""}${approvedCount > 0 ? ` · ${approvedCount} schváleno` : ""}` },
          { key: "history", label: t("marketing.tab.history") },
        ].map(tab2 => (
          <button
            key={tab2.key}
            onClick={() => { setTab(tab2.key as "pending" | "history"); }}
            className={"px-3 py-2 text-sm font-medium rounded-t-lg -mb-px transition " +
              (tab === tab2.key
                ? "border border-b-[var(--bg)] border-[var(--border)] bg-[var(--bg)] text-white"
                : "text-[var(--muted)] hover:text-white")}
          >
            {tab2.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">{t("common.loading")}</p>}

      {!loading && proposals.length === 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
          {tab === "pending" ? t("marketing.noPending") : t("marketing.noHistory")}
        </div>
      )}

      <div className="space-y-3">
        {proposals.map(p => (
          <ProposalCard
            key={p.id} p={p}
            onApprove={handleApprove}
            onReject={handleReject}
            onApply={handleApply}
            loading={actionLoading}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">{t("marketing.footnote")}</p>
    </div>
  );
}
