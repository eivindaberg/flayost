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
  const r = await p.evaluate(async () => {
    const login = await rpc('flayost_login', { p_name: 'E2E Admin', p_pin: '9876', p_avatar: '🦊', p_is_kid: false, p_create: true });
    const add = await rpc('flayost_add_cheese', { p_name: 'E2E Admin', p_pin: '9876', p_cheese_name: 'E2E Sletteost', p_type: '🧀', p_photo: null, p_origin: '', p_lat: null, p_lng: null });
    const del1 = await rpc('flayost_delete_cheese', { p_name: 'E2E Admin', p_pin: '9876', p_cheese_id: add.id || add.cheese_id });
    return { login, add, del1 };
  });
  check('E2E-voksen opprettet uten adminrett', r.login.ok && r.login.member.is_admin === false, JSON.stringify(r.login.member));
  check('voksen UTEN admin nektes sletting (adults_only)', r.del1 && r.del1.ok === false && r.del1.error === 'adults_only', JSON.stringify(r.del1));
  console.log('  (osten:', JSON.stringify(r.add), ')');
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
