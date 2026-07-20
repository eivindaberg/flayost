-- Smakerunde 🥣 — en admin starter en fokusert runde (typisk 3 oster på
-- bordet), og alt en unge da ser er de ostene som hører til DENNE runden —
-- ikke hele tavla, kartet, passet eller «For deg». Løser at ungene bruker
-- iPaden til å utforske appen i stedet for å smake og dømme ved frokosten.
--
-- Design: kun ÉN runde kan være aktiv om gangen (partial unique index).
-- flayost_add_cheese tagger automatisk nye oster med den aktive runden —
-- det er slik ungene kan «registrere sine egne oster» og likevel bare se
-- akkurat de(n) runden gjelder. En admin kan i tillegg dra inn en allerede
-- registrert ost (f.eks. rester fra sist) via flayost_round_add_existing.

create table if not exists public.flayost_rounds (
  id         uuid primary key default gen_random_uuid(),
  active     boolean not null default true,
  started_by text not null references public.flayost_members(name),
  started_at timestamptz not null default now(),
  ended_at   timestamptz
);
create unique index if not exists flayost_rounds_one_active
  on public.flayost_rounds (active) where active;

alter table public.flayost_cheeses add column if not exists round_id uuid references public.flayost_rounds(id);

alter table public.flayost_rounds enable row level security;
revoke all on public.flayost_rounds from anon, authenticated;

-- Start runde: kun admin. Avslutter automatisk en evt. hengende aktiv runde
-- først (selvreparerende), tagger ev. valgte eksisterende oster med runden.
create or replace function public.flayost_round_start(
  p_name text, p_pin text, p_cheese_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.flayost_rounds;
begin
  if not public.flayost_check(p_name, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  if not coalesce((select is_admin from public.flayost_members where name = trim(p_name)), false) then
    return jsonb_build_object('ok', false, 'error', 'adults_only');
  end if;
  update public.flayost_rounds set active = false, ended_at = now() where active;
  insert into public.flayost_rounds(started_by) values (trim(p_name)) returning * into v_round;
  if array_length(p_cheese_ids, 1) > 0 then
    update public.flayost_cheeses set round_id = v_round.id where id = any(p_cheese_ids);
  end if;
  return jsonb_build_object('ok', true, 'round',
    jsonb_build_object('id', v_round.id, 'started_by', v_round.started_by, 'started_at', v_round.started_at));
end;
$$;

-- Avslutt runde: kun admin.
create or replace function public.flayost_round_end(p_name text, p_pin text)
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
  update public.flayost_rounds set active = false, ended_at = now() where active;
  return jsonb_build_object('ok', true);
end;
$$;

-- Dra en allerede registrert ost inn i den aktive runden (f.eks. rester fra
-- sist). Kun admin; feiler stille (ok:false) hvis ingen runde er aktiv.
create or replace function public.flayost_round_add_existing(p_name text, p_pin text, p_cheese_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_id uuid;
begin
  if not public.flayost_check(p_name, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  if not coalesce((select is_admin from public.flayost_members where name = trim(p_name)), false) then
    return jsonb_build_object('ok', false, 'error', 'adults_only');
  end if;
  select id into v_round_id from public.flayost_rounds where active limit 1;
  if v_round_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_active_round');
  end if;
  update public.flayost_cheeses set round_id = v_round_id where id = p_cheese_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.flayost_round_start(text, text, uuid[]) to anon, authenticated;
grant execute on function public.flayost_round_end(text, text) to anon, authenticated;
grant execute on function public.flayost_round_add_existing(text, text, uuid) to anon, authenticated;

-- add_cheese tagger automatisk med aktiv runde (så nyregistrerte oster
-- automatisk blir synlige i den fokuserte rundevisningen).
create or replace function public.flayost_add_cheese(
  p_name text, p_pin text, p_cheese_name text, p_type text, p_photo text default null,
  p_origin text default '', p_lat double precision default null, p_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_round_id uuid;
begin
  if not public.flayost_check(p_name, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  if trim(p_cheese_name) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if p_photo is not null and length(p_photo) > 300000 then
    return jsonb_build_object('ok', false, 'error', 'photo_too_big');
  end if;
  select id into v_round_id from public.flayost_rounds where active limit 1;
  insert into public.flayost_cheeses(name, type, photo, added_by, origin, lat, lng, round_id)
  values (trim(p_cheese_name), coalesce(p_type, ''), p_photo, trim(p_name),
          coalesce(p_origin, ''), p_lat, p_lng, v_round_id)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- get_board: hver ost bærer round_id, og et toppnivå-felt «round» beskriver
-- den aktive runden (null når ingen runde pågår).
create or replace function public.flayost_get_board(p_name text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.flayost_check(p_name, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  return jsonb_build_object(
    'ok', true,
    'members', coalesce((select jsonb_agg(jsonb_build_object(
        'name', name, 'avatar', avatar, 'is_kid', is_kid, 'is_admin', is_admin,
        'family', family) order by created_at)
      from public.flayost_members), '[]'::jsonb),
    'cheeses', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'type', type, 'photo', photo,
        'added_by', added_by, 'created_at', created_at,
        'origin', origin, 'lat', lat, 'lng', lng, 'round_id', round_id) order by created_at desc)
      from public.flayost_cheeses), '[]'::jsonb),
    'ratings', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'score', score,
        'note', note, 'updated_at', updated_at,
        'first_score', first_score, 'changes', changes))
      from public.flayost_ratings), '[]'::jsonb),
    'stinks', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'stink', stink,
        'updated_at', updated_at))
      from public.flayost_stinks), '[]'::jsonb),
    'round', (select jsonb_build_object('id', id, 'started_by', started_by, 'started_at', started_at)
              from public.flayost_rounds where active limit 1)
  );
end;
$$;
