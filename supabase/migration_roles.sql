-- ============================================================
-- Food Factory — Role pro účetní (FÁZE 6, část 1)
-- Rozšíření povolených rolí o 'accountant' (jen čtení/exporty).
-- ============================================================

alter table user_profiles drop constraint if exists user_profiles_role_check;
alter table user_profiles add constraint user_profiles_role_check
  check (role in ('admin','staff','viewer','customer','accountant'));
