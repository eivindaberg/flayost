-- Admin-rolle: sletting begrenses til de fire kjente voksne i kjernefamilien
-- (Eivind, Ida, Fredrik — og Bjørg når hun registrerer seg). Nye voksne fra
-- storfamilien får IKKE sletterett automatisk; de kan smake og dømme som alle
-- andre. Feilkoden 'adults_only' beholdes så gamle klienter viser riktig melding.

alter table public.flayost_members add column if not exists is_admin boolean not null default false;
update public.flayost_members set is_admin = true where name in ('Eivind','Ida','Fredrik','Bjørg');

-- login: returnerer is_admin (og fortsatt aldri PIN-er). Bjørg er forhånds-
-- godkjent som den fjerde voksne og får admin ved første registrering.
create or replace function public.flayost_login(
  p_name text, p_pin text, p_avatar text default null, p_is_kid boolean default null,
  p_create boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(p_name);
  m public.flayost_members;
begin
  if v_name = '' or p_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into m from public.flayost_members where lower(name) = lower(v_name);
  if not found then
    if not p_create then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    insert into public.flayost_members(name, pin, avatar, is_kid, is_admin)
    values (v_name, p_pin, coalesce(p_avatar, '🧀'), coalesce(p_is_kid, true),
            lower(v_name) = 'bjørg')
    returning * into m;
    return jsonb_build_object('ok', true, 'created', true,
      'member', jsonb_build_object('name', m.name, 'avatar', m.avatar,
                                   'is_kid', m.is_kid, 'is_admin', m.is_admin));
  end if;
  if m.pin <> p_pin then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  if p_avatar is not null and p_avatar <> m.avatar then
    update public.flayost_members set avatar = p_avatar where name = m.name
    returning * into m;
  end if;
  return jsonb_build_object('ok', true, 'created', false,
    'member', jsonb_build_object('name', m.name, 'avatar', m.avatar,
                                 'is_kid', m.is_kid, 'is_admin', m.is_admin));
end;
$$;

-- get_board: members bærer is_admin (klienten styrer sletteknappen med den)
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
        'name', name, 'avatar', avatar, 'is_kid', is_kid, 'is_admin', is_admin) order by created_at)
      from public.flayost_members), '[]'::jsonb),
    'cheeses', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'type', type, 'photo', photo,
        'added_by', added_by, 'created_at', created_at,
        'origin', origin, 'lat', lat, 'lng', lng) order by created_at desc)
      from public.flayost_cheeses), '[]'::jsonb),
    'ratings', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'score', score,
        'note', note, 'updated_at', updated_at))
      from public.flayost_ratings), '[]'::jsonb),
    'stinks', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'stink', stink,
        'updated_at', updated_at))
      from public.flayost_stinks), '[]'::jsonb)
  );
end;
$$;

-- sletting: kun admin (før: alle voksne)
create or replace function public.flayost_delete_cheese(p_name text, p_pin text, p_cheese_id uuid)
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
  delete from public.flayost_cheeses where id = p_cheese_id;
  return jsonb_build_object('ok', true);
end;
$$;
