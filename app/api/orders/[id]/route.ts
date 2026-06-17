import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/db/orders";
import { requireStaff } from "@/lib/auth/require-staff";
import type { OrderStatus } from "@/lib/types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Jen pracovník smí měnit stav objednávky
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });

  const { id } = await params;
  try {
    const { status } = await req.json();
    await updateOrderStatus(id, status as OrderStatus);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
