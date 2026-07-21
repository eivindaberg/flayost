// Emits SQL INSERT statements for flayost_cheese_species, generated straight
// from the live CHEESES_FR array in index.html — avoids hand-transcribing
// ~94 rows into a migration and getting one wrong.
// Usage: node tools/generate-cheese-seed.js > /tmp/seed.sql
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/const CHEESES_FR = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('Fant ikke CHEESES_FR'); process.exit(1); }
const CHEESES_FR = new Function('return ' + m[1])();

const sqlStr = v => v === undefined || v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const sqlNum = v => v === undefined || v === null ? 'null' : Number(v);

console.log('insert into public.flayost_cheese_species (name, milk, tex, origin, lat, lng, img) values');
console.log(CHEESES_FR.map(c =>
  `  (${sqlStr(c.name)}, ${sqlStr(c.milk)}, ${sqlStr(c.tex)}, ${sqlStr(c.origin)}, ${sqlNum(c.lat)}, ${sqlNum(c.lng)}, ${sqlStr(c.img)})`
).join(',\n') + '\non conflict (name) do nothing;');
