const { chromium } = require('playwright-core');
const path = require('path'), os = require('os'), fs = require('fs');
const base = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const dir = fs.readdirSync(base).find(d => d.startsWith('chromium_headless_shell'));
const sub = fs.readdirSync(path.join(base, dir)).find(d => d.startsWith('chrome-'));
(async () => {
  const b = await chromium.launch({ executablePath: path.join(base, dir, sub, 'chrome-headless-shell') });
  const p = await b.newPage();
  await p.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
  const after = await p.evaluate(async () => {
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    rpc = async () => ({ ok: true, members: [{ name: 'E2E Fake', avatar: '🦊', is_kid: false }], cheeses: [], ratings: [], stinks: [] });
    await refreshBoard();
    return SESS.is_kid;
  });
  if (after !== false) throw new Error('SESS.is_kid ble ikke oppdatert fra tavla: ' + after);
  console.log('✅ barn→voksen på serveren plukkes opp ved neste synk uten ny innlogging');
  await b.close();
})().catch(e => { console.error('❌', e.message); process.exit(1); });
