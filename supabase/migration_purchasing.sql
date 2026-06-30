-- ============================================================
-- Food Factory — Sklad: nákup + revize (FÁZE 5)
-- Cílový stav na kartě ("doplnit do"). Z minima a cíle se počítá
-- návrh nákupu. Nákupní seznam se generuje živě, není potřeba
-- vlastní tabulka. Čistě přírůstkové.
-- ============================================================

alter table stock_items add column if not exists target_qty numeric(14,3) not null default 0;
