const fs = require('fs');
const m = require('./cheese-imgs.json');
const UA = { headers: { 'User-Agent': 'flayost-family-app/1.0 (mathanos@gmail.com)' } };
async function thumbByTitle(title) {
  const u = `https://fr.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=480&redirects=1&titles=${encodeURIComponent(title)}`;
  const j = await (await fetch(u, UA)).json();
  return Object.values(j.query?.pages || {})[0]?.thumbnail?.source || null;
}
async function commonsSearch(q) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=480`;
  const j = await (await fetch(u, UA)).json();
  return Object.values(j.query?.pages || {})[0]?.imageinfo?.[0]?.thumburl || null;
}
(async () => {
  const fromage = ['Époisses', 'Sainte-Maure de Touraine', 'Valençay', 'Pouligny-Saint-Pierre', 'Mâconnais'];
  for (const n of fromage) {
    const img = await thumbByTitle(n + ' (fromage)') || await commonsSearch(n + ' fromage');
    if (img) m[n] = img; else delete m[n];
    console.log(n, '→', img ? decodeURIComponent(img.split('/').pop()) : 'FJERNET');
  }
  for (const [n, q] of [['Kiri', 'Kiri cheese portion'], ['La vache qui rit', 'Vache qui rit portion cheese']]) {
    const img = await commonsSearch(q);
    if (img) m[n] = img; else delete m[n];
    console.log(n, '→', img ? decodeURIComponent(img.split('/').pop()) : 'FJERNET');
  }
  fs.writeFileSync('cheese-imgs.json', JSON.stringify(m, null, 1));
  console.log('totalt:', Object.keys(m).length);
})();
