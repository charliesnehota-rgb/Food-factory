import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/db/orders";
import { requireStaff } from "@/lib/auth/require-staff";
import { supabaseAdmin } from "@/lib/db/supabase";
import { applyStatusSideEffects } from "@/lib/order-side-effects";
import type { OrderStatus } from "@/lib/types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });

  const { id } = await params;
  try {
    const { status } = await req.json();

    // ── PÁROVÁNÍ S PLATEBNÍ BRÁNOU ──
    // Web/app objednávky pouští do kuchyňského toku až potvrzená platba
    // ze Stripe (webhook / uložená karta). Do té doby je povolené jen storno.
    if (supabaseAdmin && status !== "cancelled") {
      const { data: existing } = await supabaseAdmin
        .from("orders").select("channel, payment_status").eq("id", id).single();
      if (
        existing &&
        (existing.channel === "web" || existing.channel === "app") &&
        existing.payment_status !== "paid"
      ) {
        return NextResponse.json(
          { error: "Objednávka není zaplacená — do přípravy ji pustí až potvrzení platby." },
          { status: 409 },
        );
      }
    }

    await updateOrderStatus(id, status as OrderStatus);

    // Sklad + notifikace zákazníkovi — sdílené s kurýrním rozhraním,
    // aby obě cesty měly identické chování (viz lib/order-side-effects).
    await applyStatusSideEffects(id, status as OrderStatus, staff.email ?? staff.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
