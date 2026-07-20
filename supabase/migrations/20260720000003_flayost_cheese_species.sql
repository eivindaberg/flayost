-- Ostekatalog (frø til «Kort»-fanen / Pokédex-laget) — helt separat fra
-- flayost_cheeses (familiens egne dømte oster). Katalogen er ALDRI eksponert
-- rått til klienten: kun søk (autocomplete, maks 8 treff) og kort-matching
-- går via RPC. Samme mønster som resten av skjemaet — RLS på, ingen policies,
-- alt via security-definer-funksjoner.
create table public.flayost_cheese_species (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  milk       text not null check (milk in ('Ku','Geit','Sau')),
  tex        text check (tex in ('Myk','Fast','Blå','Fersk')),
  origin     text not null default '',
  lat        double precision,
  lng        double precision,
  img        text,
  created_at timestamptz not null default now()
);
alter table public.flayost_cheese_species enable row level security;
revoke all on public.flayost_cheese_species from anon, authenticated;

-- Frø fra dagens CHEESES_FR (94 stk, generert av tools/generate-cheese-seed.js
-- — ikke håndskrevet, for å unngå transkripsjonsfeil på tvers av 94 rader).
insert into public.flayost_cheese_species (name, milk, tex, origin, lat, lng, img) values
  ('Camembert de Normandie', 'Ku', 'Myk', 'Camembert (Normandie)', 48.8622, 0.1717, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Camembert_de_Normandie_%28AOP%29_10.jpg/500px-Camembert_de_Normandie_%28AOP%29_10.jpg'),
  ('Brie de Meaux', 'Ku', 'Myk', 'Meaux', 48.9603, 2.8883, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Brie_01.jpg/500px-Brie_01.jpg'),
  ('Brie de Melun', 'Ku', 'Myk', 'Melun', 48.5406, 2.6531, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wikicheese_-_Brie_de_Melun_-_20150515_-_015.jpg/500px-Wikicheese_-_Brie_de_Melun_-_20150515_-_015.jpg'),
  ('Coulommiers', 'Ku', 'Myk', 'Coulommiers', 48.8156, 3.0847, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Coulommiers_lait_cru.jpg/500px-Coulommiers_lait_cru.jpg'),
  ('Époisses', 'Ku', 'Myk', 'Époisses (Bourgogne)', 47.5069, 4.1733, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/%C3%89poisses_Gaugry_03.jpg/500px-%C3%89poisses_Gaugry_03.jpg'),
  ('Langres', 'Ku', 'Myk', 'Langres', 47.8625, 5.3331, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Langres_fromage_AOP_coupe.jpg/500px-Langres_fromage_AOP_coupe.jpg'),
  ('Chaource', 'Ku', 'Myk', 'Chaource', 48.0586, 4.1383, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chaource_%28fromage%29_01.jpg/500px-Chaource_%28fromage%29_01.jpg'),
  ('Munster', 'Ku', 'Myk', 'Munster (Alsace)', 48.0414, 7.1342, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Munster_01.jpg/500px-Munster_01.jpg'),
  ('Livarot', 'Ku', 'Myk', 'Livarot (Normandie)', 49.0064, 0.1519, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Livarot_%28fromage%29_02.jpg/500px-Livarot_%28fromage%29_02.jpg'),
  ('Pont-l''Évêque', 'Ku', 'Myk', 'Pont-l''Évêque (Normandie)', 49.2864, 0.1897, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Pont-l%27%C3%89v%C3%AAque_03.jpg/500px-Pont-l%27%C3%89v%C3%AAque_03.jpg'),
  ('Neufchâtel', 'Ku', 'Myk', 'Neufchâtel-en-Bray', 49.7328, 1.4394, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/C%C5%93urs_de_Neufch%C3%A2tel_01.jpg/500px-C%C5%93urs_de_Neufch%C3%A2tel_01.jpg'),
  ('Maroilles', 'Ku', 'Myk', 'Maroilles (Nord)', 50.135, 3.7608, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Maroilles_%28cheese%29.jpg/500px-Maroilles_%28cheese%29.jpg'),
  ('Mont d''Or', 'Ku', 'Myk', 'Mont d''Or (Haut-Doubs)', 46.727, 6.356, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Vacherin_du_haut_Doubs.jpg/500px-Vacherin_du_haut_Doubs.jpg'),
  ('Saint-Marcellin', 'Ku', 'Myk', 'Saint-Marcellin (Isère)', 45.1517, 5.3197, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Wikicheese_-_Saint-marcellin_-_20150417_-_010.jpg/500px-Wikicheese_-_Saint-marcellin_-_20150417_-_010.jpg'),
  ('Saint-Félicien', 'Ku', 'Myk', 'Dauphiné', 45.2, 5.7, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Saint-F%C3%A9licien_02.jpg/500px-Saint-F%C3%A9licien_02.jpg'),
  ('Reblochon', 'Ku', 'Myk', 'Thônes (Haute-Savoie)', 45.8811, 6.3261, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Reblochon_11.jpg/500px-Reblochon_11.jpg'),
  ('Brillat-Savarin', 'Ku', 'Myk', 'Normandie', 49.1223, -0.4366, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/WikiCheese_-_Brillat-savarin_04.jpg/500px-WikiCheese_-_Brillat-savarin_04.jpg'),
  ('Gaperon', 'Ku', 'Myk', 'Auvergne', 45.7, 3.2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Wikicheese_Clermont-Ferrand_-_Gaperon_20220825-02.jpg/500px-Wikicheese_Clermont-Ferrand_-_Gaperon_20220825-02.jpg'),
  ('Curé Nantais', 'Ku', 'Myk', 'Pornic (Loire-Atlantique)', 47.1156, -2.1039, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Cur%C3%A9_nantais.JPG/500px-Cur%C3%A9_nantais.JPG'),
  ('Port-Salut', 'Ku', 'Myk', 'Entrammes (Mayenne)', 47.9989, -0.7169, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Port_Salut_cheese.jpg/500px-Port_Salut_cheese.jpg'),
  ('Carré de l''Est', 'Ku', 'Myk', 'Lorraine', 48.7, 6.2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Carr%C3%A9_de_l%27Est.jpg/500px-Carr%C3%A9_de_l%27Est.jpg'),
  ('Soumaintrain', 'Ku', 'Myk', 'Soumaintrain (Bourgogne)', 47.97, 3.97, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Soumaintrain_250g_GAUGRY.jpg/500px-Soumaintrain_250g_GAUGRY.jpg'),
  ('Vieux-Lille', 'Ku', 'Myk', 'Lille', 50.6292, 3.0573, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Lille_RueEsquermoise.JPG/500px-Lille_RueEsquermoise.JPG'),
  ('Vieux-Boulogne', 'Ku', 'Myk', 'Boulogne-sur-Mer', 50.7264, 1.6147, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/20080904-cap_blanc_nez_plateau.jpg/500px-20080904-cap_blanc_nez_plateau.jpg'),
  ('Caprice des Dieux', 'Ku', 'Myk', 'Illoud (Haute-Marne)', 48.1706, 5.5714, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Caprice_des_Dieux.JPG/500px-Caprice_des_Dieux.JPG'),
  ('Saint-Albray', 'Ku', 'Myk', 'Béarn', 43.3, -0.37, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Saint_Albray_sur_assiette.JPG/500px-Saint_Albray_sur_assiette.JPG'),
  ('Délice de Bourgogne', 'Ku', 'Myk', 'Bourgogne', 47, 4.5, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/DELICE_DE_BOURGOGNE_2KG_LINCET_EXPORT.png/500px-DELICE_DE_BOURGOGNE_2KG_LINCET_EXPORT.png'),
  ('Chaumes', 'Ku', 'Myk', 'Périgord', 44.8442, 0.1547, null),
  ('Tamié', 'Ku', 'Myk', 'Abbaye de Tamié (Savoie)', 45.6656, 6.3086, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Abbaye_de_Tami%C3%A9_Cheese_from_Terroirs_by_LQV.jpg/500px-Abbaye_de_Tami%C3%A9_Cheese_from_Terroirs_by_LQV.jpg'),
  ('Boulette d''Avesnes', 'Ku', 'Myk', 'Avesnes-sur-Helpe', 50.1236, 3.9294, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Boulette_d%27Avesnes_04.jpg/500px-Boulette_d%27Avesnes_04.jpg'),
  ('Comté', 'Ku', 'Fast', 'Franche-Comté', 47, 6, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Comte_AOP.jpg/500px-Comte_AOP.jpg'),
  ('Beaufort', 'Ku', 'Fast', 'Beaufort (Savoie)', 45.7181, 6.575, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Beaufort_%28fromage%29_01.jpg/500px-Beaufort_%28fromage%29_01.jpg'),
  ('Abondance', 'Ku', 'Fast', 'Abondance (Haute-Savoie)', 46.2803, 6.7217, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Abondance_%28fromage%29_01.jpg/500px-Abondance_%28fromage%29_01.jpg'),
  ('Emmental de Savoie', 'Ku', 'Fast', 'Savoie', 45.5833, 6.3333, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Emmental_de_Savoie_02.jpg/500px-Emmental_de_Savoie_02.jpg'),
  ('Tomme de Savoie', 'Ku', 'Fast', 'Savoie', 45.5833, 6.3333, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/WikiCheese_-_Tomme_de_Savoie_-_20150619_-_002.jpg/500px-WikiCheese_-_Tomme_de_Savoie_-_20150619_-_002.jpg'),
  ('Tome des Bauges', 'Ku', 'Fast', 'Massif des Bauges', 45.65, 6.15, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Tome_des_Bauges.jpg/500px-Tome_des_Bauges.jpg'),
  ('Raclette de Savoie', 'Ku', 'Fast', 'Savoie', 45.5833, 6.3333, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Raclette_%286300310978%29.jpg/500px-Raclette_%286300310978%29.jpg'),
  ('Cantal', 'Ku', 'Fast', 'Monts du Cantal (Auvergne)', 45.1094, 2.6761, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Wikicheese-XX_-_Cantal_entre-deux_-_20180601_-_002.jpg/500px-Wikicheese-XX_-_Cantal_entre-deux_-_20180601_-_002.jpg'),
  ('Salers', 'Ku', 'Fast', 'Salers (Cantal)', 45.1372, 2.4939, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Salers_%28fromage%29_01.jpg/500px-Salers_%28fromage%29_01.jpg'),
  ('Laguiole', 'Ku', 'Fast', 'Laguiole (Aubrac)', 44.6842, 2.8472, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Laguiole_%28fromage%29_01.jpg/500px-Laguiole_%28fromage%29_01.jpg'),
  ('Morbier', 'Ku', 'Fast', 'Morbier (Jura)', 46.5369, 6.0167, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Morbier_%28fromage%29_01.jpg/500px-Morbier_%28fromage%29_01.jpg'),
  ('Mimolette', 'Ku', 'Fast', 'Lille', 50.6292, 3.0573, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/A_Mimolette_cheese_at_The_Verandah.jpg/500px-A_Mimolette_cheese_at_The_Verandah.jpg'),
  ('Saint-Nectaire', 'Ku', 'Fast', 'Saint-Nectaire (Auvergne)', 45.5881, 2.9928, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Saint-Nectaire.jpg/500px-Saint-Nectaire.jpg'),
  ('Ossau-Iraty', 'Sau', 'Fast', 'Pays basque / Béarn', 43, -1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Fromages_Ossau-Iraty_003.jpg/500px-Fromages_Ossau-Iraty_003.jpg'),
  ('Tomme des Pyrénées', 'Ku', 'Fast', 'Pyrénées', 42.93, 0.65, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Tommes_des_Pyr%C3%A9n%C3%A9es.jpg/500px-Tommes_des_Pyr%C3%A9n%C3%A9es.jpg'),
  ('Bethmale', 'Ku', 'Fast', 'Bethmale (Ariège)', 42.9333, 1.0833, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Wikicheese_-_Bethmale_-_20150417_-_001.jpg/500px-Wikicheese_-_Bethmale_-_20150417_-_001.jpg'),
  ('P''tit Basque', 'Sau', 'Fast', 'Pays basque', 43.35, -1.2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Paris%2C_fromage_Istara_P%27tit_Basque_au_march%C3%A9.JPG/500px-Paris%2C_fromage_Istara_P%27tit_Basque_au_march%C3%A9.JPG'),
  ('Abbaye de Belloc', 'Sau', 'Fast', 'Urt (Pays basque)', 43.49, -1.29, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Abbaye-de-Belloc.JPG/500px-Abbaye-de-Belloc.JPG'),
  ('Tomme de brebis', 'Sau', 'Fast', 'Pyrénées', 43, -0.6, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Wikicheese_-_Roquefort_-_20150417_-_002.jpg/500px-Wikicheese_-_Roquefort_-_20150417_-_002.jpg'),
  ('Emmental français Est-Central', 'Ku', 'Fast', 'Besançon (Franche-Comté)', 47.238, 6.0243, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Emmental_015.jpg/500px-Emmental_015.jpg'),
  ('Gruyère français', 'Ku', 'Fast', 'Pontarlier (Doubs)', 46.9058, 6.3549, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Meules_gruyere.JPG/500px-Meules_gruyere.JPG'),
  ('Roquefort', 'Sau', 'Blå', 'Roquefort-sur-Soulzon', 43.9767, 2.9889, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Wikicheese_-_Roquefort_-_20150417_-_002.jpg/500px-Wikicheese_-_Roquefort_-_20150417_-_002.jpg'),
  ('Bleu d''Auvergne', 'Ku', 'Blå', 'Auvergne', 45.7, 3.1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Wikicheese_Clermont-Ferrand_-_Bleu_d%27Auvergne_20220825-02.jpg/500px-Wikicheese_Clermont-Ferrand_-_Bleu_d%27Auvergne_20220825-02.jpg'),
  ('Bleu des Causses', 'Ku', 'Blå', 'Causses (Aveyron)', 44.25, 2.7, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/WikiCheese_-_Bleu_des_Causses_-_20150619_-_001.jpg/500px-WikiCheese_-_Bleu_des_Causses_-_20150619_-_001.jpg'),
  ('Fourme d''Ambert', 'Ku', 'Blå', 'Ambert', 45.5494, 3.7417, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Wikicheese_Clermont-Ferrand_-_Fourme_d%27Ambert_20220825-01.jpg/500px-Wikicheese_Clermont-Ferrand_-_Fourme_d%27Ambert_20220825-01.jpg'),
  ('Fourme de Montbrison', 'Ku', 'Blå', 'Montbrison', 45.6075, 4.0653, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikicheese_-_Fourme_de_Montbrison_-_20151024_-_012.jpg/500px-Wikicheese_-_Fourme_de_Montbrison_-_20151024_-_012.jpg'),
  ('Bleu de Gex', 'Ku', 'Blå', 'Gex (Haut-Jura)', 46.3331, 6.0578, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Bleu_de_Gex.jpg/500px-Bleu_de_Gex.jpg'),
  ('Bleu du Vercors-Sassenage', 'Ku', 'Blå', 'Sassenage (Vercors)', 45.205, 5.665, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Bleu_du_Vercors_-_coup%C3%A9_-_juil_2019.jpg/500px-Bleu_du_Vercors_-_coup%C3%A9_-_juil_2019.jpg'),
  ('Bleu de Termignon', 'Ku', 'Blå', 'Termignon (Savoie)', 45.2775, 6.8169, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Bleu_de_Termignon_lors_du_Wikicheese_du_26_f%C3%A9vrier_2016_18.JPG/500px-Bleu_de_Termignon_lors_du_Wikicheese_du_26_f%C3%A9vrier_2016_18.JPG'),
  ('Bleu de Bresse', 'Ku', 'Blå', 'Bresse', 46.3, 5.2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bleu_de_Bresse_cheese.jpg/500px-Bleu_de_Bresse_cheese.jpg'),
  ('Bleu de Laqueuille', 'Ku', 'Blå', 'Laqueuille (Auvergne)', 45.65, 2.7325, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Wikicheese_Clermont-Ferrand_-_Bleu_de_Laqueuille_20220825-01.jpg/500px-Wikicheese_Clermont-Ferrand_-_Bleu_de_Laqueuille_20220825-01.jpg'),
  ('Saint-Agur', 'Ku', 'Blå', 'Beauzac (Auvergne)', 45.2597, 4.0989, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/SaintAgurCheese.jpg/500px-SaintAgurCheese.jpg'),
  ('Bleu des Basques', 'Sau', 'Blå', 'Pays basque', 43.3, -1, 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Bleu_des_Basque_brebis_3.png'),
  ('Banon', 'Geit', 'Myk', 'Banon (Provence)', 44.0381, 5.6281, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Banon_02.jpg/500px-Banon_02.jpg'),
  ('Crottin de Chavignol', 'Geit', 'Myk', 'Chavignol (Sancerre)', 47.3375, 2.7983, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Crottin_02.jpg/500px-Crottin_02.jpg'),
  ('Sainte-Maure de Touraine', 'Geit', 'Myk', 'Sainte-Maure-de-Touraine', 47.1122, 0.6211, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Sainte-Maure_de_touraine_01.jpg/500px-Sainte-Maure_de_touraine_01.jpg'),
  ('Valençay', 'Geit', 'Myk', 'Valençay', 47.1606, 1.5661, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Valen%C3%A7ay_04.jpg/500px-Valen%C3%A7ay_04.jpg'),
  ('Selles-sur-Cher', 'Geit', 'Myk', 'Selles-sur-Cher', 47.2756, 1.5547, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Selles04.jpg/500px-Selles04.jpg'),
  ('Pouligny-Saint-Pierre', 'Geit', 'Myk', 'Pouligny-Saint-Pierre', 46.6808, 1.0392, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Pouligny-saint-pierre_%28fromage%29_03.jpg/500px-Pouligny-saint-pierre_%28fromage%29_03.jpg'),
  ('Chabichou du Poitou', 'Geit', 'Myk', 'Poitou', 46.6486, -0.2478, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Chabichou_du_Poitou_04.jpg/500px-Chabichou_du_Poitou_04.jpg'),
  ('Rocamadour', 'Geit', 'Myk', 'Rocamadour', 44.7994, 1.6178, 'https://upload.wikimedia.org/wikipedia/commons/9/90/Rocamadour_AOP.jpg'),
  ('Cabécou', 'Geit', 'Myk', 'Quercy', 44.2667, 1.6333, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Cab%C3%A9cou_de_l%27Aveyron.JPG/500px-Cab%C3%A9cou_de_l%27Aveyron.JPG'),
  ('Picodon', 'Geit', 'Myk', 'Drôme / Ardèche', 44.75, 4.8, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Wikicheese_-_Picodon_-_20150417_-_003.jpg/500px-Wikicheese_-_Picodon_-_20150417_-_003.jpg'),
  ('Pélardon', 'Geit', 'Myk', 'Cévennes', 44.12, 3.9, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/P%C3%A9lardon_02.jpg/500px-P%C3%A9lardon_02.jpg'),
  ('Chevrotin', 'Geit', 'Myk', 'Haute-Savoie', 45.88, 6.33, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Chevrotin_des_Aravis_%28avril_2021%29_-_2.jpg/500px-Chevrotin_des_Aravis_%28avril_2021%29_-_2.jpg'),
  ('Charolais', 'Geit', 'Myk', 'Charolles (Bourgogne)', 46.4353, 4.2758, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Fromage_charolais.jpg/500px-Fromage_charolais.jpg'),
  ('Mâconnais', 'Geit', 'Myk', 'Mâcon', 46.3069, 4.8286, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Wikicheese_-_M%C3%A2connais_-_20150417_-_001.jpg/500px-Wikicheese_-_M%C3%A2connais_-_20150417_-_001.jpg'),
  ('Rigotte de Condrieu', 'Geit', 'Myk', 'Condrieu', 45.4633, 4.7683, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/WikiCheese_-_Rigotte_de_Condrieu_-_20150619_-_001.jpg/500px-WikiCheese_-_Rigotte_de_Condrieu_-_20150619_-_001.jpg'),
  ('Mothais sur feuille', 'Geit', 'Myk', 'La Mothe-Saint-Héray', 46.3536, -0.1103, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Mothais_sur_feuille.jpg/500px-Mothais_sur_feuille.jpg'),
  ('Bouton de Culotte', 'Geit', 'Myk', 'Mâconnais', 46.3069, 4.8286, null),
  ('Brousse du Rove', 'Geit', 'Fersk', 'Le Rove (Provence)', 43.3692, 5.2506, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Brousse_du_Rove_01666.jpg/500px-Brousse_du_Rove_01666.jpg'),
  ('Tomme de Provence', 'Geit', 'Myk', 'Provence', 43.9, 6, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Tomme_de_Provence_dans_une_fromagerie_d%27Arles.jpg/500px-Tomme_de_Provence_dans_une_fromagerie_d%27Arles.jpg'),
  ('Poivre d''âne', 'Geit', 'Myk', 'Provence', 43.9, 5.8, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Poivre_d%27ane_et_AOC_Ventoux.jpg/500px-Poivre_d%27ane_et_AOC_Ventoux.jpg'),
  ('Bûche de chèvre', 'Geit', 'Myk', 'Poitou', 46.6486, -0.2478, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Principales_AOC_France.jpg/500px-Principales_AOC_France.jpg'),
  ('Brocciu', 'Sau', 'Fersk', 'Korsika', 42.15, 9.0833, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Brocciu2.jpg/500px-Brocciu2.jpg'),
  ('Brin d''Amour', 'Sau', 'Myk', 'Korsika', 42.3, 9.15, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Wikicheese_-_Fleur_du_Maquis_-_20150417_-_005.jpg/500px-Wikicheese_-_Fleur_du_Maquis_-_20150417_-_005.jpg'),
  ('Pérail', 'Sau', 'Myk', 'Larzac', 43.98, 3.2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Cheese_P%C3%A9rail.jpg/500px-Cheese_P%C3%A9rail.jpg'),
  ('Fontainebleau', 'Ku', 'Fersk', 'Fontainebleau', 48.4047, 2.7016, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Fontainebleau_avec_du_brownie.jpg/500px-Fontainebleau_avec_du_brownie.jpg'),
  ('Petit-Suisse', 'Ku', 'Fersk', 'Gournay-en-Bray (Normandie)', 49.4822, 1.7253, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Petit-suisse_assiette.jpg/500px-Petit-suisse_assiette.jpg'),
  ('Boursin', 'Ku', 'Fersk', 'Croisy-sur-Eure (Normandie)', 49.0167, 1.3833, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Boursin-cheese-3494_1280.jpg/500px-Boursin-cheese-3494_1280.jpg'),
  ('La vache qui rit', 'Ku', null, 'Lons-le-Saunier (Jura)', 46.6744, 5.5539, null),
  ('Kiri', 'Ku', 'Fersk', 'Lons-le-Saunier (Jura)', 46.6744, 5.5539, null),
  ('Cancoillotte', 'Ku', 'Fersk', 'Franche-Comté', 47, 6, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Cancoillotte_001.jpg/500px-Cancoillotte_001.jpg'),
  ('Tome fraîche de l''Aubrac', 'Ku', 'Fersk', 'Laguiole (Aubrac)', 44.6842, 2.8472, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Tome_fra%C3%AEche.jpg/500px-Tome_fra%C3%AEche.jpg')
on conflict (name) do nothing;

-- Intern normaliseringshjelper for navnematching (samme idé som klientens
-- fold() i index.html: små bokstaver, fjern aksenter/apostrof/bindestrek,
-- kollaps mellomrom). Ikke gitt til anon/authenticated — kalles kun internt
-- fra andre security-definer-funksjoner nedenfor, samme mønster som
-- flayost_check.
create or replace function public.flayost_fold(s text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    regexp_replace(
      translate(lower(coalesce(s,'')),
        'àâäáãåéèêëíìîïóòôöõúùûüýÿçñœæ',
        'aaaaaaeeeeiiiiooooouuuuyycnoa'),
      '[-''.]', ' ', 'g'
    ), '\s+', ' ', 'g'
  ));
$$;
revoke all on function public.flayost_fold(text) from public, anon, authenticated;

-- Autocomplete i «Ny ost»: maks 8 treff, aldri hele katalogen. Prefiks-treff
-- før substreng-treff, samme prioritering som klientens gamle cheeseSuggest().
create or replace function public.flayost_cheese_search(p_name text, p_pin text, p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f text := public.flayost_fold(p_query);
begin
  if not public.flayost_check(p_name, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  if v_f is null or length(v_f) < 2 then
    return jsonb_build_object('ok', true, 'hits', '[]'::jsonb);
  end if;
  return jsonb_build_object('ok', true, 'hits', coalesce((
    select jsonb_agg((to_jsonb(t) - 'rn') order by t.rn)
    from (
      select name, milk, tex, origin, lat, lng, img,
        row_number() over (order by (public.flayost_fold(name) like v_f || '%') desc, name) as rn
      from public.flayost_cheese_species
      where public.flayost_fold(name) like '%' || v_f || '%'
      order by (public.flayost_fold(name) like v_f || '%') desc, name
      limit 8
    ) t
  ), '[]'::jsonb));
end;
$$;

-- «Kort»-fanen: ett kort per FAMILIE-ost (variant-navnet «Comté (24 mnd)»
-- telles som samme kort som «Comté» — man samler arten, ikke hver dom).
-- matched=false gir en generisk kort-plassholder på klienten + havner i
-- flayost_cheese_unmatched_list for admin til kurering.
create or replace function public.flayost_cheese_cards(p_name text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_e2e boolean := trim(p_name) like 'E2E %';
begin
  if not public.flayost_check(p_name, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  return jsonb_build_object('ok', true, 'cards', coalesce((
    select jsonb_agg(jsonb_build_object(
      'base_name', b.base_name,
      'matched', s.name is not null,
      'species_name', s.name, 'milk', s.milk, 'tex', s.tex,
      'origin', s.origin, 'img', s.img
    ) order by b.base_name)
    from (
      select distinct trim(regexp_replace(name, '\s*\([^)]*\)\s*$', '')) as base_name
      from public.flayost_cheeses
      where v_show_e2e or (name not like 'E2E %' and added_by not like 'E2E %')
    ) b
    left join public.flayost_cheese_species s
      on public.flayost_fold(s.name) = public.flayost_fold(b.base_name)
  ), '[]'::jsonb));
end;
$$;

-- Admin-verktøy: hvilke ekte familie-oster matcher IKKE katalogen ennå?
-- (Samme grunnlag for «flagget for kurering» — ingen egen tabell/kø, alltid
-- utledet live, så et senere katalog-tillegg umiddelbart fjerner en ost
-- herfra uten noen manuell opprydding.)
create or replace function public.flayost_cheese_unmatched_list(p_name text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.flayost_check(p_name, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  if not coalesce((select is_admin from public.flayost_members where name = trim(p_name)), false) then
    return jsonb_build_object('ok', false, 'error', 'adults_only');
  end if;
  return jsonb_build_object('ok', true, 'unmatched', coalesce((
    select jsonb_agg(u.base_name order by u.base_name)
    from (
      select distinct trim(regexp_replace(c.name, '\s*\([^)]*\)\s*$', '')) as base_name
      from public.flayost_cheeses c
      where c.name not like 'E2E %' and c.added_by not like 'E2E %'
    ) u
    where not exists (
      select 1 from public.flayost_cheese_species s
      where public.flayost_fold(s.name) = public.flayost_fold(u.base_name)
    )
  ), '[]'::jsonb));
end;
$$;

-- get_board bærer nå også catalog_count — «X/~94 oppdaget»-telleren i Kort-
-- fanen, uten at klienten noensinne ser radene bak tallet.
create or replace function public.flayost_get_board(p_name text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_e2e boolean := trim(p_name) like 'E2E %';
begin
  if not public.flayost_check(p_name, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  return jsonb_build_object(
    'ok', true,
    'catalog_count', (select count(*) from public.flayost_cheese_species),
    'members', coalesce((select jsonb_agg(jsonb_build_object(
        'name', name, 'avatar', avatar, 'is_kid', is_kid, 'is_admin', is_admin,
        'family', family) order by created_at)
      from public.flayost_members where v_show_e2e or name not like 'E2E %'), '[]'::jsonb),
    'cheeses', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'type', type, 'photo', photo,
        'added_by', added_by, 'created_at', created_at,
        'origin', origin, 'lat', lat, 'lng', lng, 'round_id', round_id) order by created_at desc)
      from public.flayost_cheeses
      where v_show_e2e or (name not like 'E2E %' and added_by not like 'E2E %')), '[]'::jsonb),
    'ratings', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'score', score,
        'note', note, 'updated_at', updated_at,
        'first_score', first_score, 'changes', changes))
      from public.flayost_ratings where v_show_e2e or member not like 'E2E %'), '[]'::jsonb),
    'stinks', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'stink', stink,
        'updated_at', updated_at))
      from public.flayost_stinks where v_show_e2e or member not like 'E2E %'), '[]'::jsonb),
    'round', (select jsonb_build_object('id', id, 'started_by', started_by, 'started_at', started_at)
              from public.flayost_rounds
              where active and (v_show_e2e or started_by not like 'E2E %') limit 1)
  );
end;
$$;

revoke all on function public.flayost_cheese_search(text, text, text) from public;
revoke all on function public.flayost_cheese_cards(text, text) from public;
revoke all on function public.flayost_cheese_unmatched_list(text, text) from public;
grant execute on function public.flayost_cheese_search(text, text, text) to anon, authenticated;
grant execute on function public.flayost_cheese_cards(text, text) to anon, authenticated;
grant execute on function public.flayost_cheese_unmatched_list(text, text) to anon, authenticated;
