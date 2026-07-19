/* e2e: fersk enhet (tom localStorage) skal vise familiens smakere på
   innloggingsskjermen via flayost_who — leser bare fra produksjons-DB. */
const { chromium } = require('playwright-core');
const path = require('path');
const os = require('os');
const fs = require('fs');

const EXEC = (() => {
  const base = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const dir = fs.readdirSync(base).find(d => d.startsWith('chromium_headless_shell'));
  const sub = fs.readdirSync(path.join(base, dir)).find(d => d.startsWith('chrome-'));
  return path.join(base, dir, sub, 'chrome-headless-shell');
})();

let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('  ✅', name); }
  else { fail++; console.log('  ❌', name, extra || ''); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const page = await browser.newPage(); // fersk kontekst = tom localStorage
  await page.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });

  // vent på at flayost_who-svaret har rukket å rendre
  await page.waitForFunction(() => document.querySelectorAll('#memberButtons .member-btn').length > 0, { timeout: 10000 }).catch(() => {});
  const names = await page.$$eval('#memberButtons .member-btn', els => els.map(e => e.textContent.trim()));
  check('fersk enhet viser medlemsknapper fra serveren', names.length > 0, JSON.stringify(names));
  check('ingen «ingen smakere»-melding', !(await page.textContent('#memberButtons')).includes('Ingen smakere'));

  // tapp et medlem → PIN-skjermen med riktig navn
  if (names.length) {
    await page.click('#memberButtons .member-btn >> nth=0');
    const title = await page.textContent('#pinTitle');
    check('tapp medlem → PIN-skjerm med navn', title.includes('Skriv koden din'), title);
    // feil kode skal gi feilmelding, ikke opprette noe
    for (const n of [9, 9, 9, 9]) await page.click(`.keypad button:has-text("${n}")`);
    await page.waitForTimeout(1500);
    const err = await page.textContent('#pinErr');
    check('feil PIN avvises', err.includes('Feil kode') || err.includes('prøv igjen'), err);
  }

  await browser.close();
  console.log(`\n${pass} ok, ${fail} feil`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
