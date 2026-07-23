-- Flayost 🧀 — venteliste for lukket beta.
-- Flayost åpnes opp for andre familier, ikke bare vår egen. Til det trengs en
-- venteliste (landingsside samler e-post), atskilt fra medlemsmodellen over
-- (navn+PIN er fortsatt hvordan man BRUKER appen — dette er bare "meld interesse").
--
-- GDPR: kun e-post lagres (ingen navn, ingen sporing/cookies på landingssiden).
-- Ingen SELECT er gitt til anon/authenticated i det hele tatt — venstelisten
-- kan kun leses av prosjekteier via Supabase Management API, aldri av klienten.
-- Sletting på forespørsel: gjøres manuelt samme vei (se README/CLAUDE-notat),
-- ingen selvbetjent sletting-endepunkt er bygget ennå (liten skala, MVP).

create table if not exists public.flayost_waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.flayost_waitlist enable row level security;
revoke all on public.flayost_waitlist from anon, authenticated;

-- Meld interesse: enkel e-postvalidering, idempotent (samme e-post to ganger
-- gir «ok» begge ganger i stedet for en feilmelding — ingen grunn til å avsløre
-- om noen alt har meldt seg på). Ingen PIN — dette skjer FØR noen er medlem.
create or replace function public.flayost_waitlist_join(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;
  insert into public.flayost_waitlist(email) values (v_email)
    on conflict (email) do nothing;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.flayost_waitlist_join(text) from public;
grant execute on function public.flayost_waitlist_join(text) to anon, authenticated;
