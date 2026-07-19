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
  await p.evaluate(() => {
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    const D = '2026-07-19T12:00:00', cheeses = [], ratings = [];
    for (let i = 0; i < 12; i++) {
      cheeses.push({ id: 'c' + i, name: 'Ost ' + i, type: '🐄 Ku', added_by: 'Anna', photo: null });
      ratings.push({ cheese_id: 'c' + i, member: 'E2E Fake', score: (i % 5) + 1, note: '', updated_at: D });
      if (i < 6) ratings.push({ cheese_id: 'c' + i, member: 'Anna', score: 3, note: '', updated_at: D });
    }
    ratings.push({ cheese_id: 'c0', member: 'Bob', score: 5, note: '', updated_at: D });
    BOARD = { members: [{ name: 'E2E Fake', avatar: '🦊', is_kid: true }, { name: 'Anna', avatar: '🐰', is_kid: false }, { name: 'Bob', avatar: '🐸', is_kid: true }], cheeses, ratings, stinks: [] };
    enterWall(); setTab('pass');
  });
  await p.waitForTimeout(400);
  const rows = await p.$$eval('#pass .rline', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.includes('merke')));
  check('Merkeligaen har tre rader', rows.length === 3, JSON.stringify(rows));
  check('E2E Fake leder med 🥇', rows[0]?.includes('🥇') && rows[0]?.includes('E2E Fake'), rows[0]);
  check('rekkefølgen er synkende', rows[1]?.includes('Anna') && rows[2]?.includes('Bob'), JSON.stringify(rows));
  const counts = rows.map(r => parseInt(r.match(/(\d+) merke/)?.[1]));
  check('antall er synkende og plausible', counts[0] > counts[1] && counts[1] >= counts[2], JSON.stringify(counts));
  const meline = await p.$eval('#pass .rline.meline', e => e.textContent);
  check('egen rad er markert', meline.includes('E2E Fake'));
  const heading = await p.evaluate(() => document.getElementById('pass').innerHTML.includes('Merkeligaen'));
  check('overskriften 🏆 Merkeligaen vises', heading);
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
