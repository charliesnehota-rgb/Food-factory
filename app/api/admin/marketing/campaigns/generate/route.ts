// POST /api/admin/marketing/campaigns/generate
// AI vygeneruje předmět + HTML tělo kampaně z briefu a aktuální nabídky.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

export async function POST(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY chybí" }, { status: 503 });

  const { segment, concept_slug, brief } = await req.json();

  // Kontext: aktuální nabídka (per brand nebo vše)
  let q = supabaseAdmin.from("products").select("name, description, price_czk, concept_slug").eq("available", true);
  if (segment === "brand" && concept_slug) q = q.eq("concept_slug", concept_slug);
  const { data: products } = await q;

  const segmentDesc = segment === "brand"
    ? `zákazníci konceptu ${concept_slug}`
    : segment === "inactive_30"
    ? "zákazníci, kteří 30+ dní neobjednali (cíl: přivést je zpět)"
    : "všichni zákazníci s odběrem novinek";

  const systemPrompt = `Jsi marketingový copywriter ghost kitchen Free City v Praze. Koncepty:
- sunny-side: "Prostě snídaně" 🍳 (snídaně po celý den)
- dumply: "Dumply" 🥟 (asijské dumplings)
- smash: "L.T. Smash" 🍔 (smash burgery)

Napiš e-mailovou kampaň v češtině. Pravidla:
- Předmět max 60 znaků, konkrétní, bez clickbaitu a CAPS
- Tělo jako jednoduché HTML: <h2>, <p>, <ul>/<li>, <strong>, max 1 CTA odkaz <a href="https://food-factory-zeta.vercel.app/SLUG" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px">text</a>
- Žádné <html>/<head>/<body> wrappery, žádné obrázky, žádné sliby slev, které nejsou v briefu
- Tón: přátelský, věcný, česky přirozený, 80–150 slov
- Zmiň 2–3 konkrétní produkty z nabídky (název + cena), pokud se hodí k briefu

Odpověz POUZE validním JSON (bez markdownu):
{"subject": "string", "body_html": "string"}`;

  const userMsg = `Segment: ${segmentDesc}
Brief od majitele: ${brief?.trim() || "obecná kampaň s novinkami z nabídky"}
Aktuální nabídka:
${JSON.stringify((products ?? []).map(p => ({ name: p.name, price: Number(p.price_czk), concept: p.concept_slug })), null, 2)}`;

  let text = "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    text = (await res.json()).content?.[0]?.text ?? "";
  } catch {
    return NextResponse.json({ error: "Chyba AI volání" }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!parsed.subject || !parsed.body_html) throw new Error("missing fields");
    return NextResponse.json({ subject: parsed.subject, body_html: parsed.body_html });
  } catch {
    return NextResponse.json({ error: "AI vrátila neplatný JSON", raw: text }, { status: 500 });
  }
}
