import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

interface AiLine { name: string; qty: number; unit: string; unit_price: number; total: number; vat_rate?: number; }

// Přečte vyfocenou účtenku / PDF fakturu a vytáhne položky. Napáruje je
// na skladové karty (návrh — personál pak v příjmu potvrdí/opraví).
export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI není nakonfigurované (chybí klíč)." }, { status: 503 });

  const { file_base64, media_type } = await req.json();
  if (!file_base64 || !media_type) return NextResponse.json({ error: "Chybí soubor." }, { status: 400 });

  const isPdf = media_type === "application/pdf";
  const sourceBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: file_base64 } }
    : { type: "image", source: { type: "base64", media_type, data: file_base64 } };

  const prompt = `Toto je účtenka nebo dodavatelská faktura za nákup surovin do kuchyně.
Vytáhni JEN nakupované položky (suroviny, zboží). Vynech mezisoučty, DPH řádky, zaokrouhlení, platby.
Pro každou položku vrať: name (název jak je na dokladu), qty (množství, číslo), unit (jednotka: g, kg, ml, l, ks, nebo "bal" když balení), unit_price (cena za jednotku), total (cena za řádek), vat_rate (sazba DPH v % pokud je uvedená, jinak vynech).
Ceny ber jak jsou na dokladu (většinou s DPH). Čísla s desetinnou tečkou.
Odpověz POUZE jako JSON pole, nic dalšího. Příklad:
[{"name":"Mleté hovězí 20%","qty":2,"unit":"kg","unit_price":189.9,"total":379.8,"vat_rate":12}]`;

  let aiText = "";
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: [sourceBlock, { type: "text", text: prompt }] }],
      }),
    });
    const aiData = await response.json();
    if (aiData.error) return NextResponse.json({ error: aiData.error.message ?? "AI chyba" }, { status: 502 });
    aiText = aiData.content?.[0]?.text ?? "";
  } catch {
    return NextResponse.json({ error: "AI nedostupné." }, { status: 502 });
  }

  let lines: AiLine[] = [];
  try {
    const json = aiText.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lines = (JSON.parse(json) as any[]).map((l) => ({
      name: String(l.name ?? "").trim(),
      qty: toNum(l.qty),
      unit: String(l.unit ?? "").toLowerCase().trim(),
      unit_price: toNum(l.unit_price),
      total: toNum(l.total),
      vat_rate: l.vat_rate != null ? toNum(l.vat_rate) : undefined,
    })).filter((l) => l.name);
  } catch {
    return NextResponse.json({ error: "AI vrátila nečitelná data, zkus jiný/ostřejší snímek." }, { status: 502 });
  }

  // Napárování na skladové karty
  const { data: cards } = supabaseAdmin
    ? await supabaseAdmin.from("stock_items").select("id, name, base_unit").eq("is_active", true)
    : { data: [] };
  const normCards = (cards ?? []).map((c) => ({ id: c.id, name: c.name, base_unit: c.base_unit, tokens: tokenize(c.name) }));

  const out = lines.map((l) => {
    const lt = tokenize(l.name);
    let best: { id: string; name: string; base_unit: string } | null = null;
    let bestScore = 0;
    for (const c of normCards) {
      const score = jaccard(lt, c.tokens);
      if (score > bestScore) { bestScore = score; best = { id: c.id, name: c.name, base_unit: c.base_unit }; }
    }
    const matched = bestScore >= 0.34 ? best : null;
    return { ...l, matched_stock_item_id: matched?.id ?? null, matched_name: matched?.name ?? null, matched_base_unit: matched?.base_unit ?? null };
  });

  return NextResponse.json({ lines: out });
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 2)
  );
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
