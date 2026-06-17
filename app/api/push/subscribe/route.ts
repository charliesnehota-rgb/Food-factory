import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/db/supabase";

// POST → uloží subscription, DELETE → smaže
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !supabaseAdmin) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const sub = await req.json(); // { endpoint, keys: { p256dh, auth } }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "Neplatná subscription" }, { status: 400 });
  }

  await supabaseAdmin.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth_key: sub.keys.auth,
  }, { onConflict: "endpoint" });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !supabaseAdmin) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { endpoint } = await req.json();
  if (endpoint) {
    await supabaseAdmin.from("push_subscriptions").delete()
      .eq("endpoint", endpoint).eq("user_id", user.id);
  }
  return NextResponse.json({ ok: true });
}
