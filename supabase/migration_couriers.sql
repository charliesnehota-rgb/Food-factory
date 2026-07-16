-- ═══════════════════════════════════════════════════════════
-- KURÝŘI: role 'courier' + přiřazení objednávky kurýrovi
-- ═══════════════════════════════════════════════════════════
-- Vlastní rozvoz: kurýr si v /admin/kurier bere hotové rozvozové
-- objednávky (klidně víc najednou) a postupně je rozváží. Žádná
-- automatická optimalizace tras — jedna kuchyně, auta jezdí tam
-- a zpět; pořadí si kurýr určuje sám podle adres.

-- ── 1. Role kurýra ─────────────────────────────────────────
alter table user_profiles drop constraint if exists user_profiles_role_check;
alter table user_profiles add constraint user_profiles_role_check
  check (role in ('admin','staff','viewer','customer','accountant','courier'));

-- ── 2. Přiřazení objednávky kurýrovi ───────────────────────
-- null = objednávka čeká v poolu; vyplněné = kurýr ji veze.
alter table orders add column if not exists courier_id uuid references user_profiles(id) on delete set null;
create index if not exists orders_courier_idx on orders(courier_id);
