/* FuriousTubes — accès JSONBin (profils, vidéos) */
// ── JSONBin ──
const HDRS = () => ({'Content-Type':'application/json','X-Master-Key':CONFIG.JSONBIN_KEY});
const binURL = id => `https://api.jsonbin.io/v3/b/${id}`;
async function getBin(id) {
  const r = await fetch(binURL(id)+'/latest',{headers:HDRS()});
  if(!r.ok) throw new Error('JSONBin '+r.status);
  const j = await r.json();
  return Array.isArray(j.record)?j.record:(j.record||[]);
}
async function setBin(id,data) {
  const r = await fetch(binURL(id),{method:'PUT',headers:HDRS(),body:JSON.stringify(data)});
  if(!r.ok) throw new Error('JSONBin save '+r.status);
}
