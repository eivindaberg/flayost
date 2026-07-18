-- Flayost: hvor kommer osten fra? Opprinnelsessted + koordinater for kartvisning,
-- fylles inn av oppslag mot osteregistre når man legger til en ost.

alter table public.flayost_cheeses add column if not exists origin text not null default '';
alter table public.flayost_cheeses add column if not exists lat double precision;
alter table public.flayost_cheeses add column if not exists lng double precision;

-- Ny signatur med valgfrie opprinnelsesfelter. Gamle klienter (cachede utgaver av
-- index.html) kaller fortsatt med 5 argumenter — defaultene tar resten.
drop function if exists public.flayost_add_cheese(text, text, text, text, text);

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
  insert into public.flayost_cheeses(name, type, photo, added_by, origin, lat, lng)
  values (trim(p_cheese_name), coalesce(p_type, ''), p_photo, trim(p_name),
          coalesce(p_origin, ''), p_lat, p_lng)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.flayost_add_cheese(text, text, text, text, text, text, double precision, double precision) from public;
grant execute on function public.flayost_add_cheese(text, text, text, text, text, text, double precision, double precision) to anon, authenticated;

-- get_board leverer de nye feltene også.
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
        'name', name, 'avatar', avatar, 'is_kid', is_kid) order by created_at)
      from public.flayost_members), '[]'::jsonb),
    'cheeses', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'type', type, 'photo', photo,
        'added_by', added_by, 'created_at', created_at,
        'origin', origin, 'lat', lat, 'lng', lng) order by created_at desc)
      from public.flayost_cheeses), '[]'::jsonb),
    'ratings', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'score', score,
        'note', note, 'updated_at', updated_at))
      from public.flayost_ratings), '[]'::jsonb)
  );
end;
$$;
