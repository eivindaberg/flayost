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

set -u
cd "$(dirname "$0")/.."
[ -d tests/node_modules ] || (cd tests && npm install --no-fund --no-audit)

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
exit $FEIL
