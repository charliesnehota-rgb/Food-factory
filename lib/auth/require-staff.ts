import { createSupabaseServer } from "@/lib/auth/server";

// Vrátí usera pokud má roli admin/staff, jinak null.
export async function requireStaff() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single();

  const role = profile?.role;
  if (role !== "admin" && role !== "staff") return null;
  return user;
}
