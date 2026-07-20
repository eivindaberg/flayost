#!/bin/bash
# Kjører hele testsuiten mot index.html i repo-rota.
# Bruk: tests/run.sh            (alle suitene)
#       tests/run.sh smoke-liga (én suite)
#
# Krav: node + `npm install` i tests/ (playwright-core), og chromium headless
# shell i ~/Library/Caches/ms-playwright (suitene finner den selv).
#
# NB: Suitene leser fra PRODUKSJONS-databasen og skriver kun rader med navn
# «E2E %». Rydd etter kjøring (smoke-admin/smoke-familie lager medlemmer):
#   delete from flayost_cheeses where name like 'E2E %';
#   delete from flayost_members where name like 'E2E %';
# (kjøres via Supabase Management API — se supabase-cli-access i memory)

# NB: siden 2026-07-20 (migrasjon …0002) filtrerer serveren selv bort «E2E »-
# navn fra flayost_who/get_board, så en glemt opprydding kan aldri lenger nå
# familiens skjerm (klienten har i tillegg et eget sikkerhetsnett, stripE2E()
# i index.html). Denne oppryddingen er likevel verdt å kjøre — den holder
# produksjonsbasen fri for testsøppel som ellers hoper seg opp over tid.
cleanup_e2e(){
  TOKEN=$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null | sed 's/go-keyring-base64://' | base64 -d 2>/dev/null)
  [ -z "$TOKEN" ] && return
  curl -s -X POST https://api.supabase.com/v1/projects/fvafwggxvnsmqedmdmdz/database/query \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"query":"delete from flayost_ratings where member like $$E2E %$$ or cheese_id in (select id from flayost_cheeses where name like $$E2E %$$ or added_by like $$E2E %$$); delete from flayost_stinks where member like $$E2E %$$ or cheese_id in (select id from flayost_cheeses where name like $$E2E %$$ or added_by like $$E2E %$$); update flayost_cheeses set round_id=null where round_id in (select id from flayost_rounds where started_by like $$E2E %$$); delete from flayost_rounds where started_by like $$E2E %$$; delete from flayost_cheeses where name like $$E2E %$$ or added_by like $$E2E %$$; delete from flayost_members where name like $$E2E %$$;"}' >/dev/null \
    && echo "🧹 E2E-rader ryddet fra produksjon"
}

set -u
cd "$(dirname "$0")/.."
[ -d tests/node_modules ] || (cd tests && npm install --no-fund --no-audit)

# ryddig FØR kjøring også — så søppel fra en avbrutt forrige økt (Ctrl-C,
# krasj, eller en enkeltfil kjørt direkte med `node smoke-x.js` utenom dette
# scriptet) aldri hoper seg opp
cleanup_e2e

python3 -m http.server 8899 >/dev/null 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 1

cd tests
FEIL=0
if [ $# -ge 1 ]; then
  SUITER="$1.js"
else
  SUITER=$(ls e2e-*.js smoke-*.js)
fi
for t in $SUITER; do
  if node "$t" >/tmp/flayost-test-out 2>&1; then
    echo "✅ ${t%.js}"
  else
    echo "❌ ${t%.js}"
    tail -20 /tmp/flayost-test-out | sed 's/^/   /'
    FEIL=1
  fi
done

cd ..
cleanup_e2e
exit $FEIL
