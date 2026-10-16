/* FuriousTubes — préférences de recommandation synchronisées avec Firestore
   Stockage local par compte (ft_watch_<uid>, ft_favs_<uid>, ft_history_<uid>) + document privé users/<uid>/private/prefs
   lisible et modifiable uniquement par son propriétaire. La fusion est monotone (on garde le plus récent / le plus grand),
   donc plusieurs appareils peuvent écrire sans se marcher dessus. Hors ligne ou règles non publiées : tout reste local. */

const PREF_KEYS = { watch: 'ft_watch', favs: 'ft_favs', hist: 'ft_history' };
const PREF_LIMITS = { watch: 200, favs: 300, hist: 100 };   // doivent rester identiques à validPrefs() dans firestore.rules
const PUSH_DELAY = 20000, PULL_EVERY = 5 * 60000, TOMBSTONE_TTL = 30 * 864e5;

const prefKey = n => PREF_KEYS[n] + (currentUser ? '_' + currentUser.id : '');
function pget(n) { try { return JSON.parse(localStorage.getItem(prefKey(n))) || {}; } catch (e) { return {}; } }
function pset(n, o, quiet) {
  try { localStorage.setItem(prefKey(n), JSON.stringify(o)); } catch (e) {}
  if (!quiet) syncSchedule();
}
const readPrefs = () => ({ watch: pget('watch'), favs: pget('favs'), hist: pget('hist') });
function writePrefs(p) { for (const n of Object.keys(PREF_KEYS)) pset(n, p[n], true); }

// ── Fusion ──
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
const num = x => (typeof x === 'number' && isFinite(x) ? x : 0);
function newest(o, limit, ts) {
  return Object.fromEntries(Object.entries(o).sort((a, b) => ts(b[1]) - ts(a[1])).slice(0, limit));
}
function mergePrefs(a, b) {
  a = a || {}; b = b || {};
  const wa = isObj(a.watch) ? a.watch : {}, wb = isObj(b.watch) ? b.watch : {};
  const watch = {};
  for (const id of new Set([...Object.keys(wa), ...Object.keys(wb)])) {
    const x = isObj(wa[id]) ? wa[id] : null, y = isObj(wb[id]) ? wb[id] : null;
    watch[id] = { f: Math.max(num(x && x.f), num(y && y.f)), n: Math.max(num(x && x.n), num(y && y.n)), t: Math.max(num(x && x.t), num(y && y.t)) };
  }
  const fa = isObj(a.favs) ? a.favs : {}, fb = isObj(b.favs) ? b.favs : {}, favs = {};   // valeur négative = retiré des favoris (le plus récent gagne)
  for (const id of new Set([...Object.keys(fa), ...Object.keys(fb)])) {
    const x = num(fa[id]), y = num(fb[id]);
    favs[id] = Math.abs(x) >= Math.abs(y) ? x : y;
  }
  const ha = isObj(a.hist) ? a.hist : {}, hb = isObj(b.hist) ? b.hist : {}, hist = {};
  for (const id of new Set([...Object.keys(ha), ...Object.keys(hb)])) hist[id] = Math.max(num(ha[id]), num(hb[id]));
  const now = Date.now();
  for (const id in favs) if (!favs[id] || (favs[id] < 0 && now + favs[id] > TOMBSTONE_TTL)) delete favs[id];
  return {
    watch: newest(watch, PREF_LIMITS.watch, e => e.t),
    favs: newest(favs, PREF_LIMITS.favs, Math.abs),
    hist: newest(hist, PREF_LIMITS.hist, x => x)
  };
}
const canon = o => JSON.stringify(o, (k, v) => (isObj(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v));

// ── Reprise des anciennes données non rattachées à un compte ──
function adoptLegacy() {
  if (!currentUser) return;
  const legacy = { watch: {}, favs: {}, hist: {} };
  let found = false;
  for (const n of Object.keys(PREF_KEYS)) {
    try {
      const raw = localStorage.getItem(PREF_KEYS[n]);
      if (raw) { legacy[n] = JSON.parse(raw) || {}; found = true; }
      localStorage.removeItem(PREF_KEYS[n]);
    } catch (e) {}
  }
  if (found) writePrefs(mergePrefs(readPrefs(), legacy));
}

// ── Synchronisation ──
let syncOff = false, pushTimer = null, lastPushed = null, lastPull = 0;
const prefsRef = uid => fbDb.collection('users').doc(uid).collection('private').doc('prefs');
function syncFail(e) {
  if (e && e.code === 'permission-denied') { syncOff = true; console.warn('Synchronisation des recommandations désactivée : publiez firestore.rules.'); }
}
function syncSchedule(delay = PUSH_DELAY) {
  if (!currentUser || !fbDb || syncOff) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncPush, delay);
}

async function syncPull() {
  if (!currentUser || !fbDb || syncOff) return;
  const uid = currentUser.id;
  try {
    adoptLegacy();
    const s = await prefsRef(uid).get();
    if (!currentUser || currentUser.id !== uid) return;
    const remote = s.exists ? mergePrefs(s.data(), {}) : mergePrefs({}, {});
    const local = readPrefs(), merged = mergePrefs(local, remote);
    const changed = canon(merged) !== canon(mergePrefs(local, {}));
    writePrefs(merged);
    setLastPushed(remote);
    lastPull = Date.now();
    if (canon(merged) !== lastPushed) syncSchedule(3000);
    if (changed && typeof loadFeed === 'function') loadFeed(true);
  } catch (e) { syncFail(e); }
}
function setLastPushed(m) { lastPushed = canon(m); }

async function syncPush() {
  clearTimeout(pushTimer); pushTimer = null;
  if (!currentUser || !fbDb || syncOff) return;
  const uid = currentUser.id, local = mergePrefs(readPrefs(), {});
  if (canon(local) === lastPushed) return;
  try {
    const ref = prefsRef(uid);
    const merged = await fbDb.runTransaction(async tx => {
      const s = await tx.get(ref);
      const m = mergePrefs(local, s.exists ? s.data() : {});
      tx.set(ref, { ...m, updated: Date.now() });
      return m;
    });
    if (currentUser && currentUser.id === uid) { writePrefs(mergePrefs(readPrefs(), merged)); setLastPushed(merged); }
  } catch (e) { syncFail(e); }
}
const syncFlush = () => syncPush();

window.addEventListener('pagehide', syncFlush);
window.addEventListener('online', () => syncSchedule(1000));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) syncFlush();
  else if (currentUser && Date.now() - lastPull > PULL_EVERY) syncPull();
});
