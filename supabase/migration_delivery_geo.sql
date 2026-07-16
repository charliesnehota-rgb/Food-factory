-- ═══════════════════════════════════════════════════════════
-- ROZVOZ: souřadnice doručovací adresy + čtvrť (geokódování)
-- ═══════════════════════════════════════════════════════════
-- Základ pro seskupování rozvážek ("3 objednávky v jedné části
-- Prahy") a řazení zastávek po trase. Plní se automaticky při
-- vytvoření objednávky (Nominatim/OSM); starší objednávky se
-- dogeokódují líně z kurýrního rozhraní. null = zatím neznámé.
alter table orders add column if not exists delivery_lat double precision;
alter table orders add column if not exists delivery_lng double precision;
alter table orders add column if not exists delivery_district text;
