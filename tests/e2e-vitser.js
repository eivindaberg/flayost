/* e2e: ostevitser — sjekker fellesvits på login, rotasjon ved reload,
   og melke-/navnestyrte vitser i «Ny ost». Rører ikke databasen. */
const { chromium } = require('playwright-core');
const path = require('path');
const os = require('os');

const EXEC = (() => {
  const base = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const fs = require('fs');
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
  const page = await browser.newPage();
  const url = 'http://localhost:8899/index.html';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const pools = await page.evaluate(() => OSTEVITSER);

  // 1. fellesvits vises på login
  const v1 = await page.textContent('#vits-login');
  check('login-vits vises og er fra felles-pakka', pools.felles.includes(v1), v1);

  // 2. samme vits speiles på veggen (samme innlasting)
  const vWall = await page.textContent('#vits-wall');
  check('vegg-vits lik login-vits', vWall === v1);

  // 3. reload gir fortsatt gyldig vits (og som regel en ny)
  const seen = new Set([v1]);
  for (let i = 0; i < 6; i++) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    seen.add(await page.textContent('#vits-login'));
  }
  check('vitsen roterer ved reload (>1 unik på 7 innlastinger)', seen.size > 1, [...seen].join(' | '));
  check('alle roterte vitser er fra felles-pakka', [...seen].every(v => pools.felles.includes(v)));

  // 4. «Ny ost»: standard (ku) gir kuvits
  await page.evaluate(() => openAdd());
  await page.waitForTimeout(200);
  const vKu = await page.textContent('#vits-add');
  check('åpne skjema → kuvits (standardmelk)', pools.Ku.includes(vKu), vKu);

  // 5. velg 🐐 → geitevits
  await page.click('#milkRow button:has-text("Geit")');
  const vGeit = await page.textContent('#vits-add');
  check('velg geit → geitevits', pools.Geit.includes(vGeit), vGeit);

  // 6. velg 🐑 → sauevits, 🤔 → mysteri-vits
  await page.click('#milkRow button:has-text("Sau")');
  check('velg sau → sauevits', pools.Sau.includes(await page.textContent('#vits-add')));
  await page.click('#milkRow button:has-text("Vet ikke")');
  check('velg vet-ikke → mysterievits', pools['Vet ikke'].includes(await page.textContent('#vits-add')));

  // 7. skriv «Brie de Meaux» → brie-vits vinner over melketype
  await page.fill('#addName', 'Brie de Meaux');
  await page.dispatchEvent('#addName', 'input');
  await page.waitForTimeout(100);
  const vBrie = await page.textContent('#vits-add');
  const briePool = Object.fromEntries(pools.navn)['brie'];
  check('navn «Brie de Meaux» → brie-vits', briePool.includes(vBrie), vBrie);

  // 8. vitsen står stille mens man skriver videre (ingen hopping)
  await page.fill('#addName', 'Brie de Meaux x');
  await page.dispatchEvent('#addName', 'input');
  check('vits hopper ikke ved videre tasting', (await page.textContent('#vits-add')) === vBrie);

  // 9. autoforslag: velg Roquefort → roquefort-vits (navn slår melk)
  await page.fill('#addName', 'Roquef');
  await page.dispatchEvent('#addName', 'input');
  await page.waitForTimeout(500);
  await page.dispatchEvent('.sugitem:has-text("Roquefort")', 'pointerdown');
  await page.waitForTimeout(100);
  const vRoq = await page.textContent('#vits-add');
  const roqPool = Object.fromEntries(pools.navn)['roquefort'];
  check('forslag Roquefort → roquefort-vits', roqPool.includes(vRoq), vRoq);

  // 10. tøm navnet → tilbake til melkevits (Roquefort satte sau)
  await page.fill('#addName', '');
  await page.dispatchEvent('#addName', 'input');
  await page.waitForTimeout(100);
  check('tomt navn → tilbake til melkevits (sau)', pools.Sau.includes(await page.textContent('#vits-add')));

  /* ---- personlige barnevitser på tavla ---- */
  const barn = await page.evaluate(() => {
    BOARD = { members: [], cheeses: [], ratings: [], stinks: [] };
    const res = {};
    for (const navn of ['Aslak', 'Eira', 'Ellinor', 'Aurora', 'Asta', 'Alfred', 'Eivind']) {
      SESS = { name: navn, pin: '0000', avatar: '🦊', is_kid: true };
      const sett = new Set();
      for (let i = 0; i < 40; i++) { enterWall(); sett.add(document.getElementById('vits-wall').textContent); }
      res[navn] = {
        egen: [...sett].some(v => v === OSTEVITSER.barn[navn]),
        felles: [...sett].some(v => OSTEVITSER.felles.includes(v)),
        andres: [...sett].some(v => Object.entries(OSTEVITSER.barn).some(([n, j]) => n !== navn && v === j)),
      };
    }
    return res;
  });
  for (const navn of ['Aslak', 'Eira', 'Ellinor', 'Aurora', 'Asta', 'Alfred']) {
    check(`${navn} får sin egen vits (og fellesvitser)`, barn[navn].egen && barn[navn].felles && !barn[navn].andres, JSON.stringify(barn[navn]));
  }
  check('voksne får aldri barnevitser', !barn['Eivind'].egen && !barn['Eivind'].andres && barn['Eivind'].felles);

  await browser.close();
  console.log(`\n${pass} ok, ${fail} feil`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
