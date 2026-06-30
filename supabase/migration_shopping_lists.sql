-- ============================================================
-- Food Factory — Uložený nákupní seznam (FÁZE 7)
-- Sdílený doklad: hlavička + položky, se stavem a odškrtáváním.
-- Pomůcka k nákupu; navazuje na příjem. Čistě přírůstkové.
-- ============================================================

create sequence if not exists shopping_list_seq;
create table if not exists shopping_lists (
  id            uuid primary key default uuid_generate_v4(),
  list_number   text not null unique
                  default ('SL-' || to_char(now(),'YYYY') || '-' ||
                           lpad(nextval('shopping_list_seq')::text, 6, '0')),
  status        text not null default 'open' check (status in ('open','purchased','cancelled')),
  note          text,
  created_by    text,
  purchased_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_shopping_lists_status on shopping_lists(status);

create table if not exists shopping_list_items (
  id             uuid primary key default uuid_generate_v4(),
  list_id        uuid not null references shopping_lists(id) on delete cascade,
  stock_item_id  uuid references stock_items(id),     -- null = ruční položka mimo sklad
  name           text not null,                        -- snapshot názvu / ruční položka
  base_unit      text,                                 -- g/ml/ks (u položek z karet)
  suggested_qty  numeric(14,3),                        -- původní návrh (base)
  order_qty      numeric(14,3),                        -- kolik koupit (base)
  purchased      boolean not null default false,
  purchased_qty  numeric(14,3),                        -- skutečně koupeno (base, volitelné)
  note           text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_shopping_list_items_list on shopping_list_items(list_id);

drop trigger if exists shopping_lists_updated_at on shopping_lists;
create trigger shopping_lists_updated_at before update on shopping_lists
  for each row execute function update_updated_at();

alter table shopping_lists      enable row level security;
alter table shopping_list_items enable row level security;
