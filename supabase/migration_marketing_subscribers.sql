-- ═══════════════════════════════════════════════════════════
-- HOSTUJÍCÍ ODBĚRATELÉ NOVINEK
-- Opt-in z checkoutu bez registrace. Consent flag zůstává i po
-- odhlášení (GDPR audit: záznam souhlasu i jeho odvolání).
-- ═══════════════════════════════════════════════════════════
create table if not exists marketing_subscribers (
  id                uuid primary key default uuid_generate_v4(),
  email             text not null unique,
  name              text,
  source            text not null default 'checkout',
  marketing_consent boolean not null default true,
  unsubscribe_token uuid not null default uuid_generate_v4(),
  created_at        timestamptz not null default now(),
  unsubscribed_at   timestamptz
);
create unique index if not exists marketing_subscribers_token_idx
  on marketing_subscribers(unsubscribe_token);
create index if not exists marketing_subscribers_consent_idx
  on marketing_subscribers(marketing_consent) where marketing_consent = true;

alter table marketing_subscribers enable row level security;
-- Zápisy i čtení jen přes service_role (API) — žádné policy.
