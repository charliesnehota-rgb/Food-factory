// GET /api/orders — JEN pracovník: všechny objednávky (?concept=slug filtr)
// POST /api/orders — vytvoří objednávku přihlášeného zákazníka
import { NextRequest, NextResponse } from "next/server";
import { fetchOrders } from "@/lib/db/orders";
import { supabaseAdmin } from "@/lib/db/supabase";
import { createSupabaseServer } from "@/lib/auth/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { sendOrderConfirmationEmail } from "@/lib/notifications";
import { getBrand } from "@/lib/brand/registry";

// Kód objednávky podle značky: "L.T. Smash" → "L_T_SMASH-123456", "Dumply" → "DUMPLY-123456"
function makeOrderId(conceptSlug: string): string {
  const name = getBrand(conceptSlug)?.name ?? conceptSlug;
  const code = name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // odstraň diakritiku
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")                       // nealfanumerické → _
    .replace(/^_+|_+$/g, "")                           // ořež _ na krajích
    || "ORDER";
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${code}-${num}`;
}

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

    // ── SERVER-SIDE CENY ──
    // Nikdy nevěř cenám z klienta. Načti aktuální ceny z DB + aplikuj aktivní price_overrides.
    const productIds = items
      .map((i: { productId?: string }) => i.productId)
      .filter(Boolean) as string[];

    if (productIds.length === 0) {
      return NextResponse.json({ error: "Položky bez productId." }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const [prodRes, ovrRes] = await Promise.all([
      supabaseAdmin.from("products")
        .select("id, name, price_czk, available, concept_slug")
        .in("id", productIds),
      supabaseAdmin.from("price_overrides")
        .select("product_id, override_czk")
        .in("product_id", productIds)
        .lte("valid_from", nowIso)
        .gte("valid_until", nowIso),
    ]);

    const productMap = new Map((prodRes.data ?? []).map(p => [p.id, p]));
    const overrideMap = new Map((ovrRes.data ?? []).map(o => [o.product_id, Number(o.override_czk)]));

    // Validace: všechny položky existují, jsou dostupné a patří ke konceptu
    const priced: { productId: string; name: string; qty: number; unitPriceCzk: number; note?: string }[] = [];
    for (const i of items as { productId: string; qty: number; note?: string }[]) {
      const p = productMap.get(i.productId);
      if (!p) return NextResponse.json({ error: `Produkt ${i.productId} neexistuje.` }, { status: 400 });
      if (!p.available) return NextResponse.json({ error: `Produkt „${p.name}" není dostupný.` }, { status: 400 });
      if (p.concept_slug !== conceptSlug) return NextResponse.json({ error: `Produkt „${p.name}" nepatří do tohoto konceptu.` }, { status: 400 });
      const qty = Math.max(1, Math.min(50, Math.round(Number(i.qty) || 1)));
      const unit = overrideMap.get(i.productId) ?? Number(p.price_czk);
      priced.push({ productId: i.productId, name: p.name, qty, unitPriceCzk: unit, note: i.note });
    }

    const subtotal = priced.reduce((s, i) => s + i.unitPriceCzk * i.qty, 0);
    const deliveryFee = fulfilment === "delivery" ? 59 : 0;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        id: makeOrderId(conceptSlug),
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
      priced.map((i) => ({
        order_id: order.id, product_id: i.productId,
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
