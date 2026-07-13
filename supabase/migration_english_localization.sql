-- ═══════════════════════════════════════════════════════════
-- ANGLICKÁ MUTACE zákaznických webů
-- EN texty produktů a customizací; UI texty webů řeší frontend
-- (lib/customer-locale.tsx). Fallback = české hodnoty.
-- ═══════════════════════════════════════════════════════════
alter table products add column if not exists name_en text;
alter table products add column if not exists description_en text;
alter table products add column if not exists category_en text;
alter table product_customizations add column if not exists name_en text;
