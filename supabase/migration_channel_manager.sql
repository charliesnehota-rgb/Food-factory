-- ═══════════════════════════════════════════════════════════
-- CHANNEL MANAGER: sync menu/cen/dostupnosti/hodin na Wolt a foodoru
-- Admin je jediný zdroj pravdy; změny tečou frontou s debouncingem
-- (Wolt rate limit: menu/items 1×/15 min, inventory 1×/5 min per venue).
-- ═══════════════════════════════════════════════════════════

-- ── 1. Napojení konceptu na prodejní kanál ────────────────
create table if not exists channel_connections (
  id                uuid primary key default uuid_generate_v4(),
  channel           text not null check (channel in ('wolt','foodora')),
  concept_slug      text not null,
  external_venue_id text,                          -- venueId (Wolt) / vendor code (foodora)
  enabled           boolean not null default false,
  price_multiplier  numeric(4,2) not null default 1.30 check (price_multiplier > 0),
  config            jsonb not null default '{}',   -- chain_code apod.
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (channel, concept_slug)
);
drop trigger if exists channel_connections_updated_at on channel_connections;
create trigger channel_connections_updated_at
  before update on channel_connections
  for each row execute function update_updated_at();

-- ── 2. Mapování produkt ↔ externí ID per kanál ────────────
create table if not exists channel_product_map (
  id             uuid primary key default uuid_generate_v4(),
  product_id     uuid not null references products(id) on delete cascade,
  channel        text not null check (channel in ('wolt','foodora')),
  external_id    text not null,
  last_synced_at timestamptz,
  unique (product_id, channel)
);

-- ── 3. Sync fronta (koalescence přes dedupe_key) ──────────
create table if not exists channel_sync_queue (
  id           uuid primary key default uuid_generate_v4(),
  channel      text not null check (channel in ('wolt','foodora')),
  concept_slug text not null,
  event_type   text not null check (event_type in ('menu_full','item_update','inventory','hours','venue_status')),
  payload      jsonb not null default '{}',
  dedupe_key   text not null,                      -- channel:concept:event
  status       text not null default 'pending' check (status in ('pending','done','failed','skipped')),
  attempts     int not null default 0,
  error        text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists channel_sync_queue_status_idx on channel_sync_queue(status, created_at);
-- Jeden čekající záznam na klíč — další změny se slévají do payloadu
create unique index if not exists channel_sync_queue_dedupe_idx
  on channel_sync_queue(dedupe_key) where status = 'pending';

-- ── 4. RLS ────────────────────────────────────────────────
alter table channel_connections enable row level security;
alter table channel_product_map enable row level security;
alter table channel_sync_queue  enable row level security;
-- Vše přes service_role (admin API / cron) — žádné policy.

-- ── 5. Seed napojení (vypnutá, dokud nejsou API klíče) ────
insert into channel_connections (channel, concept_slug) values
  ('wolt','sunny-side'), ('wolt','dumply'), ('wolt','smash'),
  ('foodora','sunny-side'), ('foodora','dumply'), ('foodora','smash')
on conflict (channel, concept_slug) do nothing;
