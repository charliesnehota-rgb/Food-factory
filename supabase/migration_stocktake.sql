-- ============================================================
-- Food Factory — Provozní / skladový modul (FÁZE 3)
-- Inventura jako uložený doklad. Odpisy jdou přímo do knihy
-- pohybů (type='write_off'), bez vlastní tabulky.
-- ------------------------------------------------------------
-- Uzavřením inventury vzniknou srovnávací pohyby type='stocktake'
-- na rozdíl mezi napočítaným a účetním stavem (oceněno váž. průměrem).
-- Čistě přírůstkové, nehýbe s products/orders/concepts.
-- ============================================================

create sequence if not exists stocktake_seq;
create table if not exists stocktakes (
  id                uuid primary key default uuid_generate_v4(),
  stocktake_number  text not null unique
                      default ('INV-' || to_char(now(),'YYYY') || '-' ||
                               lpad(nextval('stocktake_seq')::text, 6, '0')),
  status            text not null default 'draft' check (status in ('draft','closed')),
  note              text,
  created_by        text,
  closed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_stocktakes_status on stocktakes(status);

create table if not exists stocktake_items (
  id             uuid primary key default uuid_generate_v4(),
  stocktake_id   uuid not null references stocktakes(id) on delete cascade,
  stock_item_id  uuid not null references stock_items(id),
  counted_qty    numeric(14,3),                 -- co personál fyzicky napočítal (null = nepočítáno)
  system_qty     numeric(14,3),                 -- účetní stav v okamžiku uzavření (snapshot)
  diff_qty       numeric(14,3),                 -- counted − system (snapshot)
  unit_price_czk numeric(12,4),                 -- váž. průměr při uzavření (snapshot)
  note           text,
  created_at     timestamptz not null default now(),
  unique (stocktake_id, stock_item_id)
);
create index if not exists idx_stocktake_items_take on stocktake_items(stocktake_id);

drop trigger if exists stocktakes_updated_at on stocktakes;
create trigger stocktakes_updated_at before update on stocktakes
  for each row execute function update_updated_at();

alter table stocktakes      enable row level security;
alter table stocktake_items enable row level security;
