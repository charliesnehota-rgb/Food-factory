import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

// GET /api/orders/[id]/status — veřejný stav objednávky pro tracker.
// Vrací POUZE stav, žádné osobní údaje (jméno, adresa, telefon).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, status, payment_status, fulfilment, concept_slug, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Objednávka nenalezena" }, { status: 404 });

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
