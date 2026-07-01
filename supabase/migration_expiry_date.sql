-- Trvanlivost: datum spotřeby / min. trvanlivosti na řádku příjemky
-- Volitelné pole; trackuje se per šarže (příjemka), ne globálně na kartě

ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS expiry_date date;

COMMENT ON COLUMN goods_receipt_items.expiry_date IS
  'Datum minimální trvanlivosti / spotřeby — volitelné, vyplněné při příjmu';
