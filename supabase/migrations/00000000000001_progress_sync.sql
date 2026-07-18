-- Cross-device progress sync for Mattespill.
-- No real accounts: a "code" (player name + PIN the kid picks) is the access key.
-- The table itself is locked down; all access goes through the two RPCs below,
-- so the anon key can never be used to list every kid's row.

create table if not exists public.progress (
  code text primary key,
  name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;
-- No policies granted to anon/authenticated -> direct table access is fully denied.
-- (RPC functions below use security definer to bypass RLS deliberately.)

revoke all on public.progress from anon, authenticated;

create or replace function public.get_progress(p_code text)
returns table(name text, data jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select name, data, updated_at from public.progress where code = p_code;
$$;

create or replace function public.save_progress(p_code text, p_name text, p_data jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.progress (code, name, data, updated_at)
  values (p_code, p_name, p_data, now())
  on conflict (code) do update
    set name = excluded.name, data = excluded.data, updated_at = now();
$$;

revoke all on function public.get_progress(text) from public;
revoke all on function public.save_progress(text, text, jsonb) from public;
grant execute on function public.get_progress(text) to anon, authenticated;
grant execute on function public.save_progress(text, text, jsonb) to anon, authenticated;
