import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { sendSignupConfirmationEmail } from "@/lib/notifications";

// POST /api/auth/register
// Registrace zákazníka server-side: generateLink(signup) + potvrzovací e-mail přes Resend.
// Obchází nespolehlivý vestavěný Supabase mailer (limit ~2 e-maily/hod).
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { email, password, name, resend } = await req.json();

  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const cleanName = String(name ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Neplatný e-mail." }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";
  const redirectTo = `${site}/ucet/prihlaseni?confirmed=1`;

  // ── Znovuodeslání potvrzovacího e-mailu ──
  if (resend) {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink", // magiclink funguje pro existující nepotvrzené i potvrzené účty
      email: cleanEmail,
      options: { redirectTo },
    });
    if (error || !data?.properties?.action_link) {
      // Nezveřejňuj, zda účet existuje
      return NextResponse.json({ ok: true });
    }
    await sendSignupConfirmationEmail(cleanEmail, cleanName || "u nás", data.properties.action_link);
    return NextResponse.json({ ok: true });
  }

  // ── Nová registrace ──
  if (!cleanName) return NextResponse.json({ error: "Zadej jméno." }, { status: 400 });
  if (String(password ?? "").length < 8) {
    return NextResponse.json({ error: "Heslo musí mít aspoň 8 znaků." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email: cleanEmail,
    password,
    options: {
      data: { full_name: cleanName },
      redirectTo,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return NextResponse.json(
        { error: "Tento e-mail je už registrovaný. Přihlas se, nebo použij jiný e-mail." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const link = data?.properties?.action_link;
  if (!link) return NextResponse.json({ error: "Nepodařilo se vygenerovat potvrzovací odkaz." }, { status: 500 });

  const sent = await sendSignupConfirmationEmail(cleanEmail, cleanName, link);
  if (!sent.ok) {
    return NextResponse.json({ error: "Účet vytvořen, ale e-mail se nepodařilo odeslat. Zkus 'Odeslat znovu'." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, email: cleanEmail }, { status: 201 });
}
