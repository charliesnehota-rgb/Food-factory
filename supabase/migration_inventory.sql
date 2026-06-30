-- ============================================================
-- Food Factory — Provozní / skladový modul (FÁZE 1)
-- Skladové karty + příjem zásob. Sdílený sklad napříč koncepty.
-- Spustit v Supabase Dashboard → SQL Editor → New query
-- ------------------------------------------------------------
-- Konvence (shodné se schema.sql):
--   • peníze numeric s suffixem _czk; ceny BEZ DPH (net)
--   • množství v základní jednotce g / ml / ks (přesné pro receptury)
--   • created_at/updated_at timestamptz, trigger update_updated_at()
--   • RLS zapnuté, ŽÁDNÉ veřejné politiky → čte/píše jen server
--     (service_role, který RLS obchází). Klient se k datům nedostane.
--   • páteří je kniha pohybů stock_movements (append-only)
-- Nezasahuje do concepts / products / orders ani do slugů.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── 1. Kategorie surovin (nese sazbu DPH) ─────────────────
create table if not exists stock_categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  vat_rate    numeric(5,2) not null default 12,   -- DPH %, ručně dle zákona
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 2. Dodavatelé ─────────────────────────────────────────
create table if not exists suppliers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  ico         text,                               -- IČO
  dic         text,                               -- DIČ (pro DPH)
  email       text,
  phone       text,
  address     text,
  note        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 3. Skladové karty ─────────────────────────────────────
-- current_qty a ceny udržuje trigger z knihy pohybů (níže).
create table if not exists stock_items (
  id                       uuid primary key default uuid_generate_v4(),
  sku                      text unique,                       -- volitelný interní kód
  name                     text not null,
  category_id              uuid references stock_categories(id),
  base_unit                text not null default 'g'
                             check (base_unit in ('g','ml','ks')),
  current_qty              numeric(14,3) not null default 0,  -- v base_unit
  min_qty                  numeric(14,3) not null default 0,  -- hranice "dochází"
  last_purchase_price_czk  numeric(12,4),                     -- poslední nákup / base_unit (net)
  avg_price_czk            numeric(12,4) not null default 0,  -- vážený průměr / base_unit (net)
  default_supplier_id      uuid references suppliers(id),
  is_active                boolean not null default true,
  note                     text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists idx_stock_items_category on stock_items(category_id);
create index if not exists idx_stock_items_active on stock_items(is_active);

-- ── 4. Příjemky (hlavička dodávky) ────────────────────────
create sequence if not exists goods_receipt_seq;
create table if not exists goods_receipts (
  id                  uuid primary key default uuid_generate_v4(),
  receipt_number      text not null unique
                        default ('PR-' || to_char(now(),'YYYY') || '-' ||
                                 lpad(nextval('goods_receipt_seq')::text, 6, '0')),
  supplier_id         uuid references suppliers(id),
  supplier_invoice_no text,                         -- č. faktury dodavatele (pro účetnictví)
  received_at         date not null default current_date,
  status              text not null default 'draft' check (status in ('draft','posted')),
  total_net_czk       numeric(12,2) not null default 0,
  total_vat_czk       numeric(12,2) not null default 0,
  total_gross_czk     numeric(12,2) not null default 0,
  note                text,
  created_by          text,
  posted_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_goods_receipts_supplier on goods_receipts(supplier_id);
create index if not exists idx_goods_receipts_status on goods_receipts(status);
create index if not exists idx_goods_receipts_received on goods_receipts(received_at desc);

-- ── 5. Řádky příjemky ─────────────────────────────────────
-- qty + cena jsou v base_unit karty. line_* dopočítává DB.
-- vat_rate je SNAPSHOT z kategorie v okamžiku příjmu (kvůli změnám zákona).
create table if not exists goods_receipt_items (
  id                 uuid primary key default uuid_generate_v4(),
  receipt_id         uuid not null references goods_receipts(id) on delete cascade,
  stock_item_id      uuid not null references stock_items(id),
  qty                numeric(14,3) not null check (qty > 0),
  unit_price_net_czk numeric(12,4) not null check (unit_price_net_czk >= 0),
  vat_rate           numeric(5,2) not null default 12,
  line_net_czk       numeric(12,2) generated always as (round(qty * unit_price_net_czk, 2)) stored,
  line_vat_czk       numeric(12,2) generated always as (round(qty * unit_price_net_czk * vat_rate / 100, 2)) stored,
  note               text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_gri_receipt on goods_receipt_items(receipt_id);
create index if not exists idx_gri_item on goods_receipt_items(stock_item_id);

-- ── 6. Kniha pohybů skladu (append-only ledger) ───────────
-- Vše (příjem, výdej, odpis, korekce, inventura) je jeden řádek.
-- Nikdy se needituje/nemaže — oprava = nový pohyb. Páteř auditu.
create table if not exists stock_movements (
  id             uuid primary key default uuid_generate_v4(),
  stock_item_id  uuid not null references stock_items(id),
  type           text not null
                   check (type in ('receipt','consumption','write_off','adjustment','stocktake')),
  qty_change     numeric(14,3) not null,            -- + příjem / − výdej, v base_unit
  unit_price_czk numeric(12,4),                     -- nákup (příjem) nebo použitý průměr (výdej)
  reason         text,                              -- 'prijem','expirace','poskozeni','inventura'...
  ref_type       text,                              -- 'goods_receipt' | 'order' | ...
  ref_id         text,
  note           text,
  created_by     text not null default 'system',
  created_at     timestamptz not null default now()
);
create index if not exists idx_movements_item on stock_movements(stock_item_id, created_at desc);
create index if not exists idx_movements_type on stock_movements(type);
create index if not exists idx_movements_ref on stock_movements(ref_type, ref_id);

-- ── Trigger: udržení current_qty + vážený průměr z pohybů ──
create or replace function apply_stock_movement()
returns trigger language plpgsql as $$
declare
  old_qty numeric;
  old_avg numeric;
  new_avg numeric;
  new_last numeric;
begin
  select current_qty, avg_price_czk, last_purchase_price_czk
    into old_qty, old_avg, new_last
    from stock_items where id = new.stock_item_id for update;

  old_qty := coalesce(old_qty, 0);
  old_avg := coalesce(old_avg, 0);
  new_avg := old_avg;

  -- vážený průměr přepočítáme jen u příjmu s kladným množstvím a cenou
  if new.type = 'receipt' and new.qty_change > 0 and new.unit_price_czk is not null then
    if old_qty > 0 then
      new_avg := ((old_qty * old_avg) + (new.qty_change * new.unit_price_czk))
                 / (old_qty + new.qty_change);
    else
      new_avg := new.unit_price_czk;
    end if;
    new_last := new.unit_price_czk;
  end if;

  update stock_items
     set current_qty = old_qty + new.qty_change,
         avg_price_czk = new_avg,
         last_purchase_price_czk = new_last,
         updated_at = now()
   where id = new.stock_item_id;

  return new;
end;
$$;

drop trigger if exists trg_apply_stock_movement on stock_movements;
create trigger trg_apply_stock_movement
  after insert on stock_movements
  for each row execute function apply_stock_movement();

-- ── Trigger: updated_at na nových tabulkách ───────────────
-- (funkce update_updated_at() už existuje ze schema.sql)
drop trigger if exists stock_categories_updated_at on stock_categories;
create trigger stock_categories_updated_at before update on stock_categories
  for each row execute function update_updated_at();
drop trigger if exists suppliers_updated_at on suppliers;
create trigger suppliers_updated_at before update on suppliers
  for each row execute function update_updated_at();
drop trigger if exists stock_items_updated_at on stock_items;
create trigger stock_items_updated_at before update on stock_items
  for each row execute function update_updated_at();
drop trigger if exists goods_receipts_updated_at on goods_receipts;
create trigger goods_receipts_updated_at before update on goods_receipts
  for each row execute function update_updated_at();

-- ── Seed: výchozí kategorie (sazby uprav podle zákona) ────
insert into stock_categories (name, vat_rate, sort_order) values
  ('Maso a ryby',  12, 1),
  ('Pečivo',       12, 2),
  ('Zelenina a ovoce', 12, 3),
  ('Mléčné a vejce',  12, 4),
  ('Suché a koření',  12, 5),
  ('Nápoje',       12, 6),
  ('Obaly a spotřební', 21, 7),
  ('Ostatní',      21, 8)
on conflict (name) do nothing;

-- ── RLS: zapnout, žádné veřejné politiky (jen server) ─────
alter table stock_categories    enable row level security;
alter table suppliers           enable row level security;
alter table stock_items         enable row level security;
alter table goods_receipts      enable row level security;
alter table goods_receipt_items enable row level security;
alter table stock_movements     enable row level security;
