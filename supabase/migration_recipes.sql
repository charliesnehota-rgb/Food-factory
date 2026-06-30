-- ============================================================
-- Food Factory — Provozní / skladový modul (FÁZE 2)
-- Receptury: kolik které suroviny padne na 1 porci produktu.
-- Spustit v Supabase Dashboard → SQL Editor (nebo přes MCP).
-- ------------------------------------------------------------
-- Spotřeba se zapisuje do stock_movements (type='consumption')
-- v okamžiku, kdy objednávka přejde do stavu ready/delivered.
-- Vracení při stornu = type='adjustment', ref_type='order_reversal'.
-- Čistě přírůstkové, nezasahuje do products/orders/concepts.
-- ============================================================

create table if not exists product_recipe_items (
  id              uuid primary key default uuid_generate_v4(),
  product_id      uuid not null references products(id) on delete cascade,
  stock_item_id   uuid not null references stock_items(id),
  qty_per_portion numeric(14,3) not null check (qty_per_portion > 0), -- v base_unit suroviny
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (product_id, stock_item_id)
);
create index if not exists idx_recipe_product on product_recipe_items(product_id);
create index if not exists idx_recipe_item on product_recipe_items(stock_item_id);

drop trigger if exists product_recipe_items_updated_at on product_recipe_items;
create trigger product_recipe_items_updated_at before update on product_recipe_items
  for each row execute function update_updated_at();

alter table product_recipe_items enable row level security;
