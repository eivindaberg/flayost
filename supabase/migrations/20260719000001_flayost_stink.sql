-- Stinkometeret 💨 — hvor mye lukter osten? Egen én-trykks skala 1–5
-- (5 = «RUMPE!») ved siden av smaksdommen. Egen tabell, ikke kolonne på
-- flayost_ratings, så man kan lukte på en ost uten å ha smakt den.

create table if not exists public.flayost_stinks (
  cheese_id  uuid not null references public.flayost_cheeses(id) on delete cascade,
  member     text not null references public.flayost_members(name),
  stink      int  not null check (stink between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (cheese_id, member)
);
alter table public.flayost_stinks enable row level security;
revoke all on public.flayost_stinks from anon, authenticated;

create or replace function public.flayost_stink(
  p_name text, p_pin text, p_cheese_id uuid, p_stink int
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
  if p_stink not between 1 and 5 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  -- ok:false (ikke exception) når osten er slettet, så offline-køen dropper den
  if not exists (select 1 from public.flayost_cheeses where id = p_cheese_id) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  insert into public.flayost_stinks(cheese_id, member, stink, updated_at)
  values (p_cheese_id, trim(p_name), p_stink, now())
  on conflict (cheese_id, member) do update
    set stink = excluded.stink, updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.flayost_stink(text, text, uuid, int) from public;
grant execute on function public.flayost_stink(text, text, uuid, int) to anon, authenticated;

-- get_board leverer stinkdommene også. Gamle klienter ignorerer nøkkelen.
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
      from public.flayost_ratings), '[]'::jsonb),
    'stinks', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'stink', stink,
        'updated_at', updated_at))
      from public.flayost_stinks), '[]'::jsonb)
  );
end;
$$;
