// E-mailové kampaně: segmentace příjemců + rozesílka přes Resend batch API.
// Příjemci = registrovaní zákazníci s marketing_consent = true (GDPR opt-in).
import { supabaseAdmin } from "@/lib/db/supabase";

export type CampaignSegment = "all" | "brand" | "inactive_30";

export interface CampaignRecipient {
  email: string;
  name: string;
  unsubscribeToken: string;
}

const BRAND_META: Record<string, { name: string; emoji: string; accent: string }> = {
  "sunny-side": { name: "Prostě snídaně", emoji: "🍳", accent: "#BF3B16" },
  "dumply":     { name: "Dumply",         emoji: "🥟", accent: "#C4452F" },
  "smash":      { name: "L.T. Smash",     emoji: "🍔", accent: "#E85D1F" },
};

/**
 * Vrátí příjemce daného segmentu (jen se souhlasem a e-mailem).
 * Dva zdroje: registrovaní zákazníci (user_profiles) a hosté z checkoutu
 * (marketing_subscribers). Dedup podle e-mailu — profil má přednost.
 */
export async function resolveCampaignRecipients(
  segment: CampaignSegment,
  conceptSlug?: string | null
): Promise<CampaignRecipient[]> {
  if (!supabaseAdmin) return [];

  const [{ data: profiles }, { data: guests }] = await Promise.all([
    supabaseAdmin
      .from("user_profiles")
      .select("id, email, full_name, unsubscribe_token")
      .eq("marketing_consent", true)
      .not("email", "is", null),
    supabaseAdmin
      .from("marketing_subscribers")
      .select("email, name, unsubscribe_token")
      .eq("marketing_consent", true),
  ]);

  let profileList = (profiles ?? []).filter(p => p.email);
  const profileEmails = new Set(profileList.map(p => (p.email as string).toLowerCase()));
  let guestList = (guests ?? []).filter(g => g.email && !profileEmails.has(g.email.toLowerCase()));

  if (segment === "brand" && conceptSlug) {
    // Zákazníci, kteří někdy objednali z daného konceptu
    const ids = profileList.map(p => p.id);
    const guestEmails = guestList.map(g => g.email);
    const [byUser, byEmail] = await Promise.all([
      ids.length > 0
        ? supabaseAdmin.from("orders").select("user_id")
            .eq("concept_slug", conceptSlug).in("user_id", ids).not("user_id", "is", null)
        : Promise.resolve({ data: [] as { user_id: string }[] }),
      guestEmails.length > 0
        ? supabaseAdmin.from("orders").select("customer_email")
            .eq("concept_slug", conceptSlug).in("customer_email", guestEmails)
        : Promise.resolve({ data: [] as { customer_email: string }[] }),
    ]);
    const brandIds = new Set((byUser.data ?? []).map(o => o.user_id));
    const brandEmails = new Set((byEmail.data ?? []).map(o => o.customer_email?.toLowerCase()));
    profileList = profileList.filter(p => brandIds.has(p.id));
    guestList = guestList.filter(g => brandEmails.has(g.email.toLowerCase()));
  }

  if (segment === "inactive_30") {
    // Bez zaplacené objednávky za posledních 30 dní
    const ago30 = new Date(); ago30.setDate(ago30.getDate() - 30);
    const ids = profileList.map(p => p.id);
    const guestEmails = guestList.map(g => g.email);
    const [byUser, byEmail] = await Promise.all([
      ids.length > 0
        ? supabaseAdmin.from("orders").select("user_id")
            .eq("payment_status", "paid").gte("created_at", ago30.toISOString())
            .in("user_id", ids).not("user_id", "is", null)
        : Promise.resolve({ data: [] as { user_id: string }[] }),
      guestEmails.length > 0
        ? supabaseAdmin.from("orders").select("customer_email")
            .eq("payment_status", "paid").gte("created_at", ago30.toISOString())
            .in("customer_email", guestEmails)
        : Promise.resolve({ data: [] as { customer_email: string }[] }),
    ]);
    const activeIds = new Set((byUser.data ?? []).map(o => o.user_id));
    const activeEmails = new Set((byEmail.data ?? []).map(o => o.customer_email?.toLowerCase()));
    profileList = profileList.filter(p => !activeIds.has(p.id));
    guestList = guestList.filter(g => !activeEmails.has(g.email.toLowerCase()));
  }

  return [
    ...profileList.map(p => ({
      email: p.email as string,
      name: p.full_name ?? "",
      unsubscribeToken: p.unsubscribe_token as string,
    })),
    ...guestList.map(g => ({
      email: g.email,
      name: g.name ?? "",
      unsubscribeToken: g.unsubscribe_token as string,
    })),
  ];
}

/** Obalí tělo kampaně do e-mail šablony s hlavičkou brandu a odhlašovací patičkou. */
export function buildCampaignHtml(bodyHtml: string, conceptSlug: string | null, unsubscribeToken: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";
  const brand = conceptSlug ? BRAND_META[conceptSlug] : null;
  const header = brand
    ? `<div style="background:${brand.accent};color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:700">${brand.emoji} ${brand.name}</div>`
    : `<div style="background:#111;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:700">🍴 Free City</div>`;

  return `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
    ${header}
    <div style="border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;padding:24px">
      ${bodyHtml}
    </div>
    <p style="margin-top:20px;font-size:12px;color:#999;text-align:center;line-height:1.6">
      Tento e-mail jste dostali, protože jste při registraci souhlasili se zasíláním novinek.<br>
      <a href="${site}/api/marketing/unsubscribe?token=${unsubscribeToken}" style="color:#999;text-decoration:underline">Odhlásit se z odběru</a>
      · Free City, Praha
    </p>
  </div>`;
}

/**
 * Odešle kampaň přes Resend batch API (max 100 e-mailů / volání).
 * Vrací počet úspěšně odeslaných + případnou chybu (např. denní limit free tieru).
 */
export async function sendCampaignBatch(
  recipients: CampaignRecipient[],
  subject: string,
  bodyHtml: string,
  conceptSlug: string | null
): Promise<{ sent: number; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: 0, error: "RESEND_API_KEY chybí" };

  const from = process.env.RESEND_FROM ?? "Free City <onboarding@resend.dev>";
  let sent = 0;
  let lastError: string | undefined;

  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const payload = chunk.map(r => ({
      from,
      to: r.email,
      subject,
      html: buildCampaignHtml(bodyHtml, conceptSlug, r.unsubscribeToken),
    }));

    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        sent += chunk.length;
      } else {
        const d = await res.json().catch(() => ({}));
        lastError = d?.message ?? `Resend HTTP ${res.status}`;
        if (res.status === 429) break; // denní limit / rate limit — dál to nemá smysl
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Síťová chyba";
    }

    // Resend rate limit 2 req/s — mezi dávkami krátká pauza
    if (i + 100 < recipients.length) await new Promise(r => setTimeout(r, 600));
  }

  return { sent, error: lastError };
}
