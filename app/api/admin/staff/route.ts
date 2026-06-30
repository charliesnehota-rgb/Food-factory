import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

const STAFF_ROLES = ["admin", "staff", "accountant"];

// GET: seznam personálu (uživatelé s rolí admin/staff/účetní)
export async function GET() {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json([]);

  const { data: profiles } = await supabaseAdmin
    .from("user_profiles").select("id, role, created_at").in("role", STAFF_ROLES);

  const out = [];
  for (const p of profiles ?? []) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(p.id);
      out.push({
        id: p.id,
        role: p.role,
        email: data.user?.email ?? "—",
        name: (data.user?.user_metadata?.full_name as string) ?? "",
        created_at: p.created_at,
      });
    } catch {
      out.push({ id: p.id, role: p.role, email: "—", name: "", created_at: p.created_at });
    }
  }
  out.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, "cs"));
  return NextResponse.json(out);
}

// POST: založí personál — auth uživatel + profil s rolí. Vrátí dočasné heslo.
export async function POST(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { email, name, role } = await req.json();
  if (!email || !name) return NextResponse.json({ error: "Vyplň e-mail i jméno." }, { status: 400 });
  if (!STAFF_ROLES.includes(role)) return NextResponse.json({ error: "Neplatná role." }, { status: 400 });

  const tempPassword = randomBytes(9).toString("base64url"); // ~12 znaků

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // může se hned přihlásit dočasným heslem
    user_metadata: { full_name: name },
  });
  if (error || !created.user) {
    return NextResponse.json({ error: error?.message ?? "Uživatele se nepodařilo založit." }, { status: 400 });
  }

  const { error: pErr } = await supabaseAdmin
    .from("user_profiles").upsert({ id: created.user.id, role }, { onConflict: "id" });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json({ id: created.user.id, email, name, role, temp_password: tempPassword }, { status: 201 });
}
