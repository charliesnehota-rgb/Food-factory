// GET /api/orders — JEN pracovník: všechny objednávky (?concept=slug filtr)
// POST /api/orders — vytvoří objednávku přihlášeného zákazníka
import { NextRequest, NextResponse } from "next/server";
import { fetchOrders } from "@/lib/db/orders";
import { supabaseAdmin } from "@/lib/db/supabase";
import { createSupabaseServer } from "@/lib/auth/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { sendOrderConfirmationEmail } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  // Seznam všech objednávek je jen pro pracovníky
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });

  const concept = req.nextUrl.searchParams.get("concept") ?? undefined;
  const orders = await fetchOrders(concept);
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  // Objednat může i host bez registrace — přihlášení není povinné.

  try {
    const body = await req.json();
    const { conceptSlug, channel, fulfilment, items, customer, note } = body;

    if (!conceptSlug || !channel || !fulfilment || !items?.length || !customer?.name) {
      return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
    }

    // E-mail pro potvrzení a notifikace: přihlášený z účtu, host ze zadání
    const customerEmail = (user?.email ?? customer?.email ?? "").trim() || null;
    if (!user && !customerEmail) {
      return NextResponse.json({ error: "Zadej e-mail pro potvrzení objednávky." }, { status: 400 });
    }

    const subtotal = items.reduce((s: number, i: { unitPriceCzk: number; qty: number }) => s + i.unitPriceCzk * i.qty, 0);
    const deliveryFee = fulfilment === "delivery" ? 59 : 0;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        concept_slug: conceptSlug, channel, fulfilment,
        customer_name: customer.name, customer_phone: customer.phone,
        customer_address: customer.address,
        subtotal_czk: subtotal, delivery_fee_czk: deliveryFee,
        total_czk: subtotal + deliveryFee,
        payment_status: "pending", note,
      })
      .select()
      .single();

    if (error || !order) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    }

    // E-mail hosta ulož zvlášť (best-effort — funguje i než přibude sloupec)
    if (customerEmail) {
      try { await supabaseAdmin.from("orders").update({ customer_email: customerEmail }).eq("id", order.id); }
      catch { /* sloupec customer_email zatím nemusí existovat */ }
    }

    await supabaseAdmin.from("order_items").insert(
      items.map((i: { productId: string; name: string; qty: number; unitPriceCzk: number; note?: string }) => ({
        order_id: order.id, product_id: i.productId || null,
        name: i.name, qty: i.qty, unit_price_czk: i.unitPriceCzk, note: i.note,
      }))
    );

    // Potvrzení o přijetí objednávky — await, jinak serverless funkci zmrazí dřív než se odešle
    if (customerEmail) {
      try { await sendOrderConfirmationEmail(customerEmail, customer.name, order.id, Number(order.total_czk)); }
      catch { /* best-effort */ }
    }

    return NextResponse.json({ orderId: order.id, total: order.total_czk }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
