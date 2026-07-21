-- Fiks feil bilde på «Bûche de chèvre» i ostekatalogen: raden pekte ved en
-- transkripsjonsfeil på et Wikimedia-kart over franske AOC-regioner
-- («Principales_AOC_France.jpg»), ikke et bilde av osten selv. Bytter til
-- et ekte, verifisert bilde av en bûche de chèvre (CC BY-SA 4.0, samme
-- upload.wikimedia.org/.../thumb/-mønster som resten av katalogen).
update public.flayost_cheese_species
set img = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/B%C3%BBche_de_Ch%C3%A8vre.jpg/500px-B%C3%BBche_de_Ch%C3%A8vre.jpg'
where name = 'Bûche de chèvre';
