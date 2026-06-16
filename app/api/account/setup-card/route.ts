import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createSupabaseServer } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function POST() {
  if (!stripe || !supabaseAdmin) {
    return NextResponse.json({ error: "Platby nejsou nakonfigurovány" }, { status: 503 });
  }
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  // Najdi/vytvoř Stripe customer
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("stripe_customer_id, full_name").eq("id", user.id).single();
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email, name: profile?.full_name ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabaseAdmin.from("user_profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";
  // Checkout v setup módu = uloží kartu bez stržení peněz
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    success_url: `${origin}/ucet/profil?card=added`,
    cancel_url: `${origin}/ucet/profil`,
  });

  return NextResponse.json({ url: session.url });
}
