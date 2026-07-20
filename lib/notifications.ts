import webpush from "web-push";
import type { OrderStatus } from "@/lib/types";

// VAPID konfigurace
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    "mailto:info@foodfactory.cz",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Texty notifikací per stav
const STATUS_MESSAGES: Partial<Record<OrderStatus, { title: string; body: string }>> = {
  accepted:         { title: "✅ Objednávka přijata",     body: "Kuchyně ji má — brzy se začne připravovat." },
  preparing:        { title: "👨‍🍳 Připravujeme",          body: "Vaše jídlo se právě připravuje." },
  ready:            { title: "🎉 Hotovo!",                body: "Objednávka je připravena k vyzvednutí." },
  out_for_delivery: { title: "🛵 Na cestě",               body: "Kurýr vyjel s vaší objednávkou." },
  delivered:        { title: "✓ Doručeno",                body: "Dobrou chuť! Objednávka je doručena." },
  cancelled:        { title: "❌ Objednávka zrušena",     body: "Vaše objednávka byla zrušena. V případě dotazů nás kontaktujte." },
};

interface PushSub {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

// Odeslání push notifikace
export async function sendPushNotification(subs: PushSub[], orderId: string, status: OrderStatus) {
  const msg = STATUS_MESSAGES[status];
  if (!msg || !process.env.VAPID_PRIVATE_KEY) return;

  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body,
    orderId,
    url: `/ucet/objednavky`,
  });

  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        payload
      ).catch(() => null) // expired subscriptions ignorujeme
    )
  );
}

// Expo push do mobilní aplikace — přímé volání Expo Push API, bez SDK.
// Tokeny drží tabulka expo_push_tokens (registruje je appka po přihlášení).
export async function sendExpoPushNotification(tokens: string[], orderId: string, status: OrderStatus) {
  const msg = STATUS_MESSAGES[status];
  if (!msg || tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title: msg.title,
    body: msg.body,
    data: { orderId, status },
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  }).catch(() => null); // push je best-effort
}

// Jediné místo, kudy odcházejí e-maily do Resendu. Selhání se loguje se
// statusem a tělem odpovědi, aby šla příčina dohledat ve Vercel runtime
// logu (dřív se odpověď zahazovala a chyby byly neviditelné).
async function resendSend(payload: Record<string, unknown>, label: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`[resend:${label}] RESEND_API_KEY chybí`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "Free City <onboarding@resend.dev>",
      ...payload,
    }),
  }).catch((e: unknown) => {
    console.error(`[resend:${label}] síťová chyba:`, e instanceof Error ? e.message : e);
    return null;
  });
  if (!res) return false;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[resend:${label}] HTTP ${res.status}: ${body.slice(0, 500)}`);
    return false;
  }
  return true;
}

// Odeslání e-mailu přes Resend
export async function sendStatusEmail(
  toEmail: string,
  toName: string,
  orderId: string,
  status: OrderStatus
) {

  const msg = STATUS_MESSAGES[status];
  if (!msg) return;

  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:22px;margin-bottom:8px">${msg.title}</h2>
      <p style="color:#555;margin-bottom:16px">${msg.body}</p>
      <p style="color:#555">Objednávka: <strong>${orderId}</strong></p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app"}/ucet/objednavky"
         style="display:inline-block;margin-top:16px;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">
        Sledovat objednávku →
      </a>
      <p style="margin-top:32px;font-size:12px;color:#999">Powered by Free City</p>
    </div>
  `;

  await resendSend({ to: toEmail, subject: `${msg.title} — objednávka ${orderId}`, html }, "status");
}

// Potvrzení o přijetí objednávky (i pro hosty bez registrace)
export async function sendOrderConfirmationEmail(
  toEmail: string,
  toName: string,
  orderId: string,
  totalCzk: number
) {

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:22px;margin-bottom:8px">✅ Objednávka přijata</h2>
      <p style="color:#555;margin-bottom:16px">Díky${toName ? `, ${toName}` : ""}! Tvoji objednávku jsme dostali a začínáme ji řešit.</p>
      <p style="color:#555">Číslo objednávky: <strong>${orderId}</strong></p>
      <p style="color:#555">Celkem: <strong>${totalCzk} Kč</strong></p>
      <a href="${site}/objednavka/${orderId}"
         style="display:inline-block;margin-top:16px;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">
        Sledovat objednávku →
      </a>
      <p style="margin-top:12px;font-size:13px;color:#888">O každé změně stavu ti dáme vědět e-mailem.</p>
      <p style="margin-top:32px;font-size:12px;color:#999">Powered by Free City</p>
    </div>
  `;

  await resendSend({ to: toEmail, subject: `Objednávka ${orderId} přijata`, html }, "order");
}

// Denní upozornění na docházející zásoby (adminům)
export async function sendLowStockEmail(
  toEmails: string[],
  items: { name: string; current: number; min: number; unit: string; suggested: number }[]
) {
  if (toEmails.length === 0 || items.length === 0) return;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";
  const rows = items.map((i) =>
    `<tr>
       <td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td>
       <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#b45309">${fmt(i.current)} ${i.unit}</td>
       <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#888">${fmt(i.min)} ${i.unit}</td>
       <td style="padding:6px 10px;border-bottom:1px solid #eee"><strong>${fmt(i.suggested)} ${i.unit}</strong></td>
     </tr>`).join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:20px;margin-bottom:4px">🛒 Sklad: ${items.length} položek pod minimem</h2>
      <p style="color:#555;margin-bottom:16px">Doporučené množství k doplnění:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Surovina</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Stav</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Min</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Koupit</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <a href="${site}/admin/sklad/nakup"
         style="display:inline-block;margin-top:16px;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">
        Otevřít nákup →
      </a>
      <p style="margin-top:32px;font-size:12px;color:#999">Free City — sklad</p>
    </div>`;

  await resendSend({ to: toEmails, subject: `Sklad: ${items.length} položek dochází`, html }, "low-stock");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c));
}
function fmt(n: number) {
  return (Math.round(Number(n) * 1000) / 1000).toString().replace(".", ",");
}

// Denní upozornění na blížící se expirace (adminům)
export async function sendExpiringEmail(
  toEmails: string[],
  items: { name: string; current_qty: number; base_unit: string; nearest_expiry: string; days_until_expiry: number }[]
) {
  if (toEmails.length === 0 || items.length === 0) return;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";
  const rows = items.map((i) => {
    const label = i.days_until_expiry < 0
      ? `<span style="color:#ef4444">expirováno ${i.nearest_expiry}</span>`
      : i.days_until_expiry === 0
        ? `<span style="color:#ef4444">vyprší dnes</span>`
        : `<span style="color:#f59e0b">za ${i.days_until_expiry} dní (${i.nearest_expiry})</span>`;
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${fmt(i.current_qty)} ${i.base_unit}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${label}</td>
    </tr>`;
  }).join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:20px;margin-bottom:4px">⚠️ Sklad: ${items.length} položek s blížící se expirací</h2>
      <p style="color:#555;margin-bottom:16px">Doporučujeme odepsat nebo spotřebovat:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Surovina</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Stav</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Expirace</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <a href="${site}/admin/sklad"
         style="display:inline-block;margin-top:16px;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">
        Otevřít sklad →
      </a>
      <p style="margin-top:32px;font-size:12px;color:#999">Free City — sklad</p>
    </div>`;

  await resendSend({ to: toEmails, subject: `Sklad: ${items.length} položek blíží se expiraci`, html }, "expiring");
}

// Pozvánka pro nový personál
export async function sendInviteEmail(
  toEmail: string,
  toName: string,
  inviteLink: string
) {

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:20px;margin-bottom:8px">👋 Vítej v Free City</h2>
      <p style="color:#555;margin-bottom:4px">Ahoj ${escapeHtml(toName)},</p>
      <p style="color:#555;margin-bottom:24px">
        Byl/a jsi přidán/a do týmu Free City. Klikni na tlačítko níže,
        nastav si heslo a dostaneš se přímo do administrace.
      </p>
      <a href="${inviteLink}"
         style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">
        Nastavit heslo a přihlásit se →
      </a>
      <p style="margin-top:24px;font-size:13px;color:#888">
        Odkaz je platný 24 hodin. Pokud tlačítko nefunguje, zkopíruj a vlož do prohlížeče:<br>
        <span style="word-break:break-all;color:#555">${inviteLink}</span>
      </p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
      <p style="font-size:12px;color:#aaa">Free City — správa týmu · <a href="${site}/admin" style="color:#aaa">Přejít do adminu</a></p>
    </div>`;

  await resendSend({ to: [toEmail], subject: "Pozvánka do Free City — nastav si heslo", html }, "invite");
}

// Potvrzení registrace zákazníka (posíláme sami přes Resend — Supabase mailer je nespolehlivý)
export async function sendSignupConfirmationEmail(
  toEmail: string,
  toName: string,
  confirmLink: string
) {

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:20px;margin-bottom:8px">🍴 Vítej ve Free City</h2>
      <p style="color:#555;margin-bottom:4px">Ahoj ${escapeHtml(toName)},</p>
      <p style="color:#555;margin-bottom:24px">
        Díky za registraci! Zbývá poslední krok — potvrď svůj e-mail kliknutím na tlačítko:
      </p>
      <a href="${confirmLink}"
         style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">
        Potvrdit e-mail a dokončit registraci →
      </a>
      <p style="margin-top:24px;font-size:13px;color:#888">
        Odkaz je platný 24 hodin. Pokud tlačítko nefunguje, zkopíruj a vlož do prohlížeče:<br>
        <span style="word-break:break-all;color:#555">${confirmLink}</span>
      </p>
      <p style="margin-top:16px;font-size:13px;color:#888">
        Pokud sis účet nezakládal/a ty, tento e-mail ignoruj.
      </p>
    </div>`;

  const ok = await resendSend({ to: [toEmail], subject: "Potvrď svůj e-mail — Free City", html }, "signup");
  if (!ok) return { ok: false, error: "Odeslání selhalo" };
  return { ok: true };
}
