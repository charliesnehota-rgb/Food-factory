import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

const STAFF_ROLES = ["admin", "staff", "accountant"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  if (body.role !== undefined) {
    if (!STAFF_ROLES.includes(body.role)) return NextResponse.json({ error: "Neplatná role." }, { status: 400 });
    const { error } = await supabaseAdmin.from("user_profiles").upsert({ id, role: body.role }, { onConflict: "id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (body.name !== undefined) {
    try { await supabaseAdmin.auth.admin.updateUserById(id, { user_metadata: { full_name: body.name } }); }
    catch { /* jméno se nezměnilo, role ano */ }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole(["admin"]);
  if (!me) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;
  if (id === me.id) return NextResponse.json({ error: "Nemůžeš smazat vlastní účet." }, { status: 400 });

  // Smaže přihlašovací identitu z auth.users — profil zmizí kaskádou.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
