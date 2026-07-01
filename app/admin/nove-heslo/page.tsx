"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/auth/client";
import { useT } from "@/lib/i18n";

const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none w-full";

export default function NoveHesloPage() {
  const t = useT();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    if (pw.length < 8) { setMsg(t("newPassword.err.short")); return; }
    if (pw !== pw2) { setMsg(t("newPassword.err.mismatch")); return; }
    setSaving(true); setMsg("");
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) { setMsg(error.message); return; }
    setMsg(t("newPassword.success"));
    setTimeout(() => router.push("/admin"), 1500);
  }

  return (
    <div className="max-w-sm">
      <h1 className="mb-5 text-xl font-semibold">{t("newPassword.title")}</h1>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[var(--muted)]">{t("newPassword.label.new")}</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">{t("newPassword.label.confirm")}</label>
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className={inputCls}
          />
        </div>
      </div>
      {msg && <p className="mt-3 text-sm text-[var(--muted)]">{msg}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {saving ? t("newPassword.saving") : t("newPassword.save")}
      </button>
    </div>
  );
}
