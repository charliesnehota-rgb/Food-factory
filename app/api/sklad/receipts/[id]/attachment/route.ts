import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

const BUCKET = "receipt-attachments";

// GET — vrátí podepsanou URL pro zobrazení přílohy (platná 60 min)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff()))
    return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin)
    return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;

  const { data: receipt } = await supabaseAdmin
    .from("goods_receipts").select("attachment_path").eq("id", id).single();

  if (!receipt?.attachment_path)
    return NextResponse.json({ error: "Příjemka nemá přílohu" }, { status: 404 });

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(receipt.attachment_path, 3600); // 60 min

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, path: receipt.attachment_path });
}

// POST — nahraje soubor multipart/form-data a uloží cestu na příjemku
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;

  // Příjemka musí existovat
  const { data: receipt } = await supabaseAdmin
    .from("goods_receipts").select("id, attachment_path").eq("id", id).single();
  if (!receipt) return NextResponse.json({ error: "Příjemka nenalezena" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Soubor chybí" }, { status: 400 });

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes)
    return NextResponse.json({ error: "Soubor je příliš velký (max 10 MB)" }, { status: 413 });

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
  if (!allowed.includes(file.type))
    return NextResponse.json({ error: "Nepodporovaný formát (JPEG/PNG/WEBP/HEIC/PDF)" }, { status: 415 });

  // Smažeme starou přílohu, pokud existuje
  if (receipt.attachment_path) {
    await supabaseAdmin.storage.from(BUCKET).remove([receipt.attachment_path]);
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `receipts/${id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { error: dbErr } = await supabaseAdmin
    .from("goods_receipts").update({ attachment_path: path }).eq("id", id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path }, { status: 201 });
}

// DELETE — smaže přílohu
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff()))
    return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin)
    return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;

  const { data: receipt } = await supabaseAdmin
    .from("goods_receipts").select("attachment_path").eq("id", id).single();

  if (receipt?.attachment_path) {
    await supabaseAdmin.storage.from(BUCKET).remove([receipt.attachment_path]);
  }

  await supabaseAdmin.from("goods_receipts").update({ attachment_path: null }).eq("id", id);
  return NextResponse.json({ ok: true });
}
