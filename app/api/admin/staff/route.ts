import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";
import { sendInviteEmail } from "@/lib/notifications";

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

// POST: pozve personál emailem — generuje Supabase invite link, pošle přes Resend.
export async function POST(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { email, name, role } = await req.json();
  if (!email || !name) return NextResponse.json({ error: "Vyplň e-mail i jméno." }, { status: 400 });
  if (!STAFF_ROLES.includes(role)) return NextResponse.json({ error: "Neplatná role." }, { status: 400 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";

  // Vygeneruj Supabase invite link (vytvoří auth uživatele + vrátí action_link)
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: name },
      redirectTo: `${site}/admin/nove-heslo`,
    },
  });
  if (linkErr || !linkData?.user) {
    return NextResponse.json({ error: linkErr?.message ?? "Nepodařilo se vygenerovat pozvánku." }, { status: 400 });
  }

  // Přiřaď roli
  const { error: pErr } = await supabaseAdmin
    .from("user_profiles").upsert({ id: linkData.user.id, role }, { onConflict: "id" });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Pošli email přes Resend
  await sendInviteEmail(email, name, linkData.properties.action_link);

  return NextResponse.json({ id: linkData.user.id, email, name, role, invited: true }, { status: 201 });
}

// DELETE: smaže uživatele z auth i profilů
export async function DELETE(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Chybí id." }, { status: 400 });
  await supabaseAdmin.from("user_profiles").delete().eq("id", id);
  await supabaseAdmin.auth.admin.deleteUser(id);
  return NextResponse.json({ ok: true });
}
