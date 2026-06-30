import { createSupabaseServer } from "@/lib/auth/server";

// Vrátí roli přihlášeného uživatele (nebo null).
export async function getUserRole(): Promise<{ id: string; role: string | null } | null> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single();
  return { id: user.id, role: profile?.role ?? null };
}

// Vrátí usera pokud má některou z povolených rolí, jinak null.
export async function requireRole(allowed: string[]) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single();

  const role = profile?.role;
  if (!role || !allowed.includes(role)) return null;
  return user;
}

// Provoz a úpravy: jen admin/staff.
export async function requireStaff() {
  return requireRole(["admin", "staff"]);
}

// Účetní exporty (čtení): admin/staff i účetní.
export async function requireExports() {
  return requireRole(["admin", "staff", "accountant"]);
}
