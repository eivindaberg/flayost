-- Hvem-er-du-lista på innloggingsskjermen. Åpen for anon slik at en helt
-- fersk enhet (ny nettleser eller nytt domene, tom localStorage) kan vise
-- familiens smakere før noen har logget inn. Returnerer kun navn + figur —
-- aldri PIN-er eller annet.
create or replace function public.flayost_who()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('name', name, 'avatar', avatar) order by created_at),
    '[]'::jsonb)
  from public.flayost_members;
$$;
grant execute on function public.flayost_who() to anon, authenticated;
