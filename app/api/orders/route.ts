// GET /api/orders — JEN pracovník: všechny objednávky (?concept=slug filtr)
// POST /api/orders — vytvoří objednávku přihlášeného zákazníka
import { NextRequest, NextResponse } from "next/server";
import { cancelStaleUnpaidOrders, fetchOrders } from "@/lib/db/orders";
import { supabaseAdmin } from "@/lib/db/supabase";
import { isOpenNow, nextOpenText, type WeekHours } from "@/lib/opening-hours";
import { applyMarginCurve, type MarginCurve } from "@/lib/pricing";
import { geocodeAddress } from "@/lib/geo";
import { getUserFromRequest } from "@/lib/auth/server";
import { requireStaff, requireRole } from "@/lib/auth/require-staff";
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

// Průběžný úklid opuštěných checkoutů — jede na vlně pollingu KDS/adminu,
// throttlovaný na jednou za minutu na instanci (denní cron je pojistka).
let lastSweepAt = 0;

export async function GET(req: NextRequest) {
  // Seznam všech objednávek je jen pro pracovníky
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });

  if (Date.now() - lastSweepAt > 60_000) {
    lastSweepAt = Date.now();
    await cancelStaleUnpaidOrders();
  }

  const concept = req.nextUrl.searchParams.get("concept") ?? undefined;
  const hours = Number(req.nextUrl.searchParams.get("hours")) || undefined;
  const orders = await fetchOrders(concept, hours);
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

    // conceptSlug je volitelný: appka posílá jeden společný košík napříč koncepty
    // a server ho podle produktů rozdělí na objednávky pro jednotlivé kuchyně.
    // Web dál posílá jeden koncept a chová se beze změny.
    if (!channel || !fulfilment || !items?.length || !customer?.name) {
      return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
    }

    // Kanály: web/app objednává veřejnost, pos smí jen personál od pultu
    // (jinak by šlo z internetu vkládat objednávky, kterým KDS věří jako
    // zaplaceným). Wolt/Foodora vznikají výhradně jejich integrací.
    if (!["web", "app", "pos"].includes(channel)) {
      return NextResponse.json({ error: "Neplatný kanál." }, { status: 400 });
    }
    const isPos = channel === "pos";
    if (isPos && !(await requireRole(["admin", "staff"]))) {
      return NextResponse.json({ error: "Pokladna je jen pro personál." }, { status: 403 });
    }
    // Pultovní objednávka vzniká rovnou zaplacená: hotově / kartou na terminálu
    const posPayment = isPos ? (body.payment === "card_terminal" ? "card_terminal" : "cash") : null;

    // ── OCHRANA PROTI SPAMU ──
    // Honeypot: skryté pole "website" vyplňují jen boti
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
    }

    // E-mail pro potvrzení a notifikace: přihlášený z účtu, host ze zadání
    const customerEmail = (user?.email ?? customer?.email ?? "").trim() || null;
    if (!user && !customerEmail && !isPos) {
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
    const [prodRes, ovrRes, custRes, curveRes] = await Promise.all([
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
      supabaseAdmin.from("concept_settings").select("concept_slug, margin_curve"),
    ]);

    const productMap = new Map((prodRes.data ?? []).map(p => [p.id, p]));
    const overrideMap = new Map((ovrRes.data ?? []).map(o => [o.product_id, Number(o.override_czk)]));
    const custMap = new Map((custRes.data ?? []).map(c => [c.id, c]));
    // curveRes.error → sloupec margin_curve ještě nemusí existovat (migrace se
    // aplikuje ručně); v tom případě se ceny chovají jako dřív (0 % — beze změny).
    const curveRows = !curveRes.error && curveRes.data ? curveRes.data : [];
    const curveMap = new Map(
      (curveRows as { concept_slug: string; margin_curve: MarginCurve }[]).map(r => [r.concept_slug, r.margin_curve])
    );

    // Validace: všechny položky existují, jsou dostupné a patří ke konceptu
    type PricedCust = { customizationId: string; name: string; unitPriceCzk: number; qty: number };
    const priced: { productId: string; conceptSlug: string; name: string; qty: number; unitPriceCzk: number; note?: string; customizations: PricedCust[] }[] = [];
    for (const i of items as { productId: string; qty: number; note?: string; customizations?: { id: string }[] }[]) {
      const p = productMap.get(i.productId);
      if (!p) return NextResponse.json({ error: `Produkt ${i.productId} neexistuje.` }, { status: 400 });
      if (!p.available) return NextResponse.json({ error: `Produkt „${p.name}" není dostupný.` }, { status: 400 });
      if (conceptSlug && p.concept_slug !== conceptSlug) return NextResponse.json({ error: `Produkt „${p.name}" nepatří do tohoto konceptu.` }, { status: 400 });
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

      const base = overrideMap.get(i.productId) ?? applyMarginCurve(Number(p.price_czk), curveMap.get(p.concept_slug));
      const unit = base + lineCusts.reduce((s, c) => s + c.unitPriceCzk * c.qty, 0);

      // Poznámka pro kuchyň: přídavky + poznámka zákazníka v jednom textu,
      // aby je KDS, admin i order tracker zobrazily beze změny kódu.
      const custText = lineCusts.map(c => `+ ${c.name}`).join(", ");
      const noteText = [custText, i.note?.trim()].filter(Boolean).join(" · ") || undefined;

      priced.push({ productId: i.productId, conceptSlug: p.concept_slug, name: p.name, qty, unitPriceCzk: unit, note: noteText, customizations: lineCusts });
    }

    // ── PROVOZNÍ DOBA ──
    // Mimo otevírací dobu neobjednáváme (KDS by objednávku nikdo neviděl).
    // Kontroluje se každý koncept v košíku zvlášť — appka jich pošle i víc.
    const concepts = [...new Set(priced.map((i) => i.conceptSlug))];
    if (channel === "web" || channel === "app") {
      const { data: settings } = await supabaseAdmin
        .from("concept_settings").select("concept_slug, hours").in("concept_slug", concepts);
      for (const s of settings ?? []) {
        const hours = (s.hours ?? null) as WeekHours | null;
        if (hours && !isOpenNow(hours)) {
          const next = nextOpenText(hours);
          return NextResponse.json({
            error: `Máme zavřeno${next ? ` — otevíráme ${next}` : ""}. Objednávku zatím nejde odeslat.`,
          }, { status: 400 });
        }
      }
    }

    // ── ROZDĚLENÍ PODLE KUCHYNÍ ──
    // Jedna objednávka = jeden koncept (tak ji vidí KDS, admin i P&L). Společný
    // košík se proto rozpadne na víc objednávek, ale doručení se účtuje jen
    // jednou — vaří se pod jednou střechou a jede jedna cesta.
    const created: { id: string; total: number }[] = [];
    let deliveryLeft = fulfilment === "delivery" ? 59 : 0;

    for (const concept of concepts) {
      const group = priced.filter((i) => i.conceptSlug === concept);
      const subtotal = group.reduce((s, i) => s + i.unitPriceCzk * i.qty, 0);
      const deliveryFee = deliveryLeft;
      deliveryLeft = 0;

      // Insert s retry na kolizi ID (unique violation 23505)
      let order = null;
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .insert({
            id: makeOrderId(concept),
            user_id: isPos ? null : (user?.id ?? null),
            concept_slug: concept, channel, fulfilment,
            customer_name: customer.name, customer_phone: customer.phone,
            customer_address: customer.address,
            subtotal_czk: subtotal, delivery_fee_czk: deliveryFee,
            total_czk: subtotal + deliveryFee,
            payment_status: isPos ? "paid" : "pending",
            ...(isPos ? { payment_provider: posPayment, status: "accepted" } : {}),
            note,
          })
          .select()
          .single();
        if (data) { order = data; break; }
        lastError = error;
        if (error?.code !== "23505") break; // jiná chyba než duplicitní ID — nezkoušej znovu
      }

      if (!order) {
        let msg = lastError?.message ?? "Insert failed";
        if (isPos && msg.includes("payment_provider")) msg += " (běžela migrace migration_pos.sql?)";
        return NextResponse.json({ error: msg }, { status: 500 });
      }

      // E-mail hosta ulož zvlášť (best-effort — funguje i než přibude sloupec)
      if (customerEmail) {
        try { await supabaseAdmin.from("orders").update({ customer_email: customerEmail }).eq("id", order.id); }
        catch { /* sloupec customer_email zatím nemusí existovat */ }
      }

      const { data: insertedItems } = await supabaseAdmin.from("order_items").insert(
        group.map((i) => ({
          order_id: order.id, product_id: i.productId,
          name: i.name, qty: i.qty, unit_price_czk: i.unitPriceCzk, note: i.note,
        }))
      ).select("id");

      // Ulož vybrané přídavky ke každé položce (strukturovaně pro reporting/P&L)
      if (insertedItems && insertedItems.length === group.length) {
        const custRows = group.flatMap((i, idx) =>
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

      created.push({ id: order.id, total: Number(order.total_czk) });
    }

    // Geokódování doručovací adresy (best-effort) — jedna adresa pro celou
    // skupinu, takže jeden dotaz a update všech objednávek naráz. Slouží
    // kurýrnímu rozvozu (čtvrť, seskupování, pořadí zastávek). Selhání nebo
    // chybějící sloupce (migration_delivery_geo.sql) objednávku nikdy neshodí.
    // Když adresa přišla z našeptávače (customer.lat/lng z výběru), použije se
    // přesná poloha rovnou a Nominatim se přeskočí — je přesnější i rychlejší.
    if (fulfilment === "delivery" && created.length > 0) {
      try {
        const pickedLat = Number(customer?.lat), pickedLng = Number(customer?.lng);
        const pickedOk = Number.isFinite(pickedLat) && Number.isFinite(pickedLng)
          && pickedLat > 48.5 && pickedLat < 51.1 && pickedLng > 12 && pickedLng < 18.9; // hrubé hranice ČR
        const geo = pickedOk
          ? { lat: pickedLat, lng: pickedLng, district: typeof customer?.district === "string" ? customer.district.slice(0, 80) : null }
          : await geocodeAddress(customer.address);
        if (geo) {
          await supabaseAdmin.from("orders")
            .update({ delivery_lat: geo.lat, delivery_lng: geo.lng, delivery_district: geo.district })
            .in("id", created.map(c => c.id));
        }
      } catch { /* rozvoz funguje i bez souřadnic */ }
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

    // Potvrzení o přijetí — await, jinak serverless funkci zmrazí dřív než odejde
    if (customerEmail) {
      for (const c of created) {
        try { await sendOrderConfirmationEmail(customerEmail, customer.name, c.id, c.total); }
        catch { /* best-effort */ }
      }
    }

    const total = created.reduce((s, c) => s + c.total, 0);
    // orderId drží zpětnou kompatibilitu s webem (jeden koncept = jedna objednávka)
    return NextResponse.json(
      { orderId: created[0].id, orderIds: created.map((c) => c.id), total },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
