import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json([]);
  const { data, error } = await supabaseAdmin
    .from("stock_categories").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { name, vat_rate, sort_order } = await req.json();
  if (!name) return NextResponse.json({ error: "Chybí název" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("stock_categories").insert({
    name,
    vat_rate: vat_rate ?? 12,
    sort_order: sort_order ?? 99,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
