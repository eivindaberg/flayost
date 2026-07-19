-- Angre: fjern sin EGEN dom (eller stinkdom) på en ost — for når noen har
-- trykket på feil ost uten å ha smakt den. PIN-sjekket; man kan aldri fjerne
-- andres dommer. Osten går tilbake til «ikke smakt» for medlemmet.
create or replace function public.flayost_unrate(
  p_name text, p_pin text, p_cheese_id uuid, p_stink boolean default false
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
  if p_stink then
    delete from public.flayost_stinks where cheese_id = p_cheese_id and member = trim(p_name);
  else
    delete from public.flayost_ratings where cheese_id = p_cheese_id and member = trim(p_name);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.flayost_unrate(text, text, uuid, boolean) to anon, authenticated;
