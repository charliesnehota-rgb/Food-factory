import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, concept } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Chybí pole" }, { status: 400 });
    }
    // Ulož pokud tabulka existuje (jinak best-effort)
    if (supabaseAdmin) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from("contact_messages").insert({
        name, email, message, concept_slug: concept ?? null,
      }).then(() => {}, () => {});
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // formulář nikdy "nespadne"
  }
}
