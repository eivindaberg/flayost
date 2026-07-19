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

  /* 1. countryOf: kjente osteområder havner i riktig land */
  const geo = await p.evaluate(() => ({
    parma: countryOf(44.80, 10.33), cheddar: countryOf(51.28, -2.78), gruyeres: countryOf(46.58, 7.08),
    besancon: countryOf(47.24, 6.03), corte: countryOf(42.30, 9.15), gouda: countryOf(52.01, 4.71),
    bearn: countryOf(43.30, -0.37), manchego: countryOf(39.0, -3.0), oslo: countryOf(59.91, 10.75),
    feta: countryOf(40.6, 22.9), nice: countryOf(43.70, 7.26), montdor: countryOf(46.727, 6.356),
  }));
  check('Parma → Italia', geo.parma === 'Italia', geo.parma);
  check('Cheddar → Storbritannia', geo.cheddar === 'Storbritannia', geo.cheddar);
  check('Gruyères → Sveits', geo.gruyeres === 'Sveits', geo.gruyeres);
  check('Besançon/Franche-Comté → Frankrike (null)', geo.besancon === null, geo.besancon);
  check('Korsika → Frankrike (null)', geo.corte === null, geo.corte);
  check('Gouda → Nederland', geo.gouda === 'Nederland', geo.gouda);
  check('fransk Baskerland → Frankrike (null)', geo.bearn === null, geo.bearn);
  check('La Mancha → Spania', geo.manchego === 'Spania', geo.manchego);
  check('Oslo → Norge', geo.oslo === 'Norge', geo.oslo);
  check('Hellas → Hellas', geo.feta === 'Hellas', geo.feta);
  check('Nice → Frankrike (null)', geo.nice === null, geo.nice);
  check('Mont d\'Or (fransk grenseost) → Frankrike', geo.montdor === null, geo.montdor);

  /* 2. landmerker */
  const earned = await p.evaluate(() => {
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    const D = '2026-07-19T12:00:00';
    const spots = [[44.8,10.33],[51.28,-2.78],[46.58,7.08],[52.01,4.71],[39.0,-3.0]];
    const cheeses = spots.map(([la,lo],i)=>({ id:'c'+i, name:'Utenlandsost '+i, type:'🐄 Ku', added_by:'Anna', photo:null, lat:la, lng:lo, origin:'x' }));
    const ratings = spots.map((_,i)=>({ cheese_id:'c'+i, member:'E2E Fake', score:4, note:'', updated_at:D }));
    BOARD = { members:[{name:'E2E Fake',avatar:'🦊',is_kid:true}], cheeses, ratings, stinks:[] };
    return earnedBadges().map(x=>x.id);
  });
  ['italia','england','sveits','holland','spania','turist','verden5'].forEach(id =>
    check(`landmerke «${id}» opptjent`, earned.includes(id)));
  check('teller: 63 merker totalt', await p.evaluate(() => BADGES.length) === 63);

  /* 3. variantflyt i «Ny ost» (stubbet lagring) */
  const saved = await p.evaluate(async () => {
    let sent = null;
    rpc = async (fn, args) => { sent = { fn, args }; return { ok: true }; };
    refreshBoard = async () => {}; setTab = () => {};
    openAdd();
    document.getElementById('addName').value = 'Cheddar';
    toggleVariant();
    document.getElementById('addVariant').value = 'Westcombe · 18 mnd';
    await saveCheese();
    return sent;
  });
  check('variant bakes inn i navnet', saved.args.p_cheese_name === 'Cheddar (Westcombe · 18 mnd)', saved.args.p_cheese_name);
  const varVisible = await p.evaluate(() => { openAdd(); return document.getElementById('variantWrap').classList.contains('hidden'); });
  check('variantfeltet er skjult som standard (UX)', varVisible);

  /* 4. kort + detalj viser variant på egen linje */
  const disp = await p.evaluate(() => {
    BOARD.cheeses.push({ id:'cv', name:'Cheddar (Westcombe · 18 mnd)', type:'🐄 Ku', added_by:'Anna', photo:null });
    enterWall();
    renderWall();
    const card = [...document.querySelectorAll('.cheese .name')].find(e=>e.textContent.includes('Cheddar'));
    openDetail('cv');
    return { card: card?.innerHTML, detail: document.getElementById('dName').innerHTML };
  });
  check('kortet deler navn/variant', disp.card?.includes('class="vari"') && disp.card.includes('Westcombe'), disp.card);
  check('detaljarket deler navn/variant', disp.detail?.includes('class="vari"'), disp.detail);
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
