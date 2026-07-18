-- Rette/legge til sted på en ost i etterkant (alle i familien kan) —
-- brukes av «📍 endre sted» i detaljarket, med geokoding i klienten.

create or replace function public.flayost_set_origin(
  p_name text, p_pin text, p_cheese_id uuid,
  p_origin text, p_lat double precision default null, p_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.flayost_check(p_name, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  update public.flayost_cheeses
     set origin = trim(coalesce(p_origin, '')), lat = p_lat, lng = p_lng
   where id = p_cheese_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.flayost_set_origin(text, text, uuid, text, double precision, double precision) from public;
grant execute on function public.flayost_set_origin(text, text, uuid, text, double precision, double precision) to anon, authenticated;
