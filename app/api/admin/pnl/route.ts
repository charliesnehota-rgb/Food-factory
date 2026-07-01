import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/require-staff";

export async function GET(req: NextRequest) {
  if (!(await requireRole(["admin"]))) return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const concept = searchParams.get("concept") ?? null;

  if (!from || !to) return NextResponse.json({ error: "Vyžadováno from a to (YYYY-MM-DD)." }, { status: 400 });

  const [conceptRes, productRes] = await Promise.all([
    supabaseAdmin.rpc("get_concept_pnl", { p_from: from, p_to: to }),
    supabaseAdmin.rpc("get_product_pnl", { p_from: from, p_to: to, p_concept: concept }),
  ]);

  if (conceptRes.error) return NextResponse.json({ error: conceptRes.error.message }, { status: 500 });
  if (productRes.error) return NextResponse.json({ error: productRes.error.message }, { status: 500 });

  const concepts: Row[] = conceptRes.data ?? [];
  const products = productRes.data ?? [];

  const totalRevenue = concepts.reduce((s: number, c: Row) => s + Number(c.revenue), 0);
  const totalFoodCost = concepts.reduce((s: number, c: Row) => s + Number(c.food_cost), 0);
  const totalOrders = concepts.reduce((s: number, c: Row) => s + Number(c.orders_count), 0);
  const totalPortions = concepts.reduce((s: number, c: Row) => s + Number(c.portions), 0);

  return NextResponse.json({
    from, to,
    concepts,
    products,
    total: {
      revenue: Math.round(totalRevenue * 100) / 100,
      food_cost: Math.round(totalFoodCost * 100) / 100,
      food_cost_pct: totalRevenue > 0 ? Math.round((totalFoodCost / totalRevenue) * 1000) / 10 : 0,
      gross_margin: Math.round((totalRevenue - totalFoodCost) * 100) / 100,
      gross_margin_pct: totalRevenue > 0 ? Math.round(((totalRevenue - totalFoodCost) / totalRevenue) * 1000) / 10 : 0,
      orders_count: totalOrders,
      portions: totalPortions,
    },
  });
}

interface Row { revenue: number; food_cost: number; orders_count: number; portions: number; }
