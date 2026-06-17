import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

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
  return NextResponse.json(data ?? []);
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
  const { concept_slug, name, description, price_czk, category, tags, available, sort_order } = body;

  if (!concept_slug || !name || price_czk == null) {
    return NextResponse.json({ error: "Chybí povinná pole: concept_slug, name, price_czk" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("products").insert({
    concept_slug, name,
    description: description ?? "",
    price_czk, category: category ?? "Jídlo",
    tags: tags ?? [], available: available ?? true,
    sort_order: sort_order ?? 99,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
