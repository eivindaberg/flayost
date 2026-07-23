-- E2E-filtreringen matchet kun «E2E » (med mellomrom). smoke-e2ehidden.js
-- oppretter bevisst et medlem kalt «E2E-utenom Fam» (bindestrek, IKKE
-- mellomrom) for å late som et EKTE medlem i én av testens sjekker — men det
-- navnet begynner fortsatt på «E2E», og siden 2026-07-20 har det derfor stått
-- synlig på familiens innloggingsskjerm hele tiden: verken serverfilteret
-- under, klientens stripE2E()/loadWho() i index.html, eller opprydding i
-- tests/run.sh fanget det opp (alle tre matchet kun det strengere
-- mellomroms-mønsteret).
--
-- Fix: bytt fra 'E2E %' til 'E2E%' overalt på serversiden (fanger ALT som
-- begynner på E2E, uansett hva som følger). index.html og tests/run.sh
-- oppdateres til samme, bredere mønster i samme commit. smoke-e2ehidden.js
-- sitt «late som en ekte bruker»-medlem må nå hete noe som IKKE begynner på
-- E2E i det hele tatt (ellers hadde broaden gjort at DET medlemmet også fikk
-- v_show_e2e=true og dermed sett andre E2E-testeres søppel — som ville
-- ødelagt akkurat det testen skal bevise).

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
  where name not like 'E2E%';
$$;

create or replace function public.flayost_cheese_cards(p_name text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_e2e boolean := trim(p_name) like 'E2E%';
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
      where v_show_e2e or (name not like 'E2E%' and added_by not like 'E2E%')
    ) b
    left join public.flayost_cheese_species s
      on public.flayost_fold(s.name) = public.flayost_fold(b.base_name)
  ), '[]'::jsonb));
end;
$$;

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
      where c.name not like 'E2E%' and c.added_by not like 'E2E%'
    ) u
    where not exists (
      select 1 from public.flayost_cheese_species s
      where public.flayost_fold(s.name) = public.flayost_fold(u.base_name)
    )
  ), '[]'::jsonb));
end;
$$;

create or replace function public.flayost_get_board(p_name text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_e2e boolean := trim(p_name) like 'E2E%';
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
      from public.flayost_members where v_show_e2e or name not like 'E2E%'), '[]'::jsonb),
    'cheeses', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'type', type, 'photo', photo,
        'added_by', added_by, 'created_at', created_at,
        'origin', origin, 'lat', lat, 'lng', lng, 'round_id', round_id) order by created_at desc)
      from public.flayost_cheeses
      where v_show_e2e or (name not like 'E2E%' and added_by not like 'E2E%')), '[]'::jsonb),
    'ratings', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'score', score,
        'note', note, 'updated_at', updated_at,
        'first_score', first_score, 'changes', changes))
      from public.flayost_ratings where v_show_e2e or member not like 'E2E%'), '[]'::jsonb),
    'stinks', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'stink', stink,
        'updated_at', updated_at))
      from public.flayost_stinks where v_show_e2e or member not like 'E2E%'), '[]'::jsonb),
    'round', (select jsonb_build_object('id', id, 'started_by', started_by, 'started_at', started_at)
              from public.flayost_rounds
              where active and (v_show_e2e or started_by not like 'E2E%') limit 1)
  );
end;
$$;
