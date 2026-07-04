"use client";
// Sekce E-mailové kampaně v /admin/marketing.
// Flow: Nová kampaň → segment + brief → 🤖 vygenerovat (Anthropic) →
// úprava předmětu/těla → uložit koncept → odeslat (Resend, s potvrzením počtu).
import { useEffect, useState, useCallback } from "react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/lib/toast";

interface Campaign {
  id: string; title: string; segment: "all" | "brand" | "inactive_30";
  concept_slug: string | null; subject: string; body_html: string;
  status: "draft" | "sent" | "failed";
  recipients_count: number; sent_count: number; error: string | null;
  created_at: string; sent_at: string | null;
}

const CONCEPT_META: Record<string, { name: string; emoji: string }> = {
  "sunny-side": { name: "Prostě snídaně", emoji: "🍳" },
  "dumply":     { name: "Dumply",          emoji: "🥟" },
  "smash":      { name: "L.T. Smash",      emoji: "🍔" },
};

const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

export function CampaignsSection() {
  const t = useT();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", segment: "all" as Campaign["segment"], concept_slug: "sunny-side", brief: "", subject: "", body_html: "" });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [segCount, setSegCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/marketing/campaigns");
    const d = await r.json();
    setCampaigns(Array.isArray(d) ? d : []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Živý počet příjemců pro zvolený segment
  useEffect(() => {
    if (!editorOpen) return;
    let cancelled = false;
    setSegCount(null);
    const qs = new URLSearchParams({ segment: form.segment });
    if (form.segment === "brand") qs.set("concept_slug", form.concept_slug);
    fetch(`/api/admin/marketing/campaigns/count?${qs}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setSegCount(typeof d.count === "number" ? d.count : null); })
      .catch(() => { /* nevadí */ });
    return () => { cancelled = true; };
  }, [editorOpen, form.segment, form.concept_slug]);

  function openNew() {
    setEditingId(null);
    setForm({ title: "", segment: "all", concept_slug: "sunny-side", brief: "", subject: "", body_html: "" });
    setEditorOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setForm({
      title: c.title, segment: c.segment,
      concept_slug: c.concept_slug ?? "sunny-side",
      brief: "", subject: c.subject, body_html: c.body_html,
    });
    setEditorOpen(true);
  }

  async function generate() {
    setGenerating(true);
    const r = await fetch("/api/admin/marketing/campaigns/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        segment: form.segment,
        concept_slug: form.segment === "brand" ? form.concept_slug : null,
        brief: form.brief,
      }),
    });
    const d = await r.json();
    setGenerating(false);
    if (d.error) { toast(d.error, "error"); return; }
    setForm(f => ({ ...f, subject: d.subject, body_html: d.body_html, title: f.title || d.subject }));
  }

  async function save() {
    if (!form.title.trim() || !form.subject.trim() || !form.body_html.trim()) {
      toast(t("campaigns.err.missing"), "error"); return;
    }
    setSaving(true);
    const payload = {
      title: form.title, segment: form.segment,
      concept_slug: form.segment === "brand" ? form.concept_slug : null,
      subject: form.subject, body_html: form.body_html,
    };
    const r = editingId
      ? await fetch(`/api/admin/marketing/campaigns/${editingId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/admin/marketing/campaigns", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    setSaving(false);
    if (d.error) { toast(d.error, "error"); return; }
    setEditorOpen(false);
    load();
  }

  async function send(c: Campaign) {
    // Potvrzení s aktuálním počtem příjemců
    const qs = new URLSearchParams({ segment: c.segment });
    if (c.segment === "brand" && c.concept_slug) qs.set("concept_slug", c.concept_slug);
    const cd = await fetch(`/api/admin/marketing/campaigns/count?${qs}`).then(r => r.json()).catch(() => ({ count: null }));
    const n = typeof cd.count === "number" ? cd.count : "?";
    if (!confirm(t("campaigns.sendConfirm").replace("{n}", String(n)))) return;

    setSendingId(c.id);
    const r = await fetch(`/api/admin/marketing/campaigns/${c.id}/send`, { method: "POST" });
    const d = await r.json();
    setSendingId(null);
    if (d.error && !d.sent) { toast(d.error, "error"); }
    else if (d.error) { toast(`${t("campaigns.sentPartial")} ${d.sent}/${d.recipients} · ${d.error}`, "error"); }
    else { toast(`${t("campaigns.sentOk")} ${d.sent}/${d.recipients}`, "success"); }
    load();
  }

  async function remove(c: Campaign) {
    if (!confirm(t("campaigns.deleteConfirm"))) return;
    await fetch(`/api/admin/marketing/campaigns/${c.id}`, { method: "DELETE" });
    load();
  }

  const segLabel = (c: Campaign) =>
    c.segment === "all" ? t("campaigns.seg.all")
    : c.segment === "inactive_30" ? t("campaigns.seg.inactive")
    : `${CONCEPT_META[c.concept_slug ?? ""]?.emoji ?? ""} ${CONCEPT_META[c.concept_slug ?? ""]?.name ?? c.concept_slug}`;

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">📧 {t("campaigns.title")}</h2>
          <p className="text-sm text-[var(--muted)]">{t("campaigns.desc")}</p>
        </div>
        <button onClick={openNew}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 transition">
          {t("campaigns.new")}
        </button>
      </div>

      {/* ── Editor ── */}
      {editorOpen && (
        <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)]">{t("campaigns.labelTitle")}</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder={t("campaigns.titlePlaceholder")} className={inputCls} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-[var(--muted)]">{t("campaigns.labelSegment")}</label>
                <select value={form.segment}
                  onChange={e => setForm({ ...form, segment: e.target.value as Campaign["segment"] })}
                  className={inputCls}>
                  <option value="all">{t("campaigns.seg.all")}</option>
                  <option value="brand">{t("campaigns.seg.brand")}</option>
                  <option value="inactive_30">{t("campaigns.seg.inactive")}</option>
                </select>
              </div>
              {form.segment === "brand" && (
                <div className="flex-1">
                  <label className="text-xs text-[var(--muted)]">{t("campaigns.labelBrand")}</label>
                  <select value={form.concept_slug}
                    onChange={e => setForm({ ...form, concept_slug: e.target.value })}
                    className={inputCls}>
                    {Object.entries(CONCEPT_META).map(([slug, m]) => (
                      <option key={slug} value={slug}>{m.emoji} {m.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-[var(--muted)]">
            {t("campaigns.recipients")}: <span className="text-white font-medium">{segCount === null ? "…" : segCount}</span>
          </p>

          <div>
            <label className="text-xs text-[var(--muted)]">{t("campaigns.labelBrief")}</label>
            <div className="flex gap-2">
              <input value={form.brief} onChange={e => setForm({ ...form, brief: e.target.value })}
                placeholder={t("campaigns.briefPlaceholder")} className={inputCls} />
              <button onClick={generate} disabled={generating}
                className="shrink-0 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:border-neutral-500 disabled:opacity-50 transition">
                {generating ? t("campaigns.generating") : "🤖 " + t("campaigns.generate")}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--muted)]">{t("campaigns.labelSubject")}</label>
            <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className={inputCls} />
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)]">{t("campaigns.labelBody")}</label>
              <textarea value={form.body_html} onChange={e => setForm({ ...form, body_html: e.target.value })}
                rows={10} className={inputCls + " font-mono text-xs resize-y"} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">{t("campaigns.preview")}</label>
              <div className="rounded-lg border border-[var(--border)] bg-white text-black px-4 py-3 text-sm overflow-auto max-h-72 [&_a]:text-blue-700"
                dangerouslySetInnerHTML={{ __html: form.body_html || `<p style="color:#999">${t("campaigns.previewEmpty")}</p>` }} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditorOpen(false)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white transition">
              {t("common.cancel")}
            </button>
            <button onClick={save} disabled={saving}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50 transition">
              {saving ? t("common.saving") : t("campaigns.saveDraft")}
            </button>
          </div>
        </div>
      )}

      {/* ── Seznam ── */}
      {loading ? (
        <p className="text-sm text-[var(--muted)]">{t("common.loading")}</p>
      ) : campaigns.length === 0 && !editorOpen ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
          {t("campaigns.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{c.title}</span>
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{segLabel(c)}</span>
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (
                      c.status === "sent" ? "bg-green-500/15 text-green-400"
                      : c.status === "failed" ? "bg-red-500/15 text-red-400"
                      : "bg-neutral-800 text-[var(--muted)]")}>
                      {c.status === "sent" ? t("campaigns.status.sent") : c.status === "failed" ? t("campaigns.status.failed") : t("campaigns.status.draft")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)] truncate">✉️ {c.subject}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {new Date(c.created_at).toLocaleString("cs-CZ")}
                    {c.status !== "draft" && ` · ${t("campaigns.sentStat")}: ${c.sent_count}/${c.recipients_count}`}
                    {c.error && <span className="text-red-400"> · {c.error}</span>}
                  </p>
                </div>
                {c.status === "draft" && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(c)}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">
                      {t("common.edit")}
                    </button>
                    <button onClick={() => send(c)} disabled={sendingId === c.id}
                      className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
                      {sendingId === c.id ? t("campaigns.sending") : "📨 " + t("campaigns.send")}
                    </button>
                    <button onClick={() => remove(c)}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-red-400 hover:border-red-500/30">
                      {t("common.delete")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--muted)]">{t("campaigns.footnote")}</p>
    </div>
  );
}
