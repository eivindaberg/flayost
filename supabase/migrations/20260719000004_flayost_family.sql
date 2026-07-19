-- Familiegrupper: hvert medlem kan tilhøre en husstand/gruppe (fritekst,
-- f.eks. «Hytta i Flayosc», «Oslo-gjengen»). Selvbetjent via egen RPC —
-- man setter bare sin egen gruppe (PIN-sjekket). Ingen medlemmer grupperes
-- automatisk; alle velger selv på «Min side».

alter table public.flayost_members add column if not exists family text;

create or replace function public.flayost_set_family(p_name text, p_pin text, p_family text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family text := nullif(trim(coalesce(p_family,'')), '');
begin
  if not public.flayost_check(p_name, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  if length(coalesce(v_family,'')) > 30 then
    return jsonb_build_object('ok', false, 'error', 'too_long');
  end if;
  update public.flayost_members set family = v_family where name = trim(p_name);
  return jsonb_build_object('ok', true, 'family', v_family);
end;
$$;
grant execute on function public.flayost_set_family(text, text, text) to anon, authenticated;

-- who-lista bærer family så innloggingsskjermen kan gruppere knappene
create or replace function public.flayost_who()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('name', name, 'avatar', avatar, 'family', family) order by created_at),
    '[]'::jsonb)
  from public.flayost_members;
$$;

-- get_board: members bærer family også
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
