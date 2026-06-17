-- ============================================================
-- Seed produktů do tabulky products (30 položek, 5 konceptů × 6)
-- Spustit v Supabase SQL Editoru
-- ============================================================

INSERT INTO products (id, concept_slug, name, description, price_czk, category, tags, available, sort_order) VALUES
-- Sunny Side
('11111111-0001-0001-0001-000000000001','sunny-side','Avocado toast','Kváskový chléb, avokádo, pošírované vejce',159,'Jídlo','{"vegetarian"}',true,1),
('11111111-0001-0001-0001-000000000002','sunny-side','Pancake stack','Americké lívance, javorový sirup, máslo',149,'Jídlo','{"vegetarian"}',true,2),
('11111111-0001-0001-0001-000000000003','sunny-side','Shakshuka','Vejce v rajčatové omáčce, feta, pečivo',169,'Jídlo','{"vegetarian","spicy"}',true,3),
('11111111-0001-0001-0001-000000000004','sunny-side','Breakfast burrito','Míchaná vejce, slanina, sýr, fazole',159,'Jídlo','{}',true,4),
('11111111-0001-0001-0001-000000000005','sunny-side','Granola bowl','Jogurt, domácí granola, sezónní ovoce',129,'Jídlo','{"vegetarian"}',true,5),
('11111111-0001-0001-0001-000000000006','sunny-side','Flat white','Dvojité espresso, jemně našlehané mléko',79,'Nápoje','{}',true,6),
-- Dumply
('22222222-0002-0002-0002-000000000001','dumply','Pork dumplings (8 ks)','Vepřové, zázvor, jarní cibulka',169,'Dumplingy','{}',true,1),
('22222222-0002-0002-0002-000000000002','dumply','Chicken gyoza (6 ks)','Kuřecí, restované do křupava',149,'Dumplingy','{}',true,2),
('22222222-0002-0002-0002-000000000003','dumply','Veggie bao (3 ks)','Plněné parní bochánky, houby & zelenina',139,'Dim sum','{"vegetarian"}',true,3),
('22222222-0002-0002-0002-000000000004','dumply','Shrimp dim sum (6 ks)','Krevetové har gow v rýžovém těstě',189,'Dim sum','{}',true,4),
('22222222-0002-0002-0002-000000000005','dumply','Spicy wontons','Wontony v chilli oleji',159,'Dumplingy','{"spicy"}',true,5),
('22222222-0002-0002-0002-000000000006','dumply','Bubble tea','Černý čaj, mléko, tapiokové perly',89,'Nápoje','{}',true,6),
-- Smash
('33333333-0003-0003-0003-000000000001','smash','Classic smash','Hovězí smash, cheddar, okurka, omáčka',169,'Burgery','{}',true,1),
('33333333-0003-0003-0003-000000000002','smash','Double smash','Dvojitá placka, dvojitý sýr',219,'Burgery','{}',true,2),
('33333333-0003-0003-0003-000000000003','smash','Chicken wrap','Křupavé kuře, salát, ranch',159,'Wrapy','{}',true,3),
('33333333-0003-0003-0003-000000000004','smash','Veggie burger','Placka z cizrny, grilovaná zelenina',159,'Burgery','{"vegetarian"}',true,4),
('33333333-0003-0003-0003-000000000005','smash','Hranolky','Křupavé, mořská sůl',59,'Přílohy','{"vegetarian"}',true,5),
('33333333-0003-0003-0003-000000000006','smash','Craft lemonade','Domácí limonáda, citron & máta',69,'Nápoje','{}',true,6),
-- Bowlevard
('44444444-0004-0004-0004-000000000001','bowlevard','Salmon poke','Losos, rýže, edamame, avokádo',199,'Poke','{}',true,1),
('44444444-0004-0004-0004-000000000002','bowlevard','Chicken teriyaki bowl','Grilované kuře, teriyaki, zelenina',179,'Grain','{}',true,2),
('44444444-0004-0004-0004-000000000003','bowlevard','Falafel grain bowl','Falafel, quinoa, hummus, salát',159,'Grain','{"vegetarian"}',true,3),
('44444444-0004-0004-0004-000000000004','bowlevard','Tuna poke','Tuňák, rýže, mango, sezam',209,'Poke','{}',true,4),
('44444444-0004-0004-0004-000000000005','bowlevard','Build-your-own','Vyber si základ, protein a topping',169,'Vlastní','{}',true,5),
('44444444-0004-0004-0004-000000000006','bowlevard','Kombucha','Fermentovaný čaj, lehce perlivý',79,'Nápoje','{}',true,6),
-- Řízkárna
('55555555-0005-0005-0005-000000000001','rizkarna','Klasický řízek','Vepřový, tradiční trojobal, bramborový salát',189,'Klasika','{}',true,1),
('55555555-0005-0005-0005-000000000002','rizkarna','Katsu sando','Vepřový katsu v briošce, tonkatsu omáčka',179,'Moderní','{}',true,2),
('55555555-0005-0005-0005-000000000003','rizkarna','Smash řízek wrap','Řízek ve wrapu, salát, česneková majonéza',159,'Moderní','{}',true,3),
('55555555-0005-0005-0005-000000000004','rizkarna','Řízek bowl','Řízek na rýži, kimchi, sezam',179,'Moderní','{}',true,4),
('55555555-0005-0005-0005-000000000005','rizkarna','Sýrový řízek','Kuřecí řízek se sýrovou krustou',169,'Klasika','{}',true,5),
('55555555-0005-0005-0005-000000000006','rizkarna','Domácí limonáda','Citron, máta, třtinový cukr',69,'Nápoje','{}',true,6)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_czk = EXCLUDED.price_czk,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  sort_order = EXCLUDED.sort_order;
