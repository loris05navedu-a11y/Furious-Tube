/* FuriousTubes — accès JSONBin & hash des mots de passe */
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

// ── Password hash ──
async function hashPwd(p) {
  const buf = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
