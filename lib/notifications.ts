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

// Odeslání e-mailu přes Resend
export async function sendStatusEmail(
  toEmail: string,
  toName: string,
  orderId: string,
  status: OrderStatus
) {
  const apiKey = process.env.RESEND_API_KEY;
  console.error(`[email-diag] status=${status} order=${orderId} to=${toEmail} key_present=${!!apiKey}`);
  if (!apiKey) return; // bez klíče tiše přeskočíme

  const msg = STATUS_MESSAGES[status];
  if (!msg) { console.error(`[email-diag] status=${status} nemá definovaný text — přeskakuji`); return; }

  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:22px;margin-bottom:8px">${msg.title}</h2>
      <p style="color:#555;margin-bottom:16px">${msg.body}</p>
      <p style="color:#555">Objednávka: <strong>${orderId}</strong></p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app"}/ucet/objednavky"
         style="display:inline-block;margin-top:16px;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">
        Sledovat objednávku →
      </a>
      <p style="margin-top:32px;font-size:12px;color:#999">Powered by Food Factory</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "Food Factory <onboarding@resend.dev>",
      to: toEmail,
      subject: `${msg.title} — objednávka ${orderId}`,
      html,
    }),
  }).catch((e) => { console.error(`[email-diag] status fetch error: ${e}`); return null; });
  if (res) {
    const body = await res.text().catch(() => "");
    console.error(`[email-diag] status resend status=${res.status} body=${body.slice(0, 200)}`);
  }
}

// Potvrzení o přijetí objednávky (i pro hosty bez registrace)
export async function sendOrderConfirmationEmail(
  toEmail: string,
  toName: string,
  orderId: string,
  totalCzk: number
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // bez klíče tiše přeskočíme

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
      <p style="margin-top:32px;font-size:12px;color:#999">Powered by Food Factory</p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "Food Factory <onboarding@resend.dev>",
      to: toEmail,
      subject: `Objednávka ${orderId} přijata`,
      html,
    }),
  }).catch(() => null);
}
