/* smoke: Kort-fanen 🎴 (Pokédex-laget) + backend-drevet autocomplete i
   «Ny ost». Ekte produksjons-RPC-rundtur (flayost_cheese_search,
   flayost_cheese_cards, flayost_cheese_unmatched_list) + DOM-sjekk av
   renderKort()/renderSuggestions(). E2E-rader ryddes til slutt. */
const { chromium } = require('playwright-core');
const path = require('path'), os = require('os'), fs = require('fs');
const base = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const dir = fs.readdirSync(base).find(d => d.startsWith('chromium_headless_shell'));
const sub = fs.readdirSync(path.join(base, dir)).find(d => d.startsWith('chrome-'));
let pass = 0, fail = 0;
const check = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? '  ✅' : '  ❌', n, ok ? '' : x || ''); };
(async () => {
  const b = await chromium.launch({ executablePath: path.join(base, dir, sub, 'chrome-headless-shell') });
  const p = await b.newPage();
  await p.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });

  const flow = await p.evaluate(async () => {
    await rpc('flayost_login', { p_name: 'E2E Kort', p_pin: '3333', p_avatar: '🦔', p_is_kid: true, p_create: true });
    // ett kjent art-navn (skal matche katalogen) + ett oppdiktet (skal ikke)
    const matched = await rpc('flayost_add_cheese', { p_name: 'E2E Kort', p_pin: '3333', p_cheese_name: 'Comté', p_type: 'Ku', p_photo: null, p_origin: '', p_lat: null, p_lng: null });
    const unmatched = await rpc('flayost_add_cheese', { p_name: 'E2E Kort', p_pin: '3333', p_cheese_name: 'E2E Ukjentost 12345', p_type: 'Ku', p_photo: null, p_origin: '', p_lat: null, p_lng: null });
    const search = await rpc('flayost_cheese_search', { p_name: 'E2E Kort', p_pin: '3333', p_query: 'gruyere' }); // aksent-uavhengig
    const cards = await rpc('flayost_cheese_cards', { p_name: 'E2E Kort', p_pin: '3333' });
    const unmatchedListAsKid = await rpc('flayost_cheese_unmatched_list', { p_name: 'E2E Kort', p_pin: '3333' });
    return { matched, unmatched, search, cards, unmatchedListAsKid };
  });
  check('flayost_add_cheese lykkes for begge', flow.matched?.ok && flow.unmatched?.ok, JSON.stringify(flow));
  check('cheese_search finner "Gruyère français" på "gruyere" (aksent-uavhengig)',
    flow.search?.ok && flow.search.hits.some(h => h.name === 'Gruyère français'), JSON.stringify(flow.search));
  check('cheese_search returnerer maks 8 treff', flow.search?.hits.length <= 8);
  check('cheese_cards: Comté matcher katalogen', flow.cards?.cards.find(c => c.base_name === 'Comté')?.matched === true, JSON.stringify(flow.cards));
  check('cheese_cards: oppdiktet navn matcher IKKE', flow.cards?.cards.find(c => c.base_name === 'E2E Ukjentost 12345')?.matched === false);
  check('cheese_unmatched_list nektes for ikke-admin', flow.unmatchedListAsKid?.ok === false && flow.unmatchedListAsKid.error === 'adults_only');

  /* ---- UI: Kort-fanen rendres riktig fra ekte RPC-data ---- */
  const ui = await p.evaluate(async () => {
    SESS = { name: 'E2E Kort', pin: '3333', avatar: '🦔', is_kid: true, is_admin: false };
    BOARD.catalog_count = 94;
    TAB = 'kort'; // renderKort() sjekker dette for å avbryte hvis fanen byttes mens RPC-en er i flukt
    await renderKort();
    const cards = [...document.querySelectorAll('#kort .kort')];
    const matchedCard = cards.find(c => c.textContent.includes('Comté'));
    const unmatchedCard = cards.find(c => c.textContent.includes('E2E Ukjentost'));
    return {
      headText: document.querySelector('#kort .passhead').textContent,
      matchedIsPlain: matchedCard && !matchedCard.classList.contains('unmatched'),
      unmatchedHasClass: unmatchedCard && unmatchedCard.classList.contains('unmatched'),
      cardCount: cards.length,
    };
  });
  check('Kort-fanen viser katalogstørrelsen, ikke listen', ui.headText.includes('94'), ui.headText);
  check('matchet kort har IKKE unmatched-klassen', ui.matchedIsPlain);
  check('umatchet kort har unmatched-klassen (generisk plassholder)', ui.unmatchedHasClass);
  check('minst 2 kort rendret', ui.cardCount >= 2, 'count=' + ui.cardCount);

  /* ---- UI: autocomplete i «Ny ost» kaller backend, ikke lokal CHEESES_FR ---- */
  const auto = await p.evaluate(async () => {
    openAdd();
    document.getElementById('addName').value = 'gruyere'; // uten aksent
    await renderSuggestions();
    const items = [...document.querySelectorAll('#sugList .sugitem')].map(e => e.textContent);
    return { items, hidden: document.getElementById('sugList').classList.contains('hidden') };
  });
  check('autocomplete finner "Gruyère français" via backend på aksent-fri "gruyere"',
    auto.items.some(t => t.includes('Gruyère français')), JSON.stringify(auto.items));
  check('forslagslisten er synlig', !auto.hidden);

  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
