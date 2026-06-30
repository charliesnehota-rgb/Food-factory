import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

const FIELDS = ["name", "ico", "dic", "email", "phone", "address", "note", "is_active"];

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json([]);
  const { data, error } = await supabaseAdmin
    .from("suppliers").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Chybí název dodavatele" }, { status: 400 });

  const row: Record<string, unknown> = {};
  for (const key of FIELDS) if (body[key] !== undefined) row[key] = body[key];

  const { data, error } = await supabaseAdmin.from("suppliers").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
