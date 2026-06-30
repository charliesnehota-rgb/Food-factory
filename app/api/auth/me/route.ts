import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/auth/server";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ email: null, role: null });
  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single();
  return NextResponse.json({ email: user.email ?? null, role: profile?.role ?? null });
}
