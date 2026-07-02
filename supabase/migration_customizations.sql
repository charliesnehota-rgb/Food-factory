-- ═══════════════════════════════════════════════════════════
-- CUSTOMIZACE PRODUKTŮ (přídavky: slanina, sýr, špenát…)
-- Zákazník si v detailu produktu zaškrtne přídavky, ty se
-- uloží s objednávkou do order_item_customizations.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Customizace per produkt ────────────────────────────
create table if not exists product_customizations (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references products(id) on delete cascade,
  name        text not null,                              -- "Slanina"
  price_czk   numeric(10,2) not null default 0 check (price_czk >= 0),
  available   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists product_customizations_product_idx
  on product_customizations(product_id, sort_order);

-- updated_at trigger (stejný pattern jako products)
drop trigger if exists product_customizations_updated_at on product_customizations;
create trigger product_customizations_updated_at
  before update on product_customizations
  for each row execute function update_updated_at();

-- ── 2. Vybrané customizace na položce objednávky ──────────
-- name + unit_price_czk jsou snapshot (stejně jako u order_items),
-- aby historické objednávky přežily změnu/mazání customizace.
create table if not exists order_item_customizations (
  id               uuid primary key default uuid_generate_v4(),
  order_item_id    uuid not null references order_items(id) on delete cascade,
  customization_id uuid references product_customizations(id) on delete set null,
  name             text not null,
  unit_price_czk   numeric(10,2) not null default 0,
  qty              int not null default 1 check (qty > 0)
);
create index if not exists order_item_customizations_item_idx
  on order_item_customizations(order_item_id);

-- ── 3. RLS ────────────────────────────────────────────────
alter table product_customizations    enable row level security;
alter table order_item_customizations enable row level security;

-- Veřejné čtení dostupných customizací (menu detail pro zákazníky)
drop policy if exists "public read product customizations" on product_customizations;
create policy "public read product customizations"
  on product_customizations for select using (available = true);

-- Zápisy jdou přes service_role (API routes) — žádné další policy.
