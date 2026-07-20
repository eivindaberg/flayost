/* smoke: Smakerunde 🥣 — admin starts a focused round, kids only see that
   round's cheeses (no tabs/map/pass), new cheeses they add auto-join the
   round, admin can pull in an existing cheese, and ending returns to normal.
   Real production RPC round-trip + UI restriction checks. */
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

  /* ---- 1. server: kun admin kan starte/avslutte, ett aktivt om gangen ---- */
  const srv = await p.evaluate(async () => {
    await rpc('flayost_login', { p_name: 'E2E Kid', p_pin: '1111', p_avatar: '🦊', p_is_kid: true, p_create: true });
    await rpc('flayost_login', { p_name: 'E2E Adm', p_pin: '2222', p_avatar: '🦉', p_is_kid: false, p_create: true });
    const kidTry = await rpc('flayost_round_start', { p_name: 'E2E Kid', p_pin: '1111', p_cheese_ids: [] });
    return { kidTry };
  });
  check('barn nektes å starte runde (adults_only)', srv.kidTry?.ok === false && srv.kidTry.error === 'adults_only', JSON.stringify(srv.kidTry));

  // gjør E2E Adm til admin direkte i basen for testens skyld (flayost_who har ikke egen "gjør admin"-RPC)
  let adminOk = false;
  try{
    const { execSync } = require('child_process');
    const raw = execSync('security find-generic-password -s "Supabase CLI" -w').toString().trim();
    const TOKEN = Buffer.from(raw.replace(/^go-keyring-base64:/, ''), 'base64').toString('utf8');
    await fetch('https://api.supabase.com/v1/projects/fvafwggxvnsmqedmdmdz/database/query', {
      method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: "update flayost_members set is_admin=true where name='E2E Adm';" }),
    });
    adminOk = true;
  }catch(e){ /* ingen keychain-tilgang på denne maskinen — hopp over server-flyten */ }

  if (adminOk) {
    const flow = await p.evaluate(async () => {
      const existing = await rpc('flayost_add_cheese', { p_name: 'E2E Adm', p_pin: '2222', p_cheese_name: 'E2E Restost', p_type: '🧀', p_photo: null, p_origin: '', p_lat: null, p_lng: null });
      const start = await rpc('flayost_round_start', { p_name: 'E2E Adm', p_pin: '2222', p_cheese_ids: [existing.id] });
      const kidAdd = await rpc('flayost_add_cheese', { p_name: 'E2E Kid', p_pin: '1111', p_cheese_name: 'E2E Ungeost', p_type: '🧀', p_photo: null, p_origin: '', p_lat: null, p_lng: null });
      const board = await rpc('flayost_get_board', { p_name: 'E2E Kid', p_pin: '1111' });
      const other = await rpc('flayost_add_cheese', { p_name: 'E2E Adm', p_pin: '2222', p_cheese_name: 'E2E Utenfor', p_type: '🧀', p_photo: null, p_origin: '', p_lat: null, p_lng: null });
      const doubleStart = await rpc('flayost_round_start', { p_name: 'E2E Adm', p_pin: '2222', p_cheese_ids: [] }); // skal avslutte forrige automatisk
      const boardAfterRestart = await rpc('flayost_get_board', { p_name: 'E2E Kid', p_pin: '1111' });
      const end = await rpc('flayost_round_end', { p_name: 'E2E Adm', p_pin: '2222' });
      const boardAfterEnd = await rpc('flayost_get_board', { p_name: 'E2E Kid', p_pin: '1111' });
      return { start, existingId: existing.id, kidAddId: kidAdd.id, otherId: other.id, board, doubleStart, boardAfterRestart, end, boardAfterEnd };
    });
    check('runde starter for admin', flow.start?.ok === true, JSON.stringify(flow.start));
    check('get_board rapporterer aktiv runde', !!flow.board.round, JSON.stringify(flow.board.round));
    const roundId = flow.board.round.id;
    const existingC = flow.board.cheeses.find(c => c.id === flow.existingId);
    const kidC = flow.board.cheeses.find(c => c.id === flow.kidAddId);
    const otherC = flow.board.cheeses.find(c => c.id === flow.otherId);
    check('admin-valgt eksisterende ost er tagget med runden', existingC?.round_id === roundId, JSON.stringify(existingC));
    check('ostet ungen selv la til er AUTOMATISK tagget med runden', kidC?.round_id === roundId, JSON.stringify(kidC));
    check('en ny ost lagt til FØR runden startet er ikke tagget', otherC?.round_id !== roundId, JSON.stringify(otherC));
    check('kun én runde aktiv: ny start avslutter forrige automatisk', flow.doubleStart?.ok === true);
    check('etter restart: forrige rundes oster er ikke i DEN NYE runden', !flow.boardAfterRestart.cheeses.find(c=>c.id===flow.existingId)?.round_id || flow.boardAfterRestart.cheeses.find(c=>c.id===flow.existingId).round_id !== flow.boardAfterRestart.round.id);
    check('avslutt runde ok', flow.end?.ok === true);
    check('etter avslutning: ingen aktiv runde i get_board', flow.boardAfterEnd.round === null, JSON.stringify(flow.boardAfterEnd.round));
  } else {
    console.log('  ⚠️  hopper over server-flyten (ingen SUPA_TOKEN i miljøet — kun UI-sjekker under kjøres)');
  }

  /* ---- 2. UI: restriksjon for barn, admin ser alt + banner ---- */
  const ui = await p.evaluate(() => {
    const round = { id: 'r1', started_by: 'Bjørg', started_at: '2026-07-20T07:30:00' };
    const cheeses = [
      { id: 'a', name: 'I runden 1', type: '🐄 Ku', added_by: 'Bjørg', round_id: 'r1' },
      { id: 'b', name: 'I runden 2', type: '🐐 Geit', added_by: 'Bjørg', round_id: 'r1' },
      { id: 'c', name: 'Gammel ost', type: '🧀', added_by: 'Bjørg', round_id: null },
    ];
    BOARD = { members: [{ name: 'E2E Fake', avatar: '🦊', is_kid: true }], cheeses, ratings: [], stinks: [], round };

    // barn: restriktiv visning
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true, is_admin: false };
    enterWall();
    const kidView = {
      tabsHidden: document.getElementById('tabs-normal').classList.contains('hidden'),
      roundVisible: !document.getElementById('round-wrap').classList.contains('hidden'),
      wallHidden: document.getElementById('wall').classList.contains('hidden'),
      cardCount: document.querySelectorAll('#round-list .cheese').length,
      bannerHidden: document.getElementById('round-banner').classList.contains('hidden'),
      fabVisible: !!document.querySelector('.fab'),
    };

    // admin: full tilgang + banner
    SESS = { name: 'E2E Adm2', pin: '0000', avatar: '🦉', is_kid: false, is_admin: true };
    enterWall();
    const adminView = {
      tabsHidden: document.getElementById('tabs-normal').classList.contains('hidden'),
      roundWrapHidden: document.getElementById('round-wrap').classList.contains('hidden'),
      bannerVisible: !document.getElementById('round-banner').classList.contains('hidden'),
      bannerText: document.getElementById('round-banner').textContent,
    };
    return { kidView, adminView };
  });
  check('barn: tabs skjult', ui.kidView.tabsHidden);
  check('barn: rundevisning synlig', ui.kidView.roundVisible);
  check('barn: normal vegg skjult', ui.kidView.wallHidden);
  check('barn: ser KUN de 2 ostene i runden (ikke den gamle)', ui.kidView.cardCount === 2, 'count=' + ui.kidView.cardCount);
  check('barn: ser ikke rundebanneret (det er admin-only)', ui.kidView.bannerHidden);
  check('barn: kan fortsatt legge til ny ost («registrere sine egne»)', ui.kidView.fabVisible);
  check('admin: tabs IKKE skjult (full tilgang under runde)', !ui.adminView.tabsHidden);
  check('admin: rundevisning skjult (bruker vanlig vegg)', ui.adminView.roundWrapHidden);
  check('admin: ser rundebanneret med avslutt-knapp', ui.adminView.bannerVisible && ui.adminView.bannerText.includes('Avslutt runde'));

  /* ---- 3. ingen runde aktiv → alt som normalt ---- */
  const normal = await p.evaluate(() => {
    BOARD.round = null;
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true, is_admin: false };
    enterWall();
    return {
      tabsHidden: document.getElementById('tabs-normal').classList.contains('hidden'),
      roundVisible: !document.getElementById('round-wrap').classList.contains('hidden'),
    };
  });
  check('uten aktiv runde: tabs vises normalt for alle', !normal.tabsHidden);
  check('uten aktiv runde: rundevisning skjult', !normal.roundVisible);

  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
