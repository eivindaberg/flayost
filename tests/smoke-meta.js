const { chromium } = require('playwright-core');
const path = require('path'), os = require('os'), fs = require('fs');
const base = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const dir = fs.readdirSync(base).find(d => d.startsWith('chromium_headless_shell'));
const sub = fs.readdirSync(path.join(base, dir)).find(d => d.startsWith('chrome-'));
let pass = 0, fail = 0;
const check = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? '  ✅' : '  ❌', n, ok ? '' : x || ''); };
(async () => {
  const b = await chromium.launch({ executablePath: path.join(base, dir, sub, 'chrome-headless-shell') });
  const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
  await p.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    BOARD = { members: [{ name: 'E2E Fake', avatar: '🦊', is_kid: true }], stinks: [{cheese_id:'a', member:'E2E Fake', stink:3}], ratings: [],
      cheeses: [
        { id: 'a', name: 'Banon', type: '🐐 Geit · Myk', added_by: 'Fredrik', photo: null, origin: "Provence-Alpes-Côte d'Azur" },
        { id: 'b', name: 'Comté', type: '🐄 Ku · Fast', added_by: 'Eivind', photo: null, origin: 'Franche-Comté' },
      ]};
    enterWall(); setTab('nyeste');
  });
  await p.waitForTimeout(200);
  const m = await p.$eval('.cheese .meta', e => {
    const r = e.getBoundingClientRect();
    return { h: r.height, w: r.width, scrollW: e.scrollWidth, txt: e.textContent, parentW: e.parentElement.getBoundingClientRect().width };
  });
  check('metaraden er én linje (høyde < 32px)', m.h < 32, 'h=' + m.h);
  check('ingen «av …»-chip på kortet', !m.txt.includes('av Fredrik'));
  check('regionnavnet kuttes uten å sprenge kortet', m.scrollW <= Math.ceil(m.parentW) + 1, `scrollW=${m.scrollW} vs ${m.parentW}`);
  const chip = await p.$eval('.typechip.ochip', e => ({ ell: getComputedStyle(e).textOverflow, title: e.title }));
  check('lang region har …-kutt og full tekst i title', chip.ell === 'ellipsis' && chip.title.includes("Côte d'Azur"), JSON.stringify(chip));
  await p.evaluate(() => openDetail('a'));
  const d = await p.evaluate(() => document.getElementById('dMeta').textContent);
  check('detaljarket viser fortsatt «lagt til av»', d.includes('lagt til av Fredrik'), d);
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
