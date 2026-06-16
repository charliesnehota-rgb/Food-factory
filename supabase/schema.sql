-- ============================================================
-- Food Factory — Supabase / Postgres schema
-- Spustit v Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Rozšíření
create extension if not exists "uuid-ossp";

-- ── 1. Koncepty (5 restaurací) ────────────────────────────
create table if not exists concepts (
  slug        text primary key,               -- 'dumply', 'smash' ...
  name        text not null,
  tagline     text not null,
  description text not null,
  daypart     text not null check (daypart in ('breakfast','lunch','afternoon','dinner','all-day')),
  accent      text not null default '#ffffff', -- hex barva
  emoji       text not null default '🍴',
  active      boolean not null default true,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ── 2. Produkty / menu ────────────────────────────────────
create table if not exists products (
  id           uuid primary key default uuid_generate_v4(),
  concept_slug text not null references concepts(slug) on delete cascade,
  name         text not null,
  description  text not null default '',
  price_czk    numeric(10,2) not null check (price_czk >= 0),
  category     text not null default 'Jídlo',
  tags         text[] not null default '{}',    -- ['vegetarian','spicy']
  image_url    text,
  available    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on products(concept_slug);
create index on products(available);

-- ── 3. Objednávky ─────────────────────────────────────────
create table if not exists orders (
  id              text primary key default 'FF-' || lpad(floor(random()*900000+100000)::text, 6, '0'),
  concept_slug    text not null references concepts(slug),
  channel         text not null check (channel in ('web','wolt','foodora','pos')),
  fulfilment      text not null check (fulfilment in ('delivery','pickup','dine_in')),
  status          text not null default 'new'
                    check (status in ('new','accepted','preparing','ready','out_for_delivery','delivered','cancelled')),
  -- zákazník
  customer_name   text not null,
  customer_phone  text,
  customer_address text,
  -- platba
  payment_provider text check (payment_provider in ('stripe','cash')),
  payment_status  text not null default 'pending' check (payment_status in ('pending','paid','refunded')),
  stripe_intent_id text,
  -- ceny
  subtotal_czk    numeric(10,2) not null default 0,
  delivery_fee_czk numeric(10,2) not null default 0,
  total_czk       numeric(10,2) not null default 0,
  -- rozvoz
  delivery_provider text check (delivery_provider in ('wolt','foodora','self')),
  delivery_tracking_id text,
  delivery_eta    timestamptz,
  -- meta
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on orders(concept_slug);
create index on orders(status);
create index on orders(created_at desc);
create index on orders(channel);

-- ── 4. Položky objednávky ─────────────────────────────────
create table if not exists order_items (
  id           uuid primary key default uuid_generate_v4(),
  order_id     text not null references orders(id) on delete cascade,
  product_id   uuid references products(id),
  name         text not null,                  -- snapshot názvu
  qty          int  not null check (qty > 0),
  unit_price_czk numeric(10,2) not null,
  note         text
);
create index on order_items(order_id);

-- ── 5. Uživatelé / admin role ─────────────────────────────
-- auth.users je spravován Supabase Auth; tato tabulka jen
-- rozšiřuje profil o roli a přístupy ke konceptům.
create table if not exists user_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            text not null default 'staff' check (role in ('admin','staff','viewer')),
  concept_access  text[] not null default '{}', -- prázdné = přístup ke všem
  created_at      timestamptz not null default now()
);

-- ── 6. Cenové přepisy AI ──────────────────────────────────
-- AI koordinátor zapisuje dočasné cenové úpravy sem.
create table if not exists price_overrides (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references products(id) on delete cascade,
  override_czk numeric(10,2) not null,
  reason       text,                            -- 'ai_load_balancing', 'promo' ...
  valid_from   timestamptz not null default now(),
  valid_until  timestamptz not null,
  created_by   text not null default 'ai',
  created_at   timestamptz not null default now()
);
create index on price_overrides(product_id, valid_until);

-- ── 7. AI denní log ───────────────────────────────────────
create table if not exists ai_logs (
  id         uuid primary key default uuid_generate_v4(),
  type       text not null,   -- 'price_adjustment','marketing_post','daily_report'
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ── Trigger: updated_at ──────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger products_updated_at before update on products
  for each row execute function update_updated_at();
create trigger orders_updated_at before update on orders
  for each row execute function update_updated_at();

-- ── Seed: 5 konceptů ─────────────────────────────────────
insert into concepts (slug, name, tagline, description, daypart, accent, emoji, sort_order) values
  ('sunny-side', 'Sunny Side',  'All-day breakfast',         'Snídaně kdykoliv. Vajíčka, toasty, palačinky a kvalitní káva po celý den.', 'all-day',   '#f59e0b', '🍳', 1),
  ('dumply',     'Dumply',      'Čínské knedlíčky & dim sum','Ručně skládané dumplingy a dim sum. Pára, křup, a omáčky, co lepí prsty.',  'lunch',     '#ef4444', '🥟', 2),
  ('smash',      'Smash',       'Smashburgery & wrapy',      'Tence umlácené hovězí placky, roztavený sýr, domácí omáčky.',              'dinner',    '#f97316', '🍔', 3),
  ('bowlevard',  'Bowlevard',   'Grain & poke bowls',        'Vyvážené misky inspirované Sweetgreen a Pokéworks.',                       'lunch',     '#22c55e', '🥗', 4),
  ('rizkarna',   'Řízkárna',    'Řízek nově i klasika',      'Český řízek jako USP potkává katsu trend.',                               'dinner',    '#eab308', '🍗', 5)
on conflict (slug) do nothing;

-- ── RLS (Row Level Security) ──────────────────────────────
-- Veřejné čtení konceptů a produktů (pro web).
-- Zápis jen pro přihlášené uživatele s rolí admin/staff.
alter table concepts       enable row level security;
alter table products       enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;
alter table user_profiles  enable row level security;
alter table price_overrides enable row level security;
alter table ai_logs        enable row level security;

-- Veřejné čtení
create policy "public read concepts"  on concepts  for select using (active = true);
create policy "public read products"  on products  for select using (available = true);

-- Admin/staff přístup (přes service_role key na serveru)
-- Na serveru používáme supabaseAdmin (service_role), který RLS obchází.
-- Klient (browser) má jen anon key → čte jen veřejná data.
