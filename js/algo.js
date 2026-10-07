/* FuriousTubes — algorithme de recommandation façon YouTube
   Pipeline : signaux -> profil d'intérêts -> score (pertinence + qualité + fraîcheur + vélocité)
   -> pénalités (déjà vu, pas aimé) -> exploration -> re-classement pour la diversité. */

const DAY = 864e5;
const commentList = v => Array.isArray(v.comments) ? v.comments : Object.values(v.comments || {});
const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const jset = (k, o) => { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} };

// ── Signaux de visionnage : fraction réellement regardée de chaque vidéo ──
// ft_watch = { id: { t: dernier visionnage, f: fraction max regardée (0..1), n: nombre de visionnages } }
function recordWatchProgress() {
  if (!currentUser || !curId) return;
  const el = document.getElementById('pvid');
  if (!el || !isFinite(el.duration) || el.duration <= 0) return;
  const w = jget('ft_watch', {});
  const e = w[curId] || { f: 0, n: 0 };
  e.f = Math.max(e.f || 0, Math.min(1, el.currentTime / el.duration));
  e.t = Date.now();
  w[curId] = e;
  jset('ft_watch', w);
}
function recordWatchStart(id) {
  if (!currentUser) return;
  const w = jget('ft_watch', {});
  const e = w[id] || { f: 0, n: 0 };
  e.n = (e.n || 0) + 1; e.t = Date.now();
  w[id] = e;
  jset('ft_watch', w);
}
window.addEventListener('pagehide', recordWatchProgress);
document.addEventListener('visibilitychange', () => { if (document.hidden) recordWatchProgress(); });
setInterval(recordWatchProgress, 15000);

// ── Aléa stable pendant la session (le fil ne se mélange pas à chaque like) ──
const SEED = (() => { let s = sessionStorage.getItem('ft_seed'); if (!s) { s = String(Math.random()); sessionStorage.setItem('ft_seed', s); } return s; })();
function seeded(str) {
  let h = 2166136261;
  const t = SEED + str;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

const STOP = new Set('le la les un une des de du et en au aux the a an of to is in on for with ce cet cette mon ma mes ton ta tes son sa ses vs pour par sur'.split(' '));
const tokens = t => normTxt(t).split(' ').filter(w => w.length > 2 && !STOP.has(w));

// ── Qualité intrinsèque (proxy de satisfaction : likes lissés + engagement par vue) ──
function qualityScore(v) {
  const l = (v.likes || []).length, d = (v.dislikes || []).length, c = commentList(v).length, n = v.views || 0;
  const ratio = (l + 2) / (l + d + 4);
  const eng = Math.min(1, ((l * 3 + c * 5 + 1) / (n + 10)) * 2.5);
  const pop = Math.min(1, Math.log10(n + l * 3 + c * 2 + 1) / 3.5);
  return 0.4 * ratio + 0.3 * eng + 0.3 * pop;
}
const freshness = v => Math.pow(0.5, Math.max(0, Date.now() - (v.date || 0)) / (6 * DAY));
function velocity(v) {
  const ageH = Math.max(0, Date.now() - (v.date || 0)) / 36e5;
  return ((v.views || 0) + (v.likes || []).length * 5 + commentList(v).length * 3 + 1) / Math.pow(ageH + 6, 1.25);
}

// ── Profil d'intérêts : catégories, créateurs, mots, avec décroissance dans le temps ──
function subscribedSet() {
  const s = new Set();
  if (currentUser) (usersCache || []).forEach(u => { if ((u.subscribers || []).includes(currentUser.id)) s.add(u.id); });
  return s;
}
function buildProfile(all) {
  const p = { cat: {}, ch: {}, tok: {}, has: false, watch: jget('ft_watch', {}), subs: subscribedSet(), liked: new Set(), disliked: new Set() };
  if (!currentUser) return p;
  const now = Date.now(), byId = new Map(all.map(v => [v.id, v]));
  const add = (v, w) => {
    if (v.category) p.cat[v.category] = (p.cat[v.category] || 0) + w;
    if (v.uploaderId) p.ch[v.uploaderId] = (p.ch[v.uploaderId] || 0) + w;
    for (const t of tokens(v.title)) p.tok[t] = (p.tok[t] || 0) + w * 0.4;
    p.has = true;
  };
  for (const [id, e] of Object.entries(p.watch)) {
    const v = byId.get(id); if (!v) continue;
    const decay = Math.pow(0.5, (now - (e.t || now)) / (14 * DAY));
    // moins de 10 % regardé = rebond (signal négatif) ; sinon plus on regarde, plus l'intérêt est fort
    add(v, (e.f < 0.1 ? -0.3 : 0.3 + e.f * 1.2 + Math.min(0.3, (e.n || 1) * 0.1 - 0.1)) * decay);
  }
  for (const v of all) {
    if ((v.likes || []).includes(currentUser.id)) { p.liked.add(v.id); add(v, 1.5 * 0.7); }
    if ((v.dislikes || []).includes(currentUser.id)) { p.disliked.add(v.id); add(v, -2 * 0.7); }
    if (commentList(v).some(c => c.authorId === currentUser.id)) add(v, 1 * 0.7);
  }
  p.subs.forEach(id => { p.ch[id] = (p.ch[id] || 0) + 2.5; p.has = true; });
  const norm = o => { const m = Math.max(0.0001, ...Object.values(o)); for (const k in o) o[k] = o[k] / m; };
  norm(p.cat); norm(p.ch); norm(p.tok);
  return p;
}
function affinity(v, p) {
  const ca = Math.max(-1, p.cat[v.category] || 0), ha = Math.max(-1, p.ch[v.uploaderId] || 0);
  const ts = tokens(v.title); let ta = 0;
  for (const t of ts) ta += p.tok[t] || 0;
  ta = ts.length ? Math.max(-1, Math.min(1, ta / Math.sqrt(ts.length))) : 0;
  return 0.4 * ca + 0.45 * ha + 0.15 * ta;
}

// ── Score final d'une vidéo pour l'utilisateur ──
function scoreVideo(v, p, ctx) {
  let s = (p.has ? 1.6 * affinity(v, p) : 0)
        + 0.55 * qualityScore(v)
        + 0.45 * freshness(v)
        + 0.35 * Math.min(1, velocity(v) / ctx.maxVel)
        + (p.subs.has(v.uploaderId) ? 0.5 : 0)
        + 0.25 * seeded(v.id);                                  // exploration stable
  const w = p.watch[v.id];
  if (p.disliked.has(v.id)) s *= 0.05;
  else if (w && w.f > 0.85) s *= 0.15;                           // déjà vue en entier
  else if (w && Date.now() - (w.t || 0) < DAY) s *= 0.4;         // vue récemment
  else if (w && w.f < 0.1 && w.n) s *= 0.7;                      // ouverte puis abandonnée
  if (currentUser && v.uploaderId === currentUser.id) s *= 0.5;
  return s;
}

// ── Re-classement pour la diversité (pas 5 vidéos du même créateur / de la même catégorie d'affilée) ──
function diversify(scored, limit) {
  const pool = [...scored], out = [];
  while (pool.length && out.length < limit) {
    const recent = out.slice(-6);
    let bi = 0, bs = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const v = pool[i].v;
      const sameCh = recent.filter(x => x.v.uploaderId === v.uploaderId).length;
      const sameCat = out.slice(-3).filter(x => x.v.category === v.category).length;
      const adj = pool[i].s * Math.pow(0.55, sameCh) * Math.pow(0.85, sameCat);
      if (adj > bs) { bs = adj; bi = i; }
    }
    out.push(pool.splice(bi, 1)[0]);
  }
  return out.concat(pool).map(x => x.v);
}

// ── Accueil / « Pour toi » ──
function getPersonalizedFeed(videos) {
  const p = buildProfile(videos);
  const ctx = { maxVel: Math.max(0.0001, ...videos.map(velocity)) };
  return diversify(videos.map(v => ({ v, s: scoreVideo(v, p, ctx) })).sort((a, b) => b.s - a.s), videos.length);
}

// ── Tendances : vitesse d'engagement avec « gravité » (comme un classement de type Hacker News) ──
function trendingList(list) {
  return [...list].sort((a, b) => (velocity(b) * (0.6 + qualityScore(b))) - (velocity(a) * (0.6 + qualityScore(a))) || (b.date || 0) - (a.date || 0));
}

// ── « À suivre » : proche de la vidéo en cours, puis personnalisé ──
function relatedVideos(cur, all, limit = 20) {
  const p = buildProfile(all), ctx = { maxVel: Math.max(0.0001, ...all.map(velocity)) };
  const ct = new Set(tokens(cur.title));
  const scored = all.filter(x => x.id && !x.hidden && x.id !== cur.id).map(x => {
    const xt = new Set(tokens(x.title));
    let inter = 0; xt.forEach(t => { if (ct.has(t)) inter++; });
    const jac = inter / Math.max(1, ct.size + xt.size - inter);
    const rel = (x.category && x.category === cur.category ? 3 : 0) + (x.uploaderId === cur.uploaderId ? 1.6 : 0) + 4 * jac;
    return { v: x, s: rel + scoreVideo(x, p, ctx) };
  }).sort((a, b) => b.s - a.s);
  return diversify(scored, limit).slice(0, limit);
}
