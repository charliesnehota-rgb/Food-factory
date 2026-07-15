import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";
import { applyMarginCurve, type MarginCurve } from "@/lib/pricing";
import { enqueueChannelSync } from "@/lib/channels";

// GET — veřejné (menu pro zákazníky i admin)
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json([]);
  const concept = req.nextUrl.searchParams.get("concept");
  const showAll = req.nextUrl.searchParams.get("all") === "1"; // admin vidí i nedostupné

  let q = supabaseAdmin.from("products").select("*").order("sort_order");
  if (concept) q = q.eq("concept_slug", concept);
  if (!showAll) q = q.eq("available", true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aplikuj aktivní price_overrides (slevy/přirážky z marketing agenta), pak
  // cenotvorbu (hodinová marže per koncept) na vše, co override nemá.
  const products = data ?? [];
  if (products.length > 0) {
    const nowIso = new Date().toISOString();
    const [{ data: overrides }, curveResult] = await Promise.all([
      supabaseAdmin
        .from("price_overrides")
        .select("product_id, override_czk, reason")
        .in("product_id", products.map(p => p.id))
        .lte("valid_from", nowIso)
        .gte("valid_until", nowIso),
      supabaseAdmin.from("concept_settings").select("concept_slug, margin_curve"),
    ]);

    const ovrMap = new Map((overrides ?? []).map(o => [o.product_id, o]));
    // curveResult.error → sloupec margin_curve ještě nemusí existovat (migrace
    // se aplikuje ručně); chovej se jako by křivka nebyla nastavená (0 %).
    const curveRows = !curveResult.error && curveResult.data ? curveResult.data : [];
    const curveMap = new Map(
      curveRows.map((r: { concept_slug: string; margin_curve: MarginCurve }) => [r.concept_slug, r.margin_curve])
    );

    for (const p of products) {
      const ovr = ovrMap.get(p.id);
      if (ovr) {
        p.original_price_czk = p.price_czk;   // původní cena (pro přeškrtnutí v UI)
        p.price_czk = Number(ovr.override_czk);
        p.price_override_reason = ovr.reason; // např. "Happy hour 14–17"
        continue;
      }
      const curved = applyMarginCurve(Number(p.price_czk), curveMap.get(p.concept_slug));
      if (curved !== Number(p.price_czk)) {
        p.original_price_czk = p.price_czk;
        p.price_czk = curved;
      }
    }
  }

  return NextResponse.json(products);
}

// POST — jen staff/admin (a AI přes service_role)
export async function POST(req: NextRequest) {
  // AI volá s x-ai-key headerem (ověří se přes service role), staff přes session
  const isAI = req.headers.get("x-ai-key") === process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isAI) {
    const staff = await requireStaff();
    if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  }
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json();
  const { concept_slug, name, description, price_czk, category, tags, available, sort_order, allergens, name_en, description_en, category_en } = body;

  if (!concept_slug || !name || price_czk == null) {
    return NextResponse.json({ error: "Chybí povinná pole: concept_slug, name, price_czk" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("products").insert({
    concept_slug, name,
    description: description ?? "",
    price_czk, category: category ?? "Jídlo",
    tags: tags ?? [], available: available ?? true,
    allergens: Array.isArray(allergens) ? allergens.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 14) : [],
    sort_order: sort_order ?? 99,
    name_en: name_en?.trim() || null,
    description_en: description_en?.trim() || null,
    category_en: category_en?.trim() || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data?.concept_slug) await enqueueChannelSync(data.concept_slug, "menu_full");
  return NextResponse.json(data, { status: 201 });
}
