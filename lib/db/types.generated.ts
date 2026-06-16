// Tento soubor se vygeneruje automaticky příkazem:
//   npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > lib/db/types.generated.ts
//
// Prozatím minimální definice pro build:

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      concepts: { Row: ConceptRow; Insert: ConceptRow; Update: Partial<ConceptRow> };
      products: { Row: ProductRow; Insert: ProductInsert; Update: Partial<ProductInsert> };
      orders:   { Row: OrderRow;   Insert: OrderInsert;   Update: Partial<OrderInsert> };
      order_items: { Row: OrderItemRow; Insert: OrderItemInsert; Update: Partial<OrderItemInsert> };
      user_profiles: { Row: UserProfileRow; Insert: UserProfileRow; Update: Partial<UserProfileRow> };
      price_overrides: { Row: PriceOverrideRow; Insert: PriceOverrideInsert; Update: Partial<PriceOverrideInsert> };
      ai_logs: { Row: AiLogRow; Insert: AiLogInsert; Update: Partial<AiLogInsert> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export interface ConceptRow {
  slug: string; name: string; tagline: string; description: string;
  daypart: string; accent: string; emoji: string; active: boolean;
  sort_order: number; created_at: string;
}
export interface ProductRow {
  id: string; concept_slug: string; name: string; description: string;
  price_czk: number; category: string; tags: string[]; image_url: string | null;
  available: boolean; sort_order: number; created_at: string; updated_at: string;
}
export interface ProductInsert extends Omit<ProductRow, 'id'|'created_at'|'updated_at'> { id?: string }
export interface OrderRow {
  id: string; concept_slug: string; channel: string; fulfilment: string; status: string;
  customer_name: string; customer_phone: string | null; customer_address: string | null;
  payment_provider: string | null; payment_status: string; stripe_intent_id: string | null;
  subtotal_czk: number; delivery_fee_czk: number; total_czk: number;
  delivery_provider: string | null; delivery_tracking_id: string | null; delivery_eta: string | null;
  note: string | null; created_at: string; updated_at: string;
}
export interface OrderInsert extends Omit<OrderRow, 'id'|'created_at'|'updated_at'> { id?: string }
export interface OrderItemRow {
  id: string; order_id: string; product_id: string | null;
  name: string; qty: number; unit_price_czk: number; note: string | null;
}
export interface OrderItemInsert extends Omit<OrderItemRow, 'id'> { id?: string }
export interface UserProfileRow {
  id: string; role: string; concept_access: string[]; created_at: string;
}
export interface PriceOverrideRow {
  id: string; product_id: string; override_czk: number; reason: string | null;
  valid_from: string; valid_until: string; created_by: string; created_at: string;
}
export interface PriceOverrideInsert extends Omit<PriceOverrideRow, 'id'|'created_at'> { id?: string }
export interface AiLogRow {
  id: string; type: string; payload: Json; created_at: string;
}
export interface AiLogInsert extends Omit<AiLogRow, 'id'|'created_at'> { id?: string }
