-- ═══════════════════════════════════════════════════════════
-- POKLADNA: platba kartou přes samostatný (neintegrovaný) terminál
-- ═══════════════════════════════════════════════════════════
-- Pultovní objednávky vznikají rovnou zaplacené: hotově, nebo kartou
-- na samostatném terminálu (obsluha jen zaznamená). 'stripe' zůstává
-- pro web/appku; integrovaný Stripe Terminal může přibýt později.
alter table orders drop constraint if exists orders_payment_provider_check;
alter table orders add constraint orders_payment_provider_check
  check (payment_provider in ('stripe','cash','card_terminal'));
