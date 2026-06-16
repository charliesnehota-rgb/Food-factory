-- ============================================================
-- Migrace: zákaznické účty (profil, adresa, Stripe customer)
-- Spustit v Supabase SQL Editoru
-- ============================================================

-- Rozšíření profilu o zákaznická pole
alter table user_profiles add column if not exists full_name text;
alter table user_profiles add column if not exists phone text;
alter table user_profiles add column if not exists address text;
alter table user_profiles add column if not exists stripe_customer_id text;

-- 'customer' role pro zákazníky (vedle admin/staff/viewer)
alter table user_profiles drop constraint if exists user_profiles_role_check;
alter table user_profiles add constraint user_profiles_role_check
  check (role in ('admin','staff','viewer','customer'));

-- Objednávky: propojení na uživatele
alter table orders add column if not exists user_id uuid references auth.users(id);
create index if not exists orders_user_id_idx on orders(user_id);

-- Automatické vytvoření profilu při registraci
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, role, full_name)
  values (new.id, 'customer', coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS: uživatel vidí a edituje jen svůj profil
drop policy if exists "own profile read" on user_profiles;
drop policy if exists "own profile update" on user_profiles;
create policy "own profile read" on user_profiles
  for select using (auth.uid() = id);
create policy "own profile update" on user_profiles
  for update using (auth.uid() = id);

-- RLS: zákazník vidí jen své objednávky (admin přes service_role obchází RLS)
drop policy if exists "own orders read" on orders;
create policy "own orders read" on orders
  for select using (auth.uid() = user_id);
