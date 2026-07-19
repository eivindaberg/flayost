-- Meningshistorikk: husk FØRSTE dom og antall ombestemmelser per (ost, medlem),
-- så merker som «Snudd!» (🤢 først → 🤩 nå) og «Berg-og-dal-bane» (ombestemt
-- 3+ ganger) kan regnes ut. Eksisterende dommer får first_score = dagens dom.

alter table public.flayost_ratings add column if not exists first_score int;
alter table public.flayost_ratings add column if not exists changes int not null default 0;
update public.flayost_ratings set first_score = score where first_score is null;

create or replace function public.flayost_rate(
  p_name text, p_pin text, p_cheese_id uuid, p_score int, p_note text default ''
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
  if p_score not between 1 and 5 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  insert into public.flayost_ratings(cheese_id, member, score, note, updated_at, first_score, changes)
  values (p_cheese_id, trim(p_name), p_score, coalesce(p_note, ''), now(), p_score, 0)
  on conflict (cheese_id, member) do update
    set changes = public.flayost_ratings.changes
                  + (case when public.flayost_ratings.score <> excluded.score then 1 else 0 end),
        score = excluded.score, note = excluded.note, updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

-- get_board: ratings bærer first_score og changes
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
        'note', note, 'updated_at', updated_at,
        'first_score', first_score, 'changes', changes))
      from public.flayost_ratings), '[]'::jsonb),
    'stinks', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'stink', stink,
        'updated_at', updated_at))
      from public.flayost_stinks), '[]'::jsonb)
  );
end;
$$;
