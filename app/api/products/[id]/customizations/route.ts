// GET  /api/products/[id]/customizations — veřejné: dostupné přídavky (?all=1 pro admin i nedostupné)
// POST /api/products/[id]/customizations — jen staff: nový přídavek
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";
import { enqueueChannelSync } from "@/lib/channels";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseAdmin) return NextResponse.json([]);
  const { id } = await params;
  const showAll = req.nextUrl.searchParams.get("all") === "1";

  if (showAll) {
    const staff = await requireStaff();
    if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  }

  let q = supabaseAdmin.from("product_customizations")
    .select("*").eq("product_id", id).order("sort_order").order("created_at");
  if (!showAll) q = q.eq("available", true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Chybí název." }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("product_customizations").insert({
    product_id: id,
    name: String(body.name).trim(),
    name_en: body.name_en ? String(body.name_en).trim() : null,
    price_czk: Math.max(0, Number(body.price_czk) || 0),
    available: body.available !== false,
    sort_order: Number(body.sort_order) || 0,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: prod } = await supabaseAdmin.from("products").select("concept_slug").eq("id", id).single();
  if (prod?.concept_slug) await enqueueChannelSync(prod.concept_slug, "menu_full");
  return NextResponse.json(data, { status: 201 });
}
