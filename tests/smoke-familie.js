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

  /* 1. ekte server-rundtur med E2E-medlem */
  const srv = await p.evaluate(async () => {
    await rpc('flayost_login', { p_name: 'E2E Fam', p_pin: '1122', p_avatar: '🦊', p_is_kid: false, p_create: true });
    const set = await rpc('flayost_set_family', { p_name: 'E2E Fam', p_pin: '1122', p_family: '  E2E Hytta  ' });
    const who = await rpc('flayost_who', {});
    const board = await rpc('flayost_get_board', { p_name: 'E2E Fam', p_pin: '1122' });
    const wrong = await rpc('flayost_set_family', { p_name: 'E2E Fam', p_pin: '9999', p_family: 'Hack' });
    return { set, whoHasE2E: who.some(m => m.name === 'E2E Fam'), boardFam: board.members.find(m => m.name === 'E2E Fam')?.family, wrong };
  });
  check('set_family lagrer (og trimmer)', srv.set.ok && srv.set.family === 'E2E Hytta', JSON.stringify(srv.set));
  // flayost_who() skjuler ALLTID «E2E …»-navn (ingen innlogget bruker å
  // skille på — det er den anonyme startskjerm-lista) — bekreft det
  check('flayost_who skjuler E2E-testmedlemmer (uansett hvem som spør)', srv.whoHasE2E === false);
  check('get_board bærer family (kalt SOM E2E-medlemmet selv, ser egen data)', srv.boardFam === 'E2E Hytta', srv.boardFam);
  check('feil PIN avvises', srv.wrong && srv.wrong.ok === false, JSON.stringify(srv.wrong));

  /* 2. UI: login-gruppering, Min side, Familieligaen */
  await p.evaluate(() => {
    WHO = [
      { name: 'Eivind', avatar: '🦊', family: 'Hytta i Flayosc' }, { name: 'Aurora', avatar: '🥐', family: 'Hytta i Flayosc' },
      { name: 'Fredrik', avatar: '🦉', family: 'Oslo-gjengen' }, { name: 'Nykommer', avatar: '🐢', family: null },
    ];
    showWho();
  });
  const heads = await p.$$eval('#memberButtons .famhead', els => els.map(e => e.textContent));
  check('login grupperer per familie', heads.length === 3 && heads[0].includes('Hytta') && heads[1].includes('Oslo'), JSON.stringify(heads));
  check('ugrupperte havner under «Flere smakere»', heads[2] === 'Flere smakere');

  const ui = await p.evaluate(() => {
    SESS = { name: 'Eivind', pin: '0000', avatar: '🦊', is_kid: false };
    const D = '2026-07-19T12:00:00';
    BOARD = { members: [
        { name: 'Eivind', avatar: '🦊', is_kid: false, family: 'Hytta i Flayosc' },
        { name: 'Aurora', avatar: '🥐', is_kid: true, family: 'Hytta i Flayosc' },
        { name: 'Fredrik', avatar: '🦉', is_kid: false, family: 'Oslo-gjengen' },
        { name: 'Nykommer', avatar: '🐢', is_kid: true, family: null }],
      cheeses: [{ id: 'c1', name: 'Comté', type: '🐄 Ku', added_by: 'Eivind' }],
      ratings: [{ cheese_id: 'c1', member: 'Eivind', score: 5, note: '', updated_at: D },
                { cheese_id: 'c1', member: 'Aurora', score: 4, note: '', updated_at: D }],
      stinks: [] };
    enterWall(); openMe();
    const fam = document.getElementById('meFamily').value;
    const datalist = document.getElementById('familyList').innerHTML;
    closeMe(); setTab('pass');
    return { fam, datalist };
  });
  check('Min side viser egen gruppe', ui.fam === 'Hytta i Flayosc', ui.fam);
  check('datalist foreslår eksisterende grupper', ui.datalist.includes('Oslo-gjengen'));
  await p.waitForTimeout(300);
  const passHtml = await p.evaluate(() => document.getElementById('pass').innerHTML);
  check('🏡 Familieligaen vises med to grupper', passHtml.includes('Familieligaen') && passHtml.includes('Hytta i Flayosc') && passHtml.includes('Oslo-gjengen'));
  const ligaRows = await p.$$eval('#pass .rline', els => els.map(e => e.textContent.replace(/\s+/g, ' ')).filter(t => t.includes('smaker') && t.includes('merker')));
  // eksakt merkeantall varierer med hvor mange merker som finnes totalt —
  // sjekk rangeringen (Hytta > Oslo), ikke et hardkodet tall
  check('Hytta leder ligaen per capita (høyere snitt enn Oslo)', ligaRows[0]?.includes('🥇') && ligaRows[0]?.includes('Hytta') && ligaRows[1]?.includes('0.0 merker/smaker'), JSON.stringify(ligaRows));
  await p.waitForFunction(() => document.getElementById('pass').innerHTML.includes('Familiens stempler'), { timeout: 15000 });
  const passHtml2 = await p.evaluate(() => document.getElementById('pass').innerHTML);
  check('stempelrader viser familietag', passHtml2.includes('🏡 Oslo-gjengen'));
  await b.close();
  console.log(`\n${pass} ok, ${fail} feil`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
