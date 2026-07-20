-- Testdata skal ALDRI kunne nå familiens skjerm. Testsuitene (tests/) skriver
-- utelukkende rader med navn som starter på «E2E » mot PRODUKSJONS-basen (det
-- er samme prosjekt appen bruker — ingen egen testinstans), og rydder normalt
-- opp selv. 2026-07-20: flere direkte kjøringer av én enkelt testfil under
-- feilsøking omgikk opprydningen i tests/run.sh, og tolv E2E-oster dukket opp
-- øverst på tavla til familien.
--
-- I stedet for å stole på at opprydding alltid skjer, filtrerer vi «E2E »-
-- prefikset navn bort på server-siden: hvis en fremtidig testkjøring glemmer
-- å rydde opp, ser familien det uansett aldri.
--
-- flayost_who() har ingen innlogget bruker å skille på (den kalles FØR
-- innlogging, til navnelista på startskjermen) — der filtreres E2E
-- ubetinget bort. flayost_get_board() derimot filtrerer kun når INNRINGEREN
-- selv ikke er en E2E-konto — slik kan testene fortsatt logge inn SOM en
-- E2E-bruker og se sin egen testdata i responsen (nødvendig for at
-- tests/smoke-*.js skal kunne verifisere RPC-oppførsel), mens en ekte
-- familiemedlem (som aldri heter «E2E …») alltid får en ren tavle.
create or replace function public.flayost_who()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('name', name, 'avatar', avatar, 'family', family) order by created_at),
    '[]'::jsonb)
  from public.flayost_members
  where name not like 'E2E %';
$$;

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
