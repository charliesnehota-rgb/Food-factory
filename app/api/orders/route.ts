// GET /api/orders — JEN pracovník: všechny objednávky (?concept=slug filtr)
// POST /api/orders — vytvoří objednávku přihlášeného zákazníka
import { NextRequest, NextResponse } from "next/server";
import { fetchOrders } from "@/lib/db/orders";
import { supabaseAdmin } from "@/lib/db/supabase";
import { isOpenNow, nextOpenText, type WeekHours } from "@/lib/opening-hours";
import { getUserFromRequest } from "@/lib/auth/server";
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

  // Uživatel z Bearer tokenu (mobilní appka) nebo cookies (web).
  // Objednat může i host bez registrace — přihlášení není povinné.
  const user = await getUserFromRequest(req);

  try {
    const body = await req.json();
    const { conceptSlug, channel, fulfilment, items, customer, note, marketing_opt_in } = body;

    if (!conceptSlug || !channel || !fulfilment || !items?.length || !customer?.name) {
      return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
    }

    // ── OCHRANA PROTI SPAMU ──
    // Honeypot: skryté pole "website" vyplňují jen boti
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
    }

    // E-mail pro potvrzení a notifikace: přihlášený z účtu, host ze zadání
    const customerEmail = (user?.email ?? customer?.email ?? "").trim() || null;
    if (!user && !customerEmail) {
      return NextResponse.json({ error: "Zadej e-mail pro potvrzení objednávky." }, { status: 400 });
    }

    // Throttle: max 5 objednávek z jednoho e-mailu za 15 minut
    if (customerEmail) {
      const ago15 = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("customer_email", customerEmail)
        .gte("created_at", ago15);
      if ((count ?? 0) >= 5) {
        return NextResponse.json({ error: "Příliš mnoho objednávek za krátkou dobu. Zkus to prosím za chvíli." }, { status: 429 });
      }
    }

    // ── PROVOZNÍ DOBA ──
    // Objednávky z webu i appky mimo otevírací dobu blokujeme (KDS by je nikdo neviděl).
    if (channel === "web" || channel === "app") {
      const { data: settings } = await supabaseAdmin
        .from("concept_settings").select("hours").eq("concept_slug", conceptSlug).single();
      const hours = (settings?.hours ?? null) as WeekHours | null;
      if (hours && !isOpenNow(hours)) {
        const next = nextOpenText(hours);
        return NextResponse.json({
          error: `Máme zavřeno${next ? ` — otevíráme ${next}` : ""}. Objednávku zatím nejde odeslat.`,
        }, { status: 400 });
      }
    }

    // ── SERVER-SIDE CENY ──
    // Nikdy nevěř cenám z klienta. Načti aktuální ceny z DB + aplikuj aktivní price_overrides.
    const productIds = items
      .map((i: { productId?: string }) => i.productId)
      .filter(Boolean) as string[];

    if (productIds.length === 0) {
      return NextResponse.json({ error: "Položky bez productId." }, { status: 400 });
    }

    // Customizace: ceny také jen z DB (klientovi nevěříme ani u přídavků)
    const custIds = [...new Set(
      items.flatMap((i: { customizations?: { id?: string }[] }) =>
        (i.customizations ?? []).map(c => c.id).filter(Boolean)) as string[]
    )];

    const nowIso = new Date().toISOString();
    const [prodRes, ovrRes, custRes] = await Promise.all([
      supabaseAdmin.from("products")
        .select("id, name, price_czk, available, concept_slug")
        .in("id", productIds),
      supabaseAdmin.from("price_overrides")
        .select("product_id, override_czk")
        .in("product_id", productIds)
        .lte("valid_from", nowIso)
        .gte("valid_until", nowIso),
      custIds.length > 0
        ? supabaseAdmin.from("product_customizations")
            .select("id, product_id, name, price_czk, available")
            .in("id", custIds)
        : Promise.resolve({ data: [] as { id: string; product_id: string; name: string; price_czk: number; available: boolean }[] }),
    ]);

    const productMap = new Map((prodRes.data ?? []).map(p => [p.id, p]));
    const overrideMap = new Map((ovrRes.data ?? []).map(o => [o.product_id, Number(o.override_czk)]));
    const custMap = new Map((custRes.data ?? []).map(c => [c.id, c]));

    // Validace: všechny položky existují, jsou dostupné a patří ke konceptu
    type PricedCust = { customizationId: string; name: string; unitPriceCzk: number; qty: number };
    const priced: { productId: string; name: string; qty: number; unitPriceCzk: number; note?: string; customizations: PricedCust[] }[] = [];
    for (const i of items as { productId: string; qty: number; note?: string; customizations?: { id: string }[] }[]) {
      const p = productMap.get(i.productId);
      if (!p) return NextResponse.json({ error: `Produkt ${i.productId} neexistuje.` }, { status: 400 });
      if (!p.available) return NextResponse.json({ error: `Produkt „${p.name}" není dostupný.` }, { status: 400 });
      if (p.concept_slug !== conceptSlug) return NextResponse.json({ error: `Produkt „${p.name}" nepatří do tohoto konceptu.` }, { status: 400 });
      const qty = Math.max(1, Math.min(50, Math.round(Number(i.qty) || 1)));

      // Validace + ocenění přídavků (musí patřit k produktu a být dostupné)
      const lineCusts: PricedCust[] = [];
      for (const c of i.customizations ?? []) {
        const dbCust = custMap.get(c.id);
        if (!dbCust) return NextResponse.json({ error: `Přídavek ${c.id} neexistuje.` }, { status: 400 });
        if (dbCust.product_id !== i.productId) return NextResponse.json({ error: `Přídavek „${dbCust.name}" nepatří k produktu „${p.name}".` }, { status: 400 });
        if (!dbCust.available) return NextResponse.json({ error: `Přídavek „${dbCust.name}" není dostupný.` }, { status: 400 });
        lineCusts.push({ customizationId: dbCust.id, name: dbCust.name, unitPriceCzk: Number(dbCust.price_czk), qty: 1 });
      }

      const base = overrideMap.get(i.productId) ?? Number(p.price_czk);
      const unit = base + lineCusts.reduce((s, c) => s + c.unitPriceCzk * c.qty, 0);

      // Poznámka pro kuchyň: přídavky + poznámka zákazníka v jednom textu,
      // aby je KDS, admin i order tracker zobrazily beze změny kódu.
      const custText = lineCusts.map(c => `+ ${c.name}`).join(", ");
      const noteText = [custText, i.note?.trim()].filter(Boolean).join(" · ") || undefined;

      priced.push({ productId: i.productId, name: p.name, qty, unitPriceCzk: unit, note: noteText, customizations: lineCusts });
    }

    const subtotal = priced.reduce((s, i) => s + i.unitPriceCzk * i.qty, 0);
    const deliveryFee = fulfilment === "delivery" ? 59 : 0;

    // Insert s retry na kolizi ID (unique violation 23505)
    let order = null;
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabaseAdmin
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
      if (data) { order = data; break; }
      lastError = error;
      if (error?.code !== "23505") break; // jiná chyba než duplicitní ID — nezkoušej znovu
    }

    if (!order) {
      return NextResponse.json({ error: lastError?.message ?? "Insert failed" }, { status: 500 });
    }

    // E-mail hosta ulož zvlášť (best-effort — funguje i než přibude sloupec)
    if (customerEmail) {
      try { await supabaseAdmin.from("orders").update({ customer_email: customerEmail }).eq("id", order.id); }
      catch { /* sloupec customer_email zatím nemusí existovat */ }
    }

    // Opt-in novinek z checkoutu (GDPR souhlas zaškrtnutím, best-effort)
    if (marketing_opt_in === true && customerEmail) {
      try {
        if (user) {
          // Přihlášený zákazník → souhlas na profilu
          await supabaseAdmin.from("user_profiles").update({
            marketing_consent: true,
            marketing_consent_at: new Date().toISOString(),
          }).eq("id", user.id).eq("marketing_consent", false);
        } else {
          // Host → tabulka odběratelů (re-subscribe obnoví souhlas)
          await supabaseAdmin.from("marketing_subscribers").upsert({
            email: customerEmail.toLowerCase(),
            name: customer?.name?.trim() || null,
            source: "checkout",
            marketing_consent: true,
            unsubscribed_at: null,
          }, { onConflict: "email" });
        }
      } catch { /* marketing nesmí shodit objednávku */ }
    }

    const { data: insertedItems } = await supabaseAdmin.from("order_items").insert(
      priced.map((i) => ({
        order_id: order.id, product_id: i.productId,
        name: i.name, qty: i.qty, unit_price_czk: i.unitPriceCzk, note: i.note,
      }))
    ).select("id");

    // Ulož vybrané přídavky ke každé položce (strukturovaně pro reporting/P&L)
    if (insertedItems && insertedItems.length === priced.length) {
      const custRows = priced.flatMap((i, idx) =>
        i.customizations.map(c => ({
          order_item_id: insertedItems[idx].id,
          customization_id: c.customizationId,
          name: c.name,
          unit_price_czk: c.unitPriceCzk,
          qty: c.qty,
        }))
      );
      if (custRows.length > 0) {
        try { await supabaseAdmin.from("order_item_customizations").insert(custRows); }
        catch { /* best-effort — poznámka v order_items nese info i tak */ }
      }
    }

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
