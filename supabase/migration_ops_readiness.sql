-- ═══════════════════════════════════════════════════════════
-- PŘÍPRAVA NA PROVOZ: alergeny (EU 1169/2011) + provozní doba
-- ═══════════════════════════════════════════════════════════

-- ── 1. Alergeny u produktů (čísla 1–14 dle EU značení) ────
alter table products add column if not exists allergens int[] not null default '{}';

-- ── 2. Provozní doba per koncept ──────────────────────────
-- hours: {"0":{"open":"09:00","close":"20:00","closed":false}, …}
-- klíč = den v týdnu dle JS getDay (0 = neděle … 6 = sobota)
create table if not exists concept_settings (
  concept_slug text primary key,
  hours        jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);
alter table concept_settings enable row level security;
-- Čtení i zápis přes service_role (API) — žádné policy.

-- Výchozí hodiny (Karel upraví v /admin/provoz)
insert into concept_settings (concept_slug, hours) values
  ('sunny-side', '{"0":{"open":"08:00","close":"14:00","closed":false},"1":{"open":"07:30","close":"14:00","closed":false},"2":{"open":"07:30","close":"14:00","closed":false},"3":{"open":"07:30","close":"14:00","closed":false},"4":{"open":"07:30","close":"14:00","closed":false},"5":{"open":"07:30","close":"14:00","closed":false},"6":{"open":"08:00","close":"14:00","closed":false}}'::jsonb),
  ('dumply',     '{"0":{"open":"11:00","close":"21:00","closed":false},"1":{"open":"11:00","close":"21:00","closed":false},"2":{"open":"11:00","close":"21:00","closed":false},"3":{"open":"11:00","close":"21:00","closed":false},"4":{"open":"11:00","close":"22:00","closed":false},"5":{"open":"11:00","close":"22:00","closed":false},"6":{"open":"12:00","close":"21:00","closed":false}}'::jsonb),
  ('smash',      '{"0":{"open":"11:00","close":"21:00","closed":false},"1":{"open":"11:00","close":"21:00","closed":false},"2":{"open":"11:00","close":"21:00","closed":false},"3":{"open":"11:00","close":"21:00","closed":false},"4":{"open":"11:00","close":"22:00","closed":false},"5":{"open":"11:00","close":"22:00","closed":false},"6":{"open":"12:00","close":"21:00","closed":false}}'::jsonb)
on conflict (concept_slug) do nothing;
