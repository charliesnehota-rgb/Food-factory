import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

export async function POST(req: NextRequest) {
  // Všechny akce mění data nebo volají placené AI — jen pro adminy.
  if (!(await requireRole(["admin"]))) {
    return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { action, ...payload } = await req.json();

  // ── Cenové balancování (vyžaduje AI) ──
  if (action === "balance_prices" && supabaseAdmin && apiKey) {
    const since = new Date(Date.now() - 30 * 60000).toISOString();
    const { data: recentOrders } = await supabaseAdmin
      .from("orders").select("concept_slug")
      .in("status", ["new","accepted","preparing"])
      .gte("created_at", since);

    const load: Record<string, number> = {};
    for (const o of (recentOrders ?? []) as { concept_slug: string }[]) {
      load[o.concept_slug] = (load[o.concept_slug] ?? 0) + 1;
    }

    const { data: products } = await supabaseAdmin.from("products")
      .select("id, concept_slug, name, price_czk").eq("available", true);

    const aiPrompt = `Jsi AI koordinátor multi-concept restaurace Free City.
Aktuální zatížení konceptů za posledních 30 min: ${JSON.stringify(load)}.
Dostupné produkty: ${JSON.stringify((products ?? []).map(p => ({ id: p.id, concept: p.concept_slug, name: p.name, price: p.price_czk })))}

Navrhni cenové úpravy pro vyrovnání zatížení (max ±30 Kč na produkt).
Odpověz POUZE jako JSON pole: [{"productId":"...","newPriceCzk":...,"reason":"..."}]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, messages: [{ role: "user", content: aiPrompt }] }),
    });
    const aiData = await response.json();
    const text = aiData.content?.[0]?.text ?? "[]";
    let adjustments: { productId: string; newPriceCzk: number; reason: string }[] = [];
    try { adjustments = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]"); } catch { adjustments = []; }

    // Aplikuj úpravy
    for (const adj of adjustments) {
      if (adj.productId && adj.newPriceCzk > 0) {
        await supabaseAdmin.from("products").update({ price_czk: adj.newPriceCzk }).eq("id", adj.productId);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("ai_logs").insert({ type: "price_adjustment", payload: { load, adjustments } });
    return NextResponse.json({ adjustments, applied: true });
  }

  // ── Úprava produktu (AI i admin) ──
  if (action === "update_product" && supabaseAdmin) {
    const { productId, ...fields } = payload;
    if (!productId) return NextResponse.json({ error: "Chybí productId" }, { status: 400 });
    const allowed: Record<string, unknown> = {};
    for (const key of ["name", "description", "price_czk", "category", "tags", "available", "sort_order", "image_url"]) {
      if (fields[key] !== undefined) allowed[key] = fields[key];
    }
    const { data, error } = await supabaseAdmin.from("products").update(allowed).eq("id", productId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ── Toggle dostupnosti (AI i admin) ──
  if (action === "toggle_availability" && supabaseAdmin) {
    const { productId, available } = payload;
    if (!productId) return NextResponse.json({ error: "Chybí productId" }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("products")
      .update({ available: available ?? false }).eq("id", productId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ── Marketing asistent ──
  if (action === "generate_post" && apiKey) {
    const { conceptSlug, prompt } = payload;
    const userPrompt = prompt ?? `Napiš krátký Instagram post (max 150 znaků) pro restauraci ${conceptSlug ?? "Free City"}.`;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: userPrompt }] }),
    });
    const aiData = await response.json();
    const text = aiData.content?.[0]?.text ?? "";
    if (supabaseAdmin) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from("ai_logs").insert({ type: "marketing_post", payload: { conceptSlug, result: text } });
    }
    return NextResponse.json({ post: text });
  }

  return NextResponse.json({ error: "Neznámá akce. Dostupné: balance_prices, update_product, toggle_availability, generate_post" }, { status: 400 });
}
