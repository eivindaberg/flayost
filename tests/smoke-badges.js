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

  // rikt bo: 50 oster (10 geit), alle 5 dommer og lukttrinn brukt, én dom kl 06:30
  const rich = await p.evaluate(() => {
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    const cheeses = [], ratings = [], stinks = [];
    for (let i = 0; i < 50; i++) {
      const milk = i < 10 ? '🐐 Geit' : '🐄 Ku';
      cheeses.push({ id: 'c' + i, name: 'Ost ' + i, type: milk, added_by: 'E2E Fake', photo: null });
      ratings.push({ cheese_id: 'c' + i, member: 'E2E Fake', score: (i % 5) + 1, note: '',
        updated_at: i === 0 ? '2026-07-19T06:30:00' : '2026-07-19T12:00:00' });
      if (i < 5) stinks.push({ cheese_id: 'c' + i, member: 'E2E Fake', stink: i + 1 });
    }
    BOARD = { members: [{ name: 'E2E Fake', avatar: '🦊', is_kid: true }], cheeses, ratings, stinks };
    return earnedBadges().map(x => x.id);
  });
  check('🏆 Ostelegende (50) opptjent', rich.includes('femti'), JSON.stringify(rich));
  check('🐐 Geitemester (10 geitoster) opptjent', rich.includes('geiti'));
  check('🎭 alle fem dommer opptjent', rich.includes('folelser'));
  check('🌈 alle fem lukttrinn opptjent', rich.includes('stinkskala'));
  check('🥐 FrokOST (dom før kl 08) opptjent', rich.includes('frokost'));

  await p.evaluate(() => { enterWall(); setTab('pass'); });
  await p.waitForTimeout(2500);
  let html = await p.evaluate(() => document.getElementById('pass').innerHTML);
  check('opptjente hemmelige merker avsløres', html.includes('Hele følelsesregisteret') && !html.includes('Hemmelig merke'));
  check('teller viser av 63 merker', html.includes('av 63 merker'));

  // fattig bo: hemmelige skal vises som ❓ uten å lekke navn
  await p.evaluate(() => {
    BOARD = { members: [{ name: 'E2E Fake', avatar: '🦊', is_kid: true }], stinks: [],
      cheeses: [{ id: 'x', name: 'Ost', type: '🐄 Ku', added_by: 'E2E Fake', photo: null }],
      ratings: [{ cheese_id: 'x', member: 'E2E Fake', score: 3, note: '', updated_at: '2026-07-19T12:00:00' }] };
    renderPass();
  });
  html = await p.evaluate(() => document.getElementById('pass').innerHTML);
  check('3 hemmelige merker vises som ❓', (html.match(/Hemmelig merke/g) || []).length === 3);
  check('hemmelige navn lekker ikke', !html.includes('Hele stinkskalaen') && !html.includes('FrokOST'));
  const svgPos = await p.$eval('#pass .stamp svg.sreg', e => getComputedStyle(e).position + '/' + getComputedStyle(e).width);
  check('stempelkartet ligger som bakgrunn (absolute, full bredde)', svgPos.startsWith('absolute'), svgPos);
  const overlap = await p.$eval('#pass .stamp', e => {
    const svg = e.querySelector('svg').getBoundingClientRect(), txt = e.querySelector('b').getBoundingClientRect();
    return svg.width > 100 && txt.top > svg.top && txt.bottom < svg.bottom;
  });
  check('teksten ligger oppå kartet', overlap);
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
