import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

// GET — nevyřešená systémová upozornění
export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json([]);
  const { data } = await supabaseAdmin
    .from("system_alerts")
    .select("*")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(20);
  return NextResponse.json(data ?? []);
}

// PATCH — označit jako vyřešené
export async function PATCH(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Chybí id." }, { status: 400 });
  await supabaseAdmin.from("system_alerts").update({ resolved: true }).eq("id", id);
  return NextResponse.json({ ok: true });
}
