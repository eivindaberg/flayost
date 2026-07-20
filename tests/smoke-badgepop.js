/* smoke: badge toasts must NOT fire from passive syncs (page load,
   background refresh) — only from the user's own rate()/rateStink() action.
   Regression test for the "constant popup on reload" bug (2026-07-20). */
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

  const r = await p.evaluate(async () => {
    localStorage.clear();
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    // 9 oster, E2E Fake har alt rated 4 av dem (rett under Femkamp-grensa på 5)
    const cheeses = [], ratings = [];
    for (let i = 0; i < 9; i++) cheeses.push({ id: 'c'+i, name: 'Ost '+i, type: '🐄 Ku', added_by: 'Anna' });
    for (let i = 0; i < 4; i++) ratings.push({ cheese_id: 'c'+i, member: 'E2E Fake', score: 3, note: '', updated_at: '2026-07-19T12:00:00' });
    BOARD = { members: [{ name: 'E2E Fake', avatar: '🦊', is_kid: true }], cheeses, ratings, stinks: [] };
    let toasts = [];
    const origToast = window.toast;
    toast = (msg) => { toasts.push(msg); origToast(msg); };
    rpc = async () => ({ ok: true }); // ingen produksjonsskriving

    // 1. "sideinnlasting" — første renderAll() med et bo som allerede har
    // opptjente merker (Første ost), localStorage tom fra før
    enterWall();
    const afterFirstLoad = toasts.length;

    // 2. "bakgrunnssynk" flere ganger i strekk (simulerer 90s-timer +
    // visibilitychange) — samme bo, ingenting nytt skal dukke opp
    for (let i = 0; i < 5; i++) renderAll();
    const afterBgSyncs = toasts.length;

    // 3. et OFFENTLIG endret bo (simulerer at ANDRE familiemedlemmer har
    // rated ting som endrer merkegrunnlaget ditt) synkes stille inn
    for (let i = 4; i < 9; i++) BOARD.ratings.push({ cheese_id: 'c'+i, member: 'Bob', score: 3, note: '', updated_at: '2026-07-19T13:00:00' });
    renderAll(); renderAll();
    const afterDataChangeSync = toasts.length;

    // 4. NÅ rater du selv den 5. osten → skal utløse Femkamp (🖐️) med toast
    await rate('c4', 4);
    const afterOwnAction = toasts.length;

    return { afterFirstLoad, afterBgSyncs, afterDataChangeSync, afterOwnAction, toasts };
  });

  check('ingen toast ved første sideinnlasting (kun stille sync)', r.afterFirstLoad === 0, JSON.stringify(r.toasts));
  check('ingen toast fra gjentatte bakgrunnssynker', r.afterBgSyncs === 0, JSON.stringify(r.toasts));
  check('ingen toast selv når andres data endrer merkegrunnlaget stille', r.afterDataChangeSync === 0, JSON.stringify(r.toasts));
  check('toast KOMMER når du selv rater noe', r.afterOwnAction > r.afterDataChangeSync, JSON.stringify(r.toasts));

  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
