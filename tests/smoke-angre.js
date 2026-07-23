/* smoke: angre dom/lukt (ekte RPC-rundtur med E2E-rader) + «legg inn som
   variant»-knappen som forhåndsutfyller Ny ost-skjemaet. */
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

  /* 1. server-rundtur: døm ved feiltakelse → angre → borte fra tavla */
  const srv = await p.evaluate(async () => {
    await rpc('flayost_login', { p_name: 'E2E Angre', p_pin: '3344', p_avatar: '🦊', p_is_kid: true, p_create: true });
    const add = await rpc('flayost_add_cheese', { p_name: 'E2E Angre', p_pin: '3344', p_cheese_name: 'E2E Feilost', p_type: '🧀', p_photo: null, p_origin: '', p_lat: null, p_lng: null });
    await rpc('flayost_rate', { p_name: 'E2E Angre', p_pin: '3344', p_cheese_id: add.id, p_score: 5, p_note: 'oisann' });
    await rpc('flayost_stink', { p_name: 'E2E Angre', p_pin: '3344', p_cheese_id: add.id, p_stink: 4 });
    const un1 = await rpc('flayost_unrate', { p_name: 'E2E Angre', p_pin: '3344', p_cheese_id: add.id });
    const un2 = await rpc('flayost_unrate', { p_name: 'E2E Angre', p_pin: '3344', p_cheese_id: add.id, p_stink: true });
    const board = await rpc('flayost_get_board', { p_name: 'E2E Angre', p_pin: '3344' });
    const wrong = await rpc('flayost_unrate', { p_name: 'E2E Angre', p_pin: '0000', p_cheese_id: add.id });
    return { un1, un2, wrong,
      rating: board.ratings.find(r => r.member === 'E2E Angre' && r.cheese_id === add.id),
      stink: (board.stinks || []).find(s => s.member === 'E2E Angre' && s.cheese_id === add.id) };
  });
  check('angre dom ok på serveren', srv.un1?.ok === true, JSON.stringify(srv.un1));
  check('angre lukt ok på serveren', srv.un2?.ok === true);
  check('dommen er borte fra tavla', !srv.rating);
  check('lukta er borte fra tavla', !srv.stink);
  check('feil PIN avvises', srv.wrong?.ok === false);

  /* 2. UI: angre-knappene vises kun når man har dømt, og rydder lokalt */
  const ui = await p.evaluate(async () => {
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    rpc = async () => ({ ok: true });
    BOARD = { members: [{ name: 'E2E Fake', avatar: '🦊', is_kid: true }],
      cheeses: [{ id: 'c1', name: 'Tomme de Brebis (fra marknaden)', type: '🐑 Sau · Fast', added_by: 'E2E Fake', origin: 'Provence', lat: 43.8, lng: 5.8 }],
      ratings: [{ cheese_id: 'c1', member: 'E2E Fake', score: 4, note: '', updated_at: '2026-07-19T12:00:00' }],
      stinks: [] };
    enterWall(); openDetail('c1');
    const f1 = { unrate: !!document.querySelector('#dHint .unx'),
                 unstink: !!document.querySelector('#dStinkHint .unx'),
                 variHint: document.getElementById('dMeta').textContent.includes('annen utgave') };
    await unrate(false);
    const f2 = { rating: myRating('c1'), unx: !!document.querySelector('#dHint .unx') };
    return { f1, f2 };
  });
  check('subtil ✕ i hintlinja for dom, ikke for lukt', ui.f1.unrate === true && ui.f1.unstink === false, JSON.stringify(ui.f1));
  check('«annen utgave?» ligger i metalinja under tittelen', ui.f1.variHint);
  check('angre fjerner dommen lokalt og ✕-en forsvinner', !ui.f2.rating && !ui.f2.unx);

  /* 3. variantknappen forhåndsutfyller Ny ost */
  const vari = await p.evaluate(() => {
    openDetail('c1');
    newVariantFromDetail();
    return {
      name: document.getElementById('addName').value,
      variantOpen: !document.getElementById('variantWrap').classList.contains('hidden'),
      origin: addOriginPick,
      milk: addMilk[1], tex: addTex,
      addOpen: !document.getElementById('overlay-add').classList.contains('hidden'),
    };
  });
  check('variantknappen åpner Ny ost med grunnavnet', vari.addOpen && vari.name === 'Tomme de Brebis', JSON.stringify(vari));
  check('melk/type/sted arves', vari.milk === 'Sau' && vari.tex === 'Fast' && vari.origin?.origin === 'Provence');
  check('variantfeltet står åpent', vari.variantOpen);
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
