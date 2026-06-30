-- ============================================================
-- Oprava: smazání uživatele padalo na "Database error deleting user".
-- Příčina: orders.user_id -> auth.users(id) mělo NO ACTION, takže
-- uživatele s objednávkou nešlo smazat (ani znovu zaregistrovat e-mail).
-- Řešení: ON DELETE SET NULL — objednávky zůstanou, jen se odpojí.
-- ============================================================

alter table orders drop constraint orders_user_id_fkey;
alter table orders add constraint orders_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
