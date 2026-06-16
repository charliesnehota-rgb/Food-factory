import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/auth/server";

export async function POST() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
