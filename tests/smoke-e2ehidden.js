/* smoke: E2E-testdata skal ALDRI vises til ekte familiemedlemmer, selv om
   opprydding skulle glippe. Regresjon for 2026-07-20-hendelsen der 12
   E2E-oster ble stående på tavla etter en avbrutt testkjøring.

   2026-07-23: «E2E-utenom Fam» (bindestrek, ikke mellomrom) var ment å late
   som et EKTE medlem for sjekk #2 under, men navnet startet fortsatt på
   «E2E» og filteret dengang matchet kun 'E2E ' (med mellomrom) — så denne
   kontoen sto synlig på familiens ekte innloggingsskjerm i tre dager.
   Filteret er nå bredere ('E2E%', se migrasjon …0723000002), så stand-in-
   kontoen MÅ hete noe som ikke begynner på E2E i det hele tatt (ellers ville
   den selv fått v_show_e2e=true og sett andre E2E-testeres søppel — som
   ville ødelagt akkurat det denne testen skal bevise). Den rydder derfor
   seg selv opp til slutt i stedet for å stole på tests/run.sh sin E2E%-feie. */
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
    // lag ekte E2E-testdata på serveren, uten å rydde opp underveis —
    // simulerer akkurat scenarioet som utløste buggen
    const login = await rpc('flayost_login', { p_name: 'E2E Ghost', p_pin: '7777', p_avatar: '👻', p_is_kid: true, p_create: true });
    const add = await rpc('flayost_add_cheese', { p_name: 'E2E Ghost', p_pin: '7777', p_cheese_name: 'E2E Spøkelsesost', p_type: '🧀', p_photo: null, p_origin: '', p_lat: null, p_lng: null });
    await rpc('flayost_rate', { p_name: 'E2E Ghost', p_pin: '7777', p_cheese_id: add.id, p_score: 5, p_note: '' });

    // 1. flayost_who — den anonyme startskjerm-lista alle enheter ser
    const who = await rpc('flayost_who', {});

    // 2. flayost_get_board kalt SOM ET EKTE FAMILIEMEDLEM (ikke E2E-navn)
    const board = await rpc('flayost_get_board', { p_name: 'Eivind', p_pin: '0000' }).catch(e => ({ ok: false, error: 'wrong_pin' }));
    // (PIN-en over stemmer nesten sikkert ikke — vi trenger bare responsen
    // for å sjekke at den EVENTUELT lykkes-varianten aldri ville lekke E2E.
    // Bruk i stedet en fersk, ekte (IKKE E2E-prefikset i det hele tatt)
    // test-konto med kjent PIN — se filhode-kommentaren for hvorfor:
    await rpc('flayost_login', { p_name: 'Ikke-E2E Test', p_pin: '4444', p_avatar: '🦊', p_is_kid: true, p_create: true });
    const realBoard = await rpc('flayost_get_board', { p_name: 'Ikke-E2E Test', p_pin: '4444' });

    return { who, realBoard, ghostCheeseId: add.id };
  });

  check('flayost_who viser aldri E2E-navn', !r.who.some(m => m.name.startsWith('E2E')), JSON.stringify(r.who.filter(m=>m.name.startsWith('E2E'))));
  check('ekte medlem ser ALDRI E2E-oster i get_board', !r.realBoard.cheeses.some(c => c.name.startsWith('E2E')), JSON.stringify(r.realBoard.cheeses.filter(c=>c.name?.startsWith('E2E'))));
  check('ekte medlem ser ALDRI E2E-medlemmer i get_board', !r.realBoard.members.some(m => m.name.startsWith('E2E')), JSON.stringify(r.realBoard.members.filter(m=>m.name.startsWith('E2E'))));
  check('ekte medlem ser ALDRI E2E-dommer i get_board', !r.realBoard.ratings.some(rt => rt.member.startsWith('E2E')));

  // men EN E2E-konto ser fortsatt SIN EGEN testdata (tester trenger dette)
  const own = await p.evaluate(async ghostId => {
    const board = await rpc('flayost_get_board', { p_name: 'E2E Ghost', p_pin: '7777' });
    return { hasOwnCheese: board.cheeses.some(c => c.id === ghostId), hasOwnRating: board.ratings.some(r => r.member === 'E2E Ghost') };
  }, r.ghostCheeseId);
  check('en E2E-konto ser fortsatt sin EGEN testdata (nødvendig for testene)', own.hasOwnCheese && own.hasOwnRating, JSON.stringify(own));

  // login-skjermens medlemsknapper skal aldri vise E2E-navn selv om WHO
  // (den fulle, ufiltrerte listen fra serveren) skulle inneholde det
  await p.evaluate(() => { WHO = [{ name: 'E2E Sniked Inn', avatar: '👻', family: null }, { name: 'Eivind', avatar: '🦊', family: null }]; showWho(); });
  const buttons = await p.$$eval('#memberButtons .member-btn', els => els.map(e => e.textContent));
  check('klienten viser aldri en E2E-knapp selv om servergrunnlaget skulle inneholde en', !buttons.some(t => t.includes('E2E')), JSON.stringify(buttons));

  await b.close();

  // «Ikke-E2E Test» begynner med vilje ikke på E2E (se filhode), så
  // tests/run.sh sin E2E%-opprydding fanger den ALDRI — rydd den selv.
  try {
    const https = require('https');
    const { execSync } = require('child_process');
    const raw = execSync('security find-generic-password -s "Supabase CLI" -w 2>/dev/null | sed "s/go-keyring-base64://" | base64 -d', { encoding: 'utf8' }).trim();
    if (raw) {
      await new Promise((resolve) => {
        const body = JSON.stringify({ query: "delete from flayost_members where name = 'Ikke-E2E Test';" });
        const req = https.request('https://api.supabase.com/v1/projects/fvafwggxvnsmqedmdmdz/database/query', {
          method: 'POST',
          headers: { Authorization: `Bearer ${raw}`, 'Content-Type': 'application/json' },
        }, res => { res.on('data', () => {}); res.on('end', resolve); });
        req.on('error', resolve);
        req.write(body); req.end();
      });
    }
  } catch (e) { /* opprydding er best-effort — feiler den, rydd manuelt senere */ }

  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
