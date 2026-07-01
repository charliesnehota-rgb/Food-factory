import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

export async function POST() {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const now = new Date();
  const in3days = new Date(now); in3days.setDate(now.getDate() + 3);
  const ago14 = new Date(now); ago14.setDate(now.getDate() - 14);
  const ago1h = new Date(now); ago1h.setHours(now.getHours() - 1);

  // Paralelní fetch dat
  const [expiryRes, ordersRes, activeRes, productsRes, overridesRes] = await Promise.all([
    supabaseAdmin
      .from("goods_receipt_items")
      .select("stock_item_id, expiry_date, qty, stock_item:stock_items!stock_item_id(name, base_unit, current_qty)")
      .not("expiry_date", "is", null)
      .lte("expiry_date", in3days.toISOString().slice(0, 10))
      .gte("expiry_date", now.toISOString().slice(0, 10)),
    supabaseAdmin
      .from("orders")
      .select("concept_slug, total_czk, created_at")
      .eq("payment_status", "paid")
      .gte("created_at", ago14.toISOString()),
    supabaseAdmin
      .from("orders")
      .select("concept_slug, status, created_at")
      .in("status", ["new", "accepted", "preparing"])
      .gte("created_at", ago1h.toISOString()),
    supabaseAdmin
      .from("products")
      .select("id, name, concept_slug, price_czk")
      .eq("available", true),
    supabaseAdmin
      .from("price_overrides")
      .select("product_id")
      .gte("valid_until", now.toISOString()),
  ]);

  const activeOverrideIds = new Set((overridesRes.data ?? []).map(o => o.product_id));

  const context = {
    current_time: now.toISOString(),
    current_hour: now.getHours(),
    current_day: ["neděle","pondělí","úterý","středa","čtvrtek","pátek","sobota"][now.getDay()],
    expiring_stock: (expiryRes.data ?? []).map(r => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: (r.stock_item as any)?.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current_qty: (r.stock_item as any)?.current_qty,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unit: (r.stock_item as any)?.base_unit,
      expiry_date: r.expiry_date,
      days_left: Math.ceil((new Date(r.expiry_date as string).getTime() - now.getTime()) / 86400000),
    })),
    orders_last_14d_by_hour: buildHourlyProfile(ordersRes.data ?? []),
    active_orders_last_hour: (activeRes.data ?? []).length,
    active_by_concept: (activeRes.data ?? []).reduce((acc: Record<string,number>, o) => {
      acc[o.concept_slug] = (acc[o.concept_slug] ?? 0) + 1; return acc;
    }, {}),
    products: (productsRes.data ?? []).map(p => ({
      id: p.id, name: p.name, concept: p.concept_slug,
      price: Number(p.price_czk),
      has_active_override: activeOverrideIds.has(p.id),
    })),
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY chybí" }, { status: 503 });

  const systemPrompt = `Jsi marketingový manager ghost kitchen Food Factory v Praze. Koncepty:
- sunny-side: "Prostě snídaně" 🍳 (snídaně)
- dumply: "Dumply" 🥟 (asijské dumplings)
- smash: "L.T. Smash" 🍔 (smash burgery)

Dostaneš aktuální data a navrhneš 1–4 marketingové akce. Pravidla:
- EXPIRY: navrhni slevu na produkty kde se používá surovina expirující ≤ 2 dny
- SURGE: pokud active_orders_last_hour > 5, navrhni +10–15% na hlavní produkty daného konceptu
- OFF_PEAK: pokud aktuální hodina je historicky slabá (< průměr), navrhni happy_hour -10–20%
- Nikdy nenavrhuj produkt s has_active_override = true
- reason musí být konkrétní (čísla, data, hodiny)
- Push title max 50 znaků, body max 100 znaků

Odpověz POUZE validním JSON (bez markdownu):
{
  "proposals": [{
    "type": "price_override"|"push_notification"|"happy_hour",
    "trigger_type": "expiry"|"peak"|"off_peak"|"surge"|"manual",
    "concept_slug": "sunny-side"|"dumply"|"smash"|null,
    "title": "string",
    "reason": "string",
    "payload": {
      "product_ids": ["uuid"],
      "discount_pct": -20,
      "valid_hours": 24,
      "push_title": "string",
      "push_body": "string",
      "start_hour": 14,
      "end_hour": 17
    }
  }]
}`;

  let agentText = "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: `Data:\n${JSON.stringify(context, null, 2)}\n\nNavrhni akce.` }],
      }),
    });
    agentText = (await res.json()).content?.[0]?.text ?? "";
  } catch {
    return NextResponse.json({ error: "Chyba AI volání" }, { status: 500 });
  }

  let proposals: AgentProposal[];
  try {
    proposals = JSON.parse(agentText.replace(/```json|```/g, "").trim()).proposals ?? [];
  } catch {
    return NextResponse.json({ error: "AI vrátila neplatný JSON", raw: agentText }, { status: 500 });
  }

  if (!proposals.length) return NextResponse.json({ created: 0, message: "Žádné akce k navržení." });

  const rows = proposals.map(p => {
    const vh = Number(p.payload?.valid_hours ?? 24);
    const vFrom = new Date(now);
    const vUntil = new Date(now); vUntil.setHours(vUntil.getHours() + vh);
    if (p.type === "happy_hour" && p.payload?.start_hour != null) {
      vFrom.setHours(Number(p.payload.start_hour), 0, 0, 0);
      vUntil.setHours(Number(p.payload.end_hour ?? Number(p.payload.start_hour) + 3), 0, 0, 0);
    }
    return {
      type: p.type, status: "pending", trigger_type: p.trigger_type,
      concept_slug: p.concept_slug ?? null,
      title: p.title, reason: p.reason, payload: p.payload ?? {},
      valid_from: vFrom.toISOString(), valid_until: vUntil.toISOString(),
    };
  });

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("marketing_proposals").insert(rows).select("id");
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ created: inserted?.length ?? 0 });
}

function buildHourlyProfile(orders: { created_at: string; concept_slug: string; total_czk: number }[]) {
  const profile: Record<number, number> = {};
  for (let h = 0; h < 24; h++) profile[h] = 0;
  for (const o of orders) profile[new Date(o.created_at).getHours()]++;
  return profile;
}

interface AgentProposal {
  type: string; trigger_type: string; concept_slug: string | null;
  title: string; reason: string;
  payload: Record<string, unknown>;
}
