-- ═══════════════════════════════════════════════════════════
-- E-MAIL MARKETING: souhlas, kampaně, odhlášení
-- Kampaně přes Resend na vlastní zákaznickou bázi (GDPR opt-in).
-- ═══════════════════════════════════════════════════════════

-- ── 1. Souhlas + e-mail + odhlašovací token na profilu ────
alter table user_profiles add column if not exists email text;
alter table user_profiles add column if not exists marketing_consent boolean not null default false;
alter table user_profiles add column if not exists marketing_consent_at timestamptz;
alter table user_profiles add column if not exists unsubscribe_token uuid not null default uuid_generate_v4();

create unique index if not exists user_profiles_unsubscribe_token_idx
  on user_profiles(unsubscribe_token);
create index if not exists user_profiles_marketing_idx
  on user_profiles(marketing_consent) where marketing_consent = true;

-- Backfill e-mailů z auth.users
update user_profiles p set email = u.email
from auth.users u where u.id = p.id and p.email is null;

-- Trigger při registraci nově ukládá i e-mail
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, role, full_name, email)
  values (new.id, 'customer', coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- ── 2. Kampaně ────────────────────────────────────────────
create table if not exists marketing_campaigns (
  id               uuid primary key default uuid_generate_v4(),
  title            text not null,                    -- interní název
  segment          text not null check (segment in ('all','brand','inactive_30')),
  concept_slug     text,                             -- pro segment='brand'
  subject          text not null,
  body_html        text not null,                    -- tělo (wrapper + odhlášení přidá server při odeslání)
  status           text not null default 'draft' check (status in ('draft','sent','failed')),
  recipients_count int not null default 0,
  sent_count       int not null default 0,
  error            text,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz
);
create index if not exists marketing_campaigns_created_idx on marketing_campaigns(created_at desc);

-- ── 3. RLS ────────────────────────────────────────────────
alter table marketing_campaigns enable row level security;
-- Zápisy i čtení jen přes service_role (admin API) — žádné policy.
