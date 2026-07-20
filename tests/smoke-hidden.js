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

  const earned = await p.evaluate(() => {
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    const ME = 'E2E Fake', D = '2026-07-19T12:00:00';  // en søndag
    const cheeses = [], ratings = [], stinks = [];
    for (let i = 0; i < 50; i++) {
      let type = i < 10 ? '🐐 Geit' : i < 15 ? '🐑 Sau' : '🐄 Ku';
      if (i >= 15 && i <= 17) type += ' · Myk';
      if (i >= 18 && i <= 22) type += ' · Fast';
      if (i === 23) type += ' · Fersk';
      cheeses.push({ id: 'c' + i, name: 'Ost ' + i, type, added_by: i >= 45 ? ME : 'Anna', photo: i === 45 ? 'data:x' : null });
      ratings.push({ cheese_id: 'c' + i, member: ME, score: (i % 5) + 1,
        note: i < 5 ? 'Nam, dette var saker!' : i === 5 ? 'x'.repeat(85) : '',
        updated_at: i === 0 ? '2026-07-19T06:30:00' : i === 30 ? '2026-07-19T23:30:00' : D });
    }
    for (let i = 0; i < 5; i++)  stinks.push({ cheese_id: 'c' + i, member: ME, stink: i + 1 });
    [5, 6].forEach(i => stinks.push({ cheese_id: 'c' + i, member: ME, stink: 4 }));
    [7, 8].forEach(i => stinks.push({ cheese_id: 'c' + i, member: ME, stink: 5 }));
    for (let i = 15; i < 25; i++) ratings.push({ cheese_id: 'c' + i, member: 'Anna', score: (i % 5) + 1, note: '', updated_at: D });
    ratings.push({ cheese_id: 'c45', member: 'Anna', score: 5, note: '', updated_at: D }); // min c45 fikk 🤩 (og min var 🤢)
    cheeses.push({ id: 'cp', name: 'Pioner-ost', type: '🐄 Ku', added_by: 'Anna', photo: null });
    ratings.push({ cheese_id: 'cp', member: ME, score: 4, note: '', updated_at: '2026-07-19T08:30:00' });
    ratings.push({ cheese_id: 'cp', member: 'Anna', score: 3, note: '', updated_at: '2026-07-19T09:00:00' });
    ratings.push({ cheese_id: 'cp', member: 'Bob', score: 3, note: '', updated_at: '2026-07-19T10:00:00' });
    BOARD = { members: [{ name: ME, avatar: '🦊', is_kid: true }, { name: 'Anna', avatar: '🐰', is_kid: false }, { name: 'Bob', avatar: '🐸', is_kid: true }], cheeses, ratings, stinks };
    return earnedBadges().map(x => x.id);
  });
  const expectHidden = ['aesj3','sol5','midt5','poet','roman','jeger5','foto','elsket','blomst','sokk3','rumpe3','sau5','ku15','myk3','fast5','fersk1','natt','sondag','festival','enige','mot','tvilling','pioner'];
  const missing = expectHidden.filter(id => !earned.includes(id));
  check(`alle ${expectHidden.length} testbare skjulte merker kan opptjenes`, missing.length === 0, 'mangler: ' + missing.join(','));
  check('regionmerkene er IKKE opptjent uten stempler', !earned.includes('paris') && !earned.includes('korsika') && !earned.includes('helefr'));

  await p.evaluate(() => { enterWall(); setTab('pass'); });
  await p.waitForTimeout(400);
  const html = await p.evaluate(() => document.getElementById('pass').innerHTML);
  check('opptjente skjulte merker vises med navn', html.includes('Ostepaparazzi') && html.includes('Smakstvilling') && html.includes('Førstesmaker'));
  check('uopptjente skjulte merker er usynlige', !html.includes('Pariserhjulet') && !html.includes('Øyhopperen') && !html.includes('HELE Frankrike'));
  check('teaser viser «34 skjulte merker»', html.includes('34 skjulte merker'), html.match(/\d+ skjulte merker/)?.[0]);
  check('teller viser av 78 merker', html.includes('av 78 merker'), html.match(/av \d+ merker/)?.[0]);

  // justering: smak- og lukterad skal ha lik venstrekant på knappene
  await p.evaluate(() => setTab('nyeste'));
  await p.waitForTimeout(200);
  const align = await p.$eval('.cheese', card => {
    const t = card.querySelector('.emorow button').getBoundingClientRect();
    const s = card.querySelector('.stinkrow button').getBoundingClientRect();
    const tl = card.querySelector('.emorow .slab'), sl = card.querySelector('.stinkrow .slab');
    return { dx: Math.abs(t.left - s.left), taste: tl?.textContent, smell: sl?.textContent };
  });
  check('👅-indikator på smaksraden', align.taste === '👅', JSON.stringify(align));
  check('💨-indikator på lukteraden', align.smell === '💨');
  check('knappene i de to radene er på linje (avvik < 2px)', align.dx < 2, 'avvik=' + align.dx);
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
