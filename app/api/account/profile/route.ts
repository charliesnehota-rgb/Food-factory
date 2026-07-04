import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { data } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  return NextResponse.json({ profile: data, email: user.email });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { full_name, phone, address, marketing_consent } = await req.json();
  const patch: Record<string, unknown> = { full_name, phone, address };
  if (typeof marketing_consent === "boolean") {
    patch.marketing_consent = marketing_consent;
    if (marketing_consent) patch.marketing_consent_at = new Date().toISOString();
  }
  const { error } = await supabase.from("user_profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
