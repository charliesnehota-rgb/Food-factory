import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anon);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let supabase: SupabaseClient<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let supabaseAdmin: SupabaseClient<any> | null = null;

if (isSupabaseConfigured) {
  supabase = createClient(url, anon);
  supabaseAdmin = createClient(url, svc || anon, { auth: { persistSession: false } });
}
