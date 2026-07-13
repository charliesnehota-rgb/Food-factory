import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";
import { enqueueChannelSync } from "@/lib/channels";

async function authorize(req: NextRequest): Promise<boolean> {
  const isAI = req.headers.get("x-ai-key") === process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (isAI) return true;
  return !!(await requireStaff());
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  // Povolené pole pro update
  const allowed: Record<string, unknown> = {};
  for (const key of ["name", "description", "price_czk", "category", "tags", "available", "sort_order", "image_url", "allergens", "name_en", "description_en", "category_en"]) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Žádná pole k aktualizaci" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("products")
    .update(allowed).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Channel sync: cena/dostupnost jde rychlou cestou, strukturální změny celým menu
  if (data?.concept_slug) {
    const structural = ["name", "description", "image_url", "category", "allergens", "tags"]
      .some(k => k in allowed);
    if (structural) {
      await enqueueChannelSync(data.concept_slug, "menu_full");
    } else {
      if ("price_czk" in allowed) await enqueueChannelSync(data.concept_slug, "item_update", { productIds: [id] });
      if ("available" in allowed) await enqueueChannelSync(data.concept_slug, "inventory", { productIds: [id] });
    }
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const { data: prod } = await supabaseAdmin.from("products").select("concept_slug").eq("id", id).single();
  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (prod?.concept_slug) await enqueueChannelSync(prod.concept_slug, "menu_full");
  return NextResponse.json({ ok: true });
}
