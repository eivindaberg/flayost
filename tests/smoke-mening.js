/* smoke: meningshistorikk (first_score/changes på serveren) + Snudd!/
   Berg-og-dal-bane og de negative «tvilsom heder»-merkene. */
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
  await p.goto('http://localhost:8899/app.html', { waitUntil: 'domcontentloaded' });

  /* 1. serveren husker første dom og teller ombestemmelser */
  const srv = await p.evaluate(async () => {
    await rpc('flayost_login', { p_name: 'E2E Mening', p_pin: '5566', p_avatar: '🦊', p_is_kid: true, p_create: true });
    const add = await rpc('flayost_add_cheese', { p_name: 'E2E Mening', p_pin: '5566', p_cheese_name: 'E2E Snuost', p_type: '🧀', p_photo: null, p_origin: '', p_lat: null, p_lng: null });
    await rpc('flayost_rate', { p_name: 'E2E Mening', p_pin: '5566', p_cheese_id: add.id, p_score: 1, p_note: '' });
    await rpc('flayost_rate', { p_name: 'E2E Mening', p_pin: '5566', p_cheese_id: add.id, p_score: 5, p_note: '' });
    await rpc('flayost_rate', { p_name: 'E2E Mening', p_pin: '5566', p_cheese_id: add.id, p_score: 5, p_note: 'samme igjen' });
    const board = await rpc('flayost_get_board', { p_name: 'E2E Mening', p_pin: '5566' });
    return board.ratings.find(r => r.member === 'E2E Mening' && r.cheese_id === add.id);
  });
  check('first_score = første dom (1)', srv?.first_score === 1, JSON.stringify(srv));
  check('score = siste dom (5)', srv?.score === 5);
  check('changes teller kun ekte endringer (1)', srv?.changes === 1, 'changes=' + srv?.changes);

  /* 2. merkene regnes riktig fra historikken */
  const earned = await p.evaluate(() => {
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    const ME = 'E2E Fake', D = '2026-07-19T12:00:00';
    const cheeses = [], ratings = [], stinks = [];
    for (let i = 0; i < 10; i++) {
      cheeses.push({ id: 'c' + i, name: 'Ost ' + i, type: '🐄 Ku', added_by: 'Anna' });
      ratings.push({ cheese_id: 'c' + i, member: ME, score: 2, note: '', updated_at: D,
        first_score: i === 0 ? 1 : 2, changes: i === 1 ? 3 : 0 });
    }
    ratings[0].score = 5;                                   // 1 → 5 = Snudd!
    ratings[2].score = 1;                                   // trekker snittet under 2.3
    BOARD = { members: [{ name: ME, avatar: '🦊', is_kid: true }], cheeses, ratings, stinks };
    return earnedBadges().map(x => x.id);
  });
  check('🦋 Snudd! (1 → 5)', earned.includes('snudd'), JSON.stringify(earned));
  check('🎢 Berg-og-dal-bane (3 endringer)', earned.includes('bergdal'));
  check('🌩️ Surpompen (snitt < 2.3 på 10)', earned.includes('surmuler'));
  check('🫥 Luktblind (10 dommer, 0 lukter)', earned.includes('luktblind'));
  check('💔 ikke Falt fra troen (ingen 4→2)', !earned.includes('exfan'));

  /* 3. negative merker vises med neg-stil og uten 🎉 */
  await p.evaluate(() => { enterWall(); setTab('pass'); });
  await p.waitForTimeout(300);
  const neg = (await p.$$eval('#pass .badge.neg', els => els.map(e => e.textContent))).join(' · ');
  check('negativt merke har neg-stil i passet', neg.includes('Surpompen'), neg);
  check('negativt merke feirer ikke med 🎉', !neg.includes('🎉'));

  /* 4. lokal optimistisk oppdatering teller endringer også */
  const lokal = await p.evaluate(async () => {
    rpc = async () => ({ ok: true }); refreshBoard = async () => {};
    await rate('c5', 4);            // 2 → 4: endring
    await rate('c5', 4);            // samme: ikke endring
    const r = BOARD.ratings.find(x => x.cheese_id === 'c5' && x.member === SESS.name);
    return { changes: r.changes, first: r.first_score };
  });
  check('lokal rate() teller endringer likt serveren', lokal.changes === 1 && lokal.first === 2, JSON.stringify(lokal));
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
