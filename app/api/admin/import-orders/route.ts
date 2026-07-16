// POST /api/admin/import-orders — import objednávek z reportů Wolt/Foodora
// (partnerské portály exportují CSV; mapování sloupců dělá klient a sem už
// posílá čisté řádky). Objednávky vznikají zpětně: správný kanál, zaplacené,
// doručené — P&L po kanálech sedí bez ručního přepisování.
//
// Idempotentní: ID = <PLATFORMA>-<externí id>, existující se přeskočí,
// duplicitní řádky v souboru se slijí. Bez notifikací a bez skladu (reporty
// nenesou položky) — sklad pro platformové objednávky vyřeší až middleware.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

interface ImportRow { externalId: string; createdAt: string; totalCzk: number }

const MAX_ROWS = 3000;

export async function POST(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { platform, concept, rows } = await req.json() as { platform: string; concept: string; rows: ImportRow[] };

  if (platform !== "wolt" && platform !== "foodora") {
    return NextResponse.json({ error: "Neplatná platforma." }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Žádné řádky k importu." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Příliš mnoho řádků (max ${MAX_ROWS}) — rozděl soubor.` }, { status: 400 });
  }

  const { data: concepts } = await supabaseAdmin.from("concepts").select("slug");
  if (!concepts?.some(c => c.slug === concept)) {
    return NextResponse.json({ error: "Neplatný koncept." }, { status: 400 });
  }

  // ID: <PLATFORMA>-<externí id> (jen A-Z0-9-, ať je čitelné i stabilní)
  const prefix = platform.toUpperCase();
  const seen = new Set<string>();
  let duplicatesInFile = 0;
  let invalid = 0;
  const candidates: { id: string; createdAt: string; totalCzk: number }[] = [];

  for (const r of rows) {
    const ext = String(r.externalId ?? "").toUpperCase().replace(/[^A-Z0-9-]+/g, "").slice(0, 40);
    const total = Number(r.totalCzk);
    const when = new Date(r.createdAt);
    if (!ext || !Number.isFinite(total) || total < 0 || isNaN(when.getTime())) { invalid++; continue; }
    const id = `${prefix}-${ext}`;
    if (seen.has(id)) { duplicatesInFile++; continue; }
    seen.add(id);
    candidates.push({ id, createdAt: when.toISOString(), totalCzk: Math.round(total * 100) / 100 });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ error: "Ve vybraných sloupcích nejsou platná data (ID / datum / částka)." }, { status: 400 });
  }

  // Existující přeskoč (idempotence — soubor jde bezpečně nahrát znovu)
  const existing = new Set<string>();
  for (let i = 0; i < candidates.length; i += 500) {
    const chunk = candidates.slice(i, i + 500).map(c => c.id);
    const { data } = await supabaseAdmin.from("orders").select("id").in("id", chunk);
    for (const row of data ?? []) existing.add(row.id);
  }
  const toInsert = candidates.filter(c => !existing.has(c.id));

  let imported = 0;
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500);
    const { error, data } = await supabaseAdmin.from("orders").insert(
      chunk.map(c => ({
        id: c.id,
        concept_slug: concept,
        channel: platform,
        fulfilment: "delivery",
        status: "delivered",
        customer_name: platform === "wolt" ? "Wolt" : "foodora",
        payment_status: "paid",
        subtotal_czk: c.totalCzk,
        delivery_fee_czk: 0,
        total_czk: c.totalCzk,
        delivery_provider: platform,
        created_at: c.createdAt,
        note: "import z reportu",
      })),
    ).select("id");
    if (error) {
      return NextResponse.json({
        error: `Import selhal u dávky ${i / 500 + 1}: ${error.message}`,
        imported,
      }, { status: 500 });
    }
    imported += data?.length ?? 0;
  }

  return NextResponse.json({
    imported,
    skippedExisting: existing.size,
    duplicatesInFile,
    invalid,
  });
}
