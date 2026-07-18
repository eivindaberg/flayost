-- Flayost 🧀 — family cheese rating (Vivino for fransk ost).
-- Same security model as Mattespill: no real accounts — name + 4-digit PIN is the key.
-- Tables are fully locked down; all access goes through the security-definer RPCs
-- below, so the public anon key can never read or write the tables directly.
-- Tables are prefixed flayost_ because they share the Supabase project with Mattespill.

create table if not exists public.flayost_members (
  name       text primary key,
  pin        text not null,
  avatar     text not null default '🧀',
  is_kid     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.flayost_cheeses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null default '',
  photo      text,            -- small JPEG data-URL thumbnail, or null
  added_by   text not null references public.flayost_members(name),
  created_at timestamptz not null default now()
);

create table if not exists public.flayost_ratings (
  cheese_id  uuid not null references public.flayost_cheeses(id) on delete cascade,
  member     text not null references public.flayost_members(name),
  score      int  not null check (score between 1 and 5),
  note       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (cheese_id, member)
);

alter table public.flayost_members enable row level security;
alter table public.flayost_cheeses enable row level security;
alter table public.flayost_ratings enable row level security;
-- No policies -> direct table access is fully denied for anon/authenticated.
revoke all on public.flayost_members from anon, authenticated;
revoke all on public.flayost_cheeses from anon, authenticated;
revoke all on public.flayost_ratings from anon, authenticated;

-- Internal PIN check. Not granted to anon — only callable from the RPCs below.
create or replace function public.flayost_check(p_name text, p_pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.flayost_members
    where name = trim(p_name) and pin = p_pin
  );
$$;
revoke all on function public.flayost_check(text, text) from public, anon, authenticated;

-- Login: verifies name + PIN. Creates the member only when p_create is true
-- (the explicit "Ny smaker" flow), so a typo'd name never creates a ghost member.
-- Never returns other members' PINs (or any PIN at all).
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
    insert into public.flayost_members(name, pin, avatar, is_kid)
    values (v_name, p_pin, coalesce(p_avatar, '🧀'), coalesce(p_is_kid, true))
    returning * into m;
    return jsonb_build_object('ok', true, 'created', true,
      'member', jsonb_build_object('name', m.name, 'avatar', m.avatar, 'is_kid', m.is_kid));
  end if;
  if m.pin <> p_pin then
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  if p_avatar is not null and p_avatar <> m.avatar then
    update public.flayost_members set avatar = p_avatar where name = m.name
    returning * into m;
  end if;
  return jsonb_build_object('ok', true, 'created', false,
    'member', jsonb_build_object('name', m.name, 'avatar', m.avatar, 'is_kid', m.is_kid));
end;
$$;

-- Everything the app needs in one round-trip: members (no PINs), cheeses, ratings.
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
        'added_by', added_by, 'created_at', created_at) order by created_at desc)
      from public.flayost_cheeses), '[]'::jsonb),
    'ratings', coalesce((select jsonb_agg(jsonb_build_object(
        'cheese_id', cheese_id, 'member', member, 'score', score,
        'note', note, 'updated_at', updated_at))
      from public.flayost_ratings), '[]'::jsonb)
  );
end;
$$;

create or replace function public.flayost_add_cheese(
  p_name text, p_pin text, p_cheese_name text, p_type text, p_photo text default null
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
  insert into public.flayost_cheeses(name, type, photo, added_by)
  values (trim(p_cheese_name), coalesce(p_type, ''), p_photo, trim(p_name))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

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
  insert into public.flayost_ratings(cheese_id, member, score, note, updated_at)
  values (p_cheese_id, trim(p_name), p_score, coalesce(p_note, ''), now())
  on conflict (cheese_id, member) do update
    set score = excluded.score, note = excluded.note, updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

-- Adults only — for cleaning up typos/duplicates. Ratings cascade.
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
  if (select is_kid from public.flayost_members where name = trim(p_name)) then
    return jsonb_build_object('ok', false, 'error', 'adults_only');
  end if;
  delete from public.flayost_cheeses where id = p_cheese_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.flayost_login(text, text, text, boolean, boolean) from public;
revoke all on function public.flayost_get_board(text, text) from public;
revoke all on function public.flayost_add_cheese(text, text, text, text, text) from public;
revoke all on function public.flayost_rate(text, text, uuid, int, text) from public;
revoke all on function public.flayost_delete_cheese(text, text, uuid) from public;
grant execute on function public.flayost_login(text, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.flayost_get_board(text, text) to anon, authenticated;
grant execute on function public.flayost_add_cheese(text, text, text, text, text) to anon, authenticated;
grant execute on function public.flayost_rate(text, text, uuid, int, text) to anon, authenticated;
grant execute on function public.flayost_delete_cheese(text, text, uuid) to anon, authenticated;
