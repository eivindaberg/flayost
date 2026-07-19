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
    BOARD = { members: [{ name: 'E2E Fake', avatar: '🦊', is_kid: true }], ratings: [], stinks: [], cheeses: [
      { id: 'a', name: 'Comté', type: '🐄 Ku', added_by: 'E2E Fake', photo: null },
      { id: 'b', name: 'Roquefort', type: '🐑 Sau', added_by: 'E2E Fake', photo: 'data:image/jpeg;base64,xx' },
      { id: 'c', name: 'Bestemors hjemmeost', type: '🧀', added_by: 'E2E Fake', photo: null },
      { id: 'd', name: 'Brie', type: '🐄 Ku', added_by: 'E2E Fake', photo: null },
    ]};
    enterWall(); setTab('nyeste');
  });
  const bgs = await p.$$eval('.cheese .photo', els => els.map(e => ({ bg: e.style.backgroundImage, txt: e.textContent.trim() })));
  const byIdx = i => bgs[i] || {};
  check('Comté uten foto får Wikimedia-bilde', bgs.some(x => x.bg.includes('upload.wikimedia.org') && x.bg.includes('Comte')), JSON.stringify(bgs.map(x=>x.bg.slice(0,60))));
  check('eget foto beholdes (Roquefort)', bgs.some(x => x.bg.includes('data:image')));
  check('ukjent ost beholder emoji', bgs.some(x => !x.bg && x.txt === '🧀'));
  check('delvis treff: «Brie» får brie-bilde', bgs.some(x => /Brie/i.test(x.bg)));
  await p.evaluate(() => openDetail('a'));
  const dhtml = await p.evaluate(() => document.getElementById('dPhotoWrap').innerHTML);
  check('detaljark viser nettbilde + 📷 Wikimedia', dhtml.includes('upload.wikimedia.org') && dhtml.includes('Wikimedia'));
  const loaded = await p.$eval('#dPhotoWrap img', async img => { await new Promise(r => { if (img.complete) r(); img.onload = r; img.onerror = r; setTimeout(r, 8000); }); return img.naturalWidth; });
  check('bildet laster faktisk fra Wikimedia (naturalWidth > 0)', loaded > 0, 'naturalWidth=' + loaded);
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
