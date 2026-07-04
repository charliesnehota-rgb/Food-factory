// GET /api/marketing/unsubscribe?token=…
// Jednorázový odhlašovací odkaz z patičky kampaní — bez přihlášení.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";

  if (!token || !supabaseAdmin) {
    return NextResponse.redirect(`${site}/odhlaseni?ok=0`);
  }

  const { data } = await supabaseAdmin
    .from("user_profiles")
    .update({ marketing_consent: false })
    .eq("unsubscribe_token", token)
    .select("id");

  const ok = data && data.length > 0 ? "1" : "0";
  return NextResponse.redirect(`${site}/odhlaseni?ok=${ok}`);
}
