/* smoke: 8 new hidden badges (textures, balance, first+last, streaks,
   distance, full house, prolific notes) + the expanded avatar list. */
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

  const earned = await p.evaluate(() => {
    SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true };
    const ME = 'E2E Fake';
    const cheeses = [], ratings = [];
    // 12 oster: 3 dager på rad, spredt score (>=2 av hver), alle teksturer,
    // Auckland NZ (~18 800 km, alene nok for kilometersummen) og resten nært
    const texs = ['Myk','Myk','Fast','Fast','Blå','Blå','Fersk','Fersk','Myk','Fast','Blå','Fersk'];
    const scores = [1,1,2,2,3,3,4,4,5,5,1,2];
    const dager = ['2026-07-17','2026-07-17','2026-07-18','2026-07-18','2026-07-19','2026-07-19',
                   '2026-07-17','2026-07-18','2026-07-19','2026-07-17','2026-07-18','2026-07-19'];
    for (let i = 0; i < 12; i++) {
      const far = i === 0;
      cheeses.push({ id: 'c' + i, name: 'Ost ' + i, type: '🐄 Ku · ' + texs[i], added_by: 'Anna',
        lat: far ? -36.85 : 44.04, lng: far ? 174.76 : 5.63 });
      ratings.push({ cheese_id: 'c' + i, member: ME, score: scores[i], note: '', updated_at: dager[i] + 'T12:00:00' });
    }
    BOARD = { members: [{ name: ME, avatar: '🦊', is_kid: true }], cheeses, ratings, stinks: [] };
    return earnedBadges().map(x => x.id);
  });
  check('🧵 Teksturmester (alle 4 teksturer)', earned.includes('tekstur'), JSON.stringify(earned));
  check('⚖️ Balansekunstner (min 2 av hver dom)', earned.includes('jevnt'));
  check('📖 Fra start til slutt (første og siste ost)', earned.includes('forsiste'));
  check('🔥 Tre på rad (3 sammenhengende dager)', earned.includes('rad3'));
  check('🏅 Ei hel uke IKKE opptjent (kun 3 dager)', !earned.includes('rad7'));
  check('🌍 Kilometerkonge (Vik i Sogn er >10 000 km unna)', earned.includes('kilomega'));
  check('🏠 Fullt hus (dømt alle 12 oster)', earned.includes('fulltHus'));
  check('📚 Osteforfatteren IKKE opptjent (0 notater)', !earned.includes('notat20'));
  check('78 merker totalt', await p.evaluate(() => BADGES.length) === 78);

  // Osteforfatteren (20 notater) separat, enklere bo
  const notat = await p.evaluate(() => {
    const cheeses = [], ratings = [];
    for (let i = 0; i < 20; i++) {
      cheeses.push({ id: 'n' + i, name: 'Notatost ' + i, type: '🐄 Ku', added_by: 'Anna' });
      ratings.push({ cheese_id: 'n' + i, member: 'E2E Fake', score: 3, note: 'God ost!', updated_at: '2026-07-19T12:00:00' });
    }
    BOARD = { members: [{ name: 'E2E Fake', avatar: '🦊', is_kid: true }], cheeses, ratings, stinks: [] };
    return earnedBadges().map(x => x.id);
  });
  check('📚 Osteforfatteren (20 notater)', notat.includes('notat20'));

  // avatarlisten er stor og uten duplikater
  const av = await p.evaluate(() => ({ n: AVATARS.length, unike: new Set(AVATARS).size }));
  check('AVATARS har minst 100 figurer', av.n >= 100, 'n=' + av.n);
  check('ingen duplikater i AVATARS', av.n === av.unike, JSON.stringify(av));
  await p.evaluate(() => { SESS = { name: 'E2E Fake', pin: '0000', avatar: '🦊', is_kid: true }; openMe(); });
  const gridN = await p.$$eval('#meAvaGrid button', els => els.length);
  check('figurvelgeren viser alle figurene', gridN === av.n, `grid=${gridN} vs ${av.n}`);

  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
