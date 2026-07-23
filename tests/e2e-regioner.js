/* e2e: regionautocomplete, pass-ministempler (SVG) og «Min side».
   Produksjonstrygg: skriver kun medlemmet «E2E Panel» (ryddes av kjøreren). */
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
  const page = await browser.newPage();
  await page.goto('http://localhost:8899/app.html', { waitUntil: 'domcontentloaded' });

  /* ---- 1. regionautocomplete i «Ny ost» ---- */
  await page.evaluate(() => openAdd());
  await page.fill('#addOrigin', 'norm');
  await page.dispatchEvent('#addOrigin', 'input');
  const sug = await page.$$eval('#origList .sugitem', els => els.map(e => e.textContent.trim()));
  check('«norm» foreslår Normandie', sug.some(s => s.includes('Normandie')), JSON.stringify(sug));
  await page.dispatchEvent('#origList .sugitem:has-text("Normandie")', 'pointerdown');
  await page.waitForTimeout(100);
  const oline = await page.textContent('#originLine');
  check('valgt region vises som 📍 Normandie', oline.includes('Normandie'));
  check('manuelt felt skjules ved valg', await page.$eval('#originManual', e => e.classList.contains('hidden')));
  const pick = await page.evaluate(() => addOriginPick);
  check('valgt region har koordinater', pick && Math.abs(pick.lat - 49.0) < 0.01 && pick.origin === 'Normandie', JSON.stringify(pick));
  await page.click('#originLine button');
  check('✕ nullstiller valget', await page.evaluate(() => addOriginPick === null));
  await page.evaluate(() => closeAdd());

  /* ---- 2. REGIONS_FR-koordinater treffer riktig polygon ---- */
  await page.evaluate(() => loadRegions());
  await page.waitForFunction(() => !!regionsGeo, { timeout: 15000 });
  const geoCheck = await page.evaluate(() => {
    const fr = regionsGeo.features.filter(f => f.properties._country === 'Frankrike');
    const admin = fr.map(f => f.properties._stampName);
    const bad = [];
    for (const r of REGIONS_FR) {
      const hit = fr.find(f => inRegion(r.lat, r.lng, f));
      if (!hit) bad.push(r.name + ' → utenfor alle regioner');
      else if (admin.includes(r.name) && hit.properties._stampName !== r.name)
        bad.push(r.name + ' → havnet i ' + hit.properties._stampName);
    }
    return { n: REGIONS_FR.length, bad };
  });
  check(`alle ${geoCheck.n} regionkoordinater treffer riktig polygon`, geoCheck.bad.length === 0, JSON.stringify(geoCheck.bad));

  /* ---- 3. passtempler er minikart, ikke fly ---- */
  await page.evaluate(() => { SESS = { name: 'E2E Fake', avatar: '🦊', is_kid: true }; TAB = 'pass'; renderPass(); });
  await page.waitForTimeout(300);
  const svgs = await page.$$eval('#pass .stamp svg.sreg path', els => els.map(e => e.getAttribute('d')));
  // distinkte (land, regionnavn)-par — enklaver/øyer deles ofte i flere features
  // med samme navn, og passet viser da ett stempelkort per navn, ikke per bit
  const expectedStamps = await page.evaluate(() =>
    new Set(regionsGeo.features.map(f => f.properties._country + '|' + f.properties._stampName)).size);
  check(`${expectedStamps} stempler har SVG-minikart (ett per distinkt region, alle land)`,
    svgs.length === expectedStamps, `fant ${svgs.length}`);
  check('alle kartene har tegnedata', svgs.every(d => d && d.startsWith('M') && d.length > 50));
  check('ingen ✈️ igjen i passet', !(await page.textContent('#pass')).includes('✈️'));

  /* ---- 4. Min side: bytt figur (ekte rundtur med E2E-medlem) ---- */
  const login = await page.evaluate(() => rpc('flayost_login', { p_name: 'E2E Panel', p_pin: '4321', p_avatar: '🦊', p_is_kid: true, p_create: true }));
  check('E2E-medlem opprettet/logget inn', login && login.ok, JSON.stringify(login));
  await page.evaluate(l => { SESS = { name: l.member.name, pin: '4321', avatar: l.member.avatar, is_kid: true }; }, login);
  await page.evaluate(() => openMe());
  const gridN = await page.$$eval('#meAvaGrid button', els => els.length);
  check('figur-rutenettet vises', gridN > 20, `fant ${gridN}`);
  check('nåværende figur er markert', await page.$eval('#meAvaGrid button.on', e => e.textContent) === '🦊');
  await page.click('#meAvaGrid button:has-text("🐸")');
  await page.waitForTimeout(1200);
  check('ny figur markert i panelet', await page.$eval('#meAvaGrid button.on', e => e.textContent) === '🐸');
  check('SESS oppdatert', await page.evaluate(() => SESS.avatar) === '🐸');
  const verify = await page.evaluate(() => rpc('flayost_login', { p_name: 'E2E Panel', p_pin: '4321', p_create: false }));
  check('serveren husker ny figur', verify && verify.ok && verify.member.avatar === '🐸', JSON.stringify(verify && verify.member));

  await browser.close();
  console.log(`\n${pass} ok, ${fail} feil`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
