/* Dev-tid: finn et bilde per ost i CHEESES_FR via fr.wikipedia pageimages.
   Strategi per navn: eksakt tittel → «X (fromage)» → søk «X fromage». */
const fs = require('fs');
const html = fs.readFileSync('/Users/eivind/Projects/flayost/index.html', 'utf8');
const block = html.match(/const CHEESES_FR = \[([\s\S]*?)\n\];/)[1];
const names = [...block.matchAll(/\{name:(?:'((?:[^'\\]|\\.)*)'|"([^"]*)")/g)].map(m => (m[1] || m[2]).replace(/\\'/g, "'"));
const UA = { headers: { 'User-Agent': 'flayost-family-app/1.0 (mathanos@gmail.com)' } };

async function thumbByTitle(title) {
  const u = `https://fr.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=480&redirects=1&titles=${encodeURIComponent(title)}`;
  const j = await (await fetch(u, UA)).json();
  const p = Object.values(j.query?.pages || {})[0];
  return p?.thumbnail?.source || null;
}
async function thumbBySearch(q) {
  const u = `https://fr.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=480`;
  const j = await (await fetch(u, UA)).json();
  const p = Object.values(j.query?.pages || {})[0];
  return p?.thumbnail?.source || null;
}
(async () => {
  const out = {}, miss = [];
  for (const n of names) {
    let img = await thumbByTitle(n) || await thumbByTitle(n + ' (fromage)') || await thumbBySearch(n + ' fromage');
    if (img) out[n] = img; else miss.push(n);
    process.stderr.write('.');
    await new Promise(r => setTimeout(r, 120));
  }
  fs.writeFileSync('cheese-imgs.json', JSON.stringify(out, null, 1));
  console.error(`\n${Object.keys(out).length}/${names.length} bilder funnet. Mangler: ${miss.join(', ') || 'ingen'}`);
})();
