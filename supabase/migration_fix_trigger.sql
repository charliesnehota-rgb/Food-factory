-- ============================================================
-- Oprava: robustní trigger pro vytvoření profilu při registraci
-- Spustit v Supabase SQL Editoru
-- ============================================================

-- Trigger funkce s ošetřením chyb (nesmí shodit registraci)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, role, full_name)
  values (
    new.id,
    'customer',
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- I kdyby vložení profilu selhalo, registraci nezrušíme
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Pojistka: povolit insert do profilu (pro security definer to není nutné,
-- ale pro jistotu doplníme insert policy pro vlastníka)
drop policy if exists "own profile insert" on user_profiles;
create policy "own profile insert" on user_profiles
  for insert with check (auth.uid() = id);
