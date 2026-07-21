// Sanity-checks CHEESES_FR in index.html — no server, no browser needed.
// Run locally: node tools/validate-cheeses.js
// Runs in CI on every PR (.github/workflows/ci.yml) as a fast pre-merge gate.
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/const CHEESES_FR = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('❌ Fant ikke CHEESES_FR i index.html'); process.exit(1); }
const CHEESES_FR = new Function('return ' + m[1])();

const MILKS = new Set(['Ku', 'Geit', 'Sau']);
const TEXTURES = new Set(['Myk', 'Fast', 'Blå', 'Fersk']);
// Generous bounding box covering mainland France + Corsica
const LAT_RANGE = [41.0, 51.5];
const LNG_RANGE = [-5.5, 9.8];

let errors = [];
const seenNames = new Map();

CHEESES_FR.forEach((c, i) => {
  const where = `#${i} (${c.name || '<uten navn>'})`;
  if (!c.name || !c.name.trim()) errors.push(`${where}: mangler navn`);
  else {
    const key = c.name.trim().toLowerCase();
    if (seenNames.has(key)) errors.push(`${where}: duplikat av #${seenNames.get(key)}`);
    seenNames.set(key, i);
  }
  if (!MILKS.has(c.milk)) errors.push(`${where}: ugyldig milk "${c.milk}"`);
  if (c.tex !== undefined && !TEXTURES.has(c.tex)) errors.push(`${where}: ugyldig tex "${c.tex}"`);
  if (typeof c.lat !== 'number' || c.lat < LAT_RANGE[0] || c.lat > LAT_RANGE[1]) errors.push(`${where}: lat ${c.lat} utenfor Frankrike-boksen`);
  if (typeof c.lng !== 'number' || c.lng < LNG_RANGE[0] || c.lng > LNG_RANGE[1]) errors.push(`${where}: lng ${c.lng} utenfor Frankrike-boksen`);
  if (c.img !== undefined && !/^https:\/\//.test(c.img)) errors.push(`${where}: img ser ikke ut som en https-URL`);
  if (!c.origin || !c.origin.trim()) errors.push(`${where}: mangler origin`);
});

const withImg = CHEESES_FR.filter(c => c.img).length;
console.log(`${CHEESES_FR.length} oster sjekket · ${withImg} med bilde · ${CHEESES_FR.length - withImg} uten (mystery-kort)`);

if (errors.length) {
  console.error(`\n❌ ${errors.length} problem(er):`);
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('✅ CHEESES_FR ser riktig ut');
