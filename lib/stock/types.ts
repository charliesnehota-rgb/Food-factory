import type { BaseUnit } from "@/lib/stock/units";

export interface StockCategory {
  id: string;
  name: string;
  vat_rate: number;
  sort_order: number;
  is_active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  ico: string | null;
  dic: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  is_active: boolean;
}

export interface StockItem {
  id: string;
  sku: string | null;
  name: string;
  category_id: string | null;
  base_unit: BaseUnit;
  current_qty: number;
  min_qty: number;
  target_qty: number;
  last_purchase_price_czk: number | null;
  avg_price_czk: number;
  default_supplier_id: string | null;
  is_active: boolean;
  note: string | null;
  // embedded (z joinu)
  category?: { name: string; vat_rate: number } | null;
  supplier?: { name: string } | null;
}

export interface ReceiptItem {
  id?: string;
  receipt_id?: string;
  stock_item_id: string;
  qty: number;                 // v base jednotce
  unit_price_net_czk: number;  // za base jednotku, bez DPH
  vat_rate: number;
  line_net_czk?: number;
  line_vat_czk?: number;
  note?: string | null;
  // embedded
  stock_item?: { name: string; base_unit: BaseUnit } | null;
}

export interface GoodsReceipt {
  id: string;
  receipt_number: string;
  supplier_id: string | null;
  supplier_invoice_no: string | null;
  received_at: string;
  status: "draft" | "posted";
  total_net_czk: number;
  total_vat_czk: number;
  total_gross_czk: number;
  note: string | null;
  posted_at: string | null;
  created_at: string;
  // embedded
  supplier?: { name: string } | null;
  items?: ReceiptItem[];
}

export type MovementType = "receipt" | "consumption" | "write_off" | "adjustment" | "stocktake";

export interface StockMovement {
  id: string;
  stock_item_id: string;
  type: MovementType;
  qty_change: number;
  unit_price_czk: number | null;
  reason: string | null;
  ref_type: string | null;
  ref_id: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
  stock_item?: { name: string; base_unit: BaseUnit } | null;
}

export interface Stocktake {
  id: string;
  stocktake_number: string;
  status: "draft" | "closed";
  note: string | null;
  created_by: string | null;
  closed_at: string | null;
  created_at: string;
  items?: StocktakeItem[];
}

export interface StocktakeItem {
  id: string;
  stocktake_id: string;
  stock_item_id: string;
  counted_qty: number | null;
  system_qty: number | null;
  diff_qty: number | null;
  unit_price_czk: number | null;
  note: string | null;
  stock_item?: { name: string; base_unit: BaseUnit; current_qty: number; avg_price_czk: number } | null;
}
