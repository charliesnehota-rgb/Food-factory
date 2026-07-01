import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/require-staff";

// Vrátí receptury (produkty), ve kterých figuruje daná skladová karta.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff()))
    return NextResponse.json({ error: "Přístup zamítnut" }, { status: 403 });
  if (!supabaseAdmin)
    return NextResponse.json({ error: "DB nedostupná" }, { status: 503 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("product_recipe_items")
    .select("qty_per_portion, product:products!product_id(id, name, concept_slug, price_czk, available)")
    .eq("stock_item_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten — každý řádek má qty + produkt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (data ?? []).map((row: any) => {
    const p = Array.isArray(row.product) ? row.product[0] : row.product;
    return {
      product_id: p?.id ?? null,
      product_name: p?.name ?? "—",
      concept_slug: p?.concept_slug ?? null,
      price_czk: p?.price_czk ?? null,
      available: p?.available ?? false,
      qty_per_portion: Number(row.qty_per_portion),
    };
  });

  return NextResponse.json(result);
}
