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
  const earned = await p.evaluate(() => {
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    const ME = 'E2E Fake';
    const cheeses = [
      { id: 'p1', name: 'Parmigiano Reggiano (12 mnd)', type: '🐄 Ku · Fast', added_by: 'Anna', lat: 44.8, lng: 10.33 },
      { id: 'p2', name: 'Parmigiano Reggiano (24 mnd)', type: '🐄 Ku · Fast', added_by: 'Anna', lat: 44.8, lng: 10.33 },
      { id: 'p3', name: 'Parmigiano Reggiano (36 mnd)', type: '🐄 Ku · Fast', added_by: 'Anna', lat: 44.8, lng: 10.33 },
      { id: 'ch1', name: 'Cheddar (Westcombe)', type: '🐄 Ku · Fast', added_by: 'Anna', lat: 51.28, lng: -2.78 },
      { id: 'ch2', name: 'Cheddar (Montgomery)', type: '🐄 Ku · Fast', added_by: 'Anna', lat: 51.28, lng: -2.78 },
      { id: 'b1', name: 'Banon', type: '🐐 Geit · Myk', added_by: 'Anna', lat: 44.04, lng: 5.63 },  // ~65 km fra Flayosc
      { id: 'o1', name: 'Gamalost', type: '🐄 Ku', added_by: 'Anna', lat: 60.88, lng: 7.11 },       // Vik i Sogn, ~2000 km
      { id: 'm1', name: 'Modig-ost', type: '🐄 Ku', added_by: 'Anna' }, { id: 'm2', name: 'Modig-ost 2', type: '🐄 Ku', added_by: 'Anna' }, { id: 'm3', name: 'Modig-ost 3', type: '🐄 Ku', added_by: 'Anna' },
    ];
    const dates = ['2026-07-13','2026-07-14','2026-07-15','2026-07-16','2026-07-17','2026-07-18','2026-07-19'];
    const ratings = cheeses.map((c, i) => ({ cheese_id: c.id, member: ME, score: c.id.startsWith('m') ? 5 : 4, note: '', updated_at: dates[i % dates.length] + 'T12:00:00' }));
    ['m1','m2','m3'].forEach(id => ratings.push({ cheese_id: id, member: 'Anna', score: 1, note: '', updated_at: '2026-07-19T13:00:00' }));
    const stinks = [{ cheese_id: 'm1', member: ME, stink: 5 }];
    BOARD = { members: [{ name: ME, avatar: '🦊', is_kid: true }, { name: 'Anna', avatar: '🐰', is_kid: false }], cheeses, ratings, stinks };
    return earnedBadges().map(x => x.id);
  });
  ['vari2','vari3','parmesan','cheddar','dager5','langt','naert','modig3','kjaerlighet'].forEach(id =>
    check(`«${id}» opptjent`, earned.includes(id), JSON.stringify(earned)));
  check('«hundre» IKKE opptjent (10 oster)', !earned.includes('hundre'));
  check('«dager10» IKKE opptjent (7 dager)', !earned.includes('dager10'));
  check('78 merker totalt', await p.evaluate(() => BADGES.length) === 78);
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
