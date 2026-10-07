/* FuriousTubes — rétention & engagement : historique, favoris, stats, gamification */

// ── Watch History ──
function addToHistory(v) {
  if(!currentUser || !v.id) return;
  let hist = {};
  try { hist = JSON.parse(localStorage.getItem('ft_history') || '{}'); } catch(e) {}
  hist[v.id] = Date.now();
  try { localStorage.setItem('ft_history', JSON.stringify(hist)); } catch(e) {}
}

function getWatchHistory(allVideos) {
  let hist = {};
  try { hist = JSON.parse(localStorage.getItem('ft_history') || '{}'); } catch(e) {}
  const ids = Object.keys(hist).sort((a, b) => hist[b] - hist[a]).slice(0, 20);
  return ids.map(id => allVideos.find(v => v.id === id)).filter(Boolean);
}

// ── Favorites/Watchlist ──
function toggleFavorite(vid) {
  if(!currentUser) { openAuth('login'); return; }
  let favs = {};
  try { favs = JSON.parse(localStorage.getItem('ft_favs') || '{}'); } catch(e) {}
  if(favs[vid]) {
    delete favs[vid];
  } else {
    favs[vid] = Date.now();
  }
  try { localStorage.setItem('ft_favs', JSON.stringify(favs)); } catch(e) {}
  renderFeed(cachedVideos || []);
  toast(favs[vid] ? '❤️ Ajouté aux favoris' : '🗑 Retiré des favoris', 'ok');
}

function isFavorite(vid) {
  let favs = {};
  try { favs = JSON.parse(localStorage.getItem('ft_favs') || '{}'); } catch(e) {}
  return !!favs[vid];
}

function getFavorites(allVideos) {
  let favs = {};
  try { favs = JSON.parse(localStorage.getItem('ft_favs') || '{}'); } catch(e) {}
  const ids = Object.keys(favs).sort((a, b) => favs[b] - favs[a]);
  return ids.map(id => allVideos.find(v => v.id === id)).filter(Boolean);
}

// ── Creator Stats ──
function getCreatorStats(uid, allVideos) {
  const videos = allVideos.filter(v => v.uploaderId === uid && !v.hidden);
  const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
  const totalLikes = videos.reduce((s, v) => s + (v.likes || []).length, 0);
  const totalComments = videos.reduce((s, v) => s + ((v.comments || {}).size || Object.keys(v.comments || {}).length), 0);
  const avgViews = videos.length ? Math.round(totalViews / videos.length) : 0;
  const engagementRate = totalViews > 0 ? Math.round((totalLikes + totalComments) / totalViews * 100 * 10) / 10 : 0;

  // Growth tracking (30 days)
  let stats = {};
  try { stats = JSON.parse(localStorage.getItem(`ft_stats_${uid}`) || '{}'); } catch(e) {}
  if(!stats.days) stats.days = {};
  const today = Math.floor(Date.now() / 86400000);
  if(!stats.days[today]) stats.days[today] = { views: 0, likes: 0, comments: 0 };
  stats.days[today].views = totalViews;
  stats.days[today].likes = totalLikes;
  stats.days[today].comments = totalComments;
  try { localStorage.setItem(`ft_stats_${uid}`, JSON.stringify(stats)); } catch(e) {}

  return { totalViews, totalLikes, totalComments, avgViews, engagementRate, videoCount: videos.length };
}

// ── User Level/Badges ──
function getUserLevel(uid, allVideos, allUsers) {
  const user = allUsers.find(u => u.id === uid);
  if(!user) return { level: 0, title: 'Nouveau' };

  const videos = allVideos.filter(v => v.uploaderId === uid && !v.hidden);
  const likes = videos.reduce((s, v) => s + (v.likes || []).length, 0);
  const subs = (user.subscribers || []).length;
  const views = videos.reduce((s, v) => s + (v.views || 0), 0);
  const comments = videos.reduce((s, v) => s + ((v.comments || {}).size || Object.keys(v.comments || {}).length), 0);

  // Points: 1 view = 1pt, 1 like = 10pt, 1 comment = 15pt, 1 subscriber = 25pt
  const points = views + likes * 10 + comments * 15 + subs * 25;

  const levels = [
    { min: 0, title: 'Nouveau', emoji: '🌟' },
    { min: 100, title: 'Créateur', emoji: '✍️' },
    { min: 500, title: 'Populaire', emoji: '🔥' },
    { min: 1500, title: 'Influenceur', emoji: '⭐' },
    { min: 5000, title: 'Légende', emoji: '👑' }
  ];

  const level = levels.reverse().find(l => points >= l.min) || levels[0];
  return { level: levels.indexOf(level), title: level.title, emoji: level.emoji, points, nextMilestone: level.min };
}

// ── Notification Badge Count ──
function getNotificationCount() {
  if(!currentUser) return 0;
  let notifs = {};
  try { notifs = JSON.parse(localStorage.getItem(`ft_notifs_${currentUser.id}`) || '{}'); } catch(e) {}
  return Object.values(notifs).filter(n => !n.read).length;
}

function recordNotification(type, data) {
  if(!currentUser) return;
  let notifs = {};
  try { notifs = JSON.parse(localStorage.getItem(`ft_notifs_${currentUser.id}`) || '{}'); } catch(e) {}
  const id = `${type}_${data.userId || data.videoId || ''}_${Date.now()}`;
  notifs[id] = { type, data, timestamp: Date.now(), read: false };
  // Keep only last 50 notifications
  const sorted = Object.entries(notifs).sort((a, b) => b[1].timestamp - a[1].timestamp).slice(0, 50);
  notifs = Object.fromEntries(sorted);
  try { localStorage.setItem(`ft_notifs_${currentUser.id}`, JSON.stringify(notifs)); } catch(e) {}
  updateNotificationBadge();
}

function getNotifications() {
  if(!currentUser) return [];
  let notifs = {};
  try { notifs = JSON.parse(localStorage.getItem(`ft_notifs_${currentUser.id}`) || '{}'); } catch(e) {}
  return Object.entries(notifs).map(([id, n]) => ({ id, ...n })).sort((a, b) => b.timestamp - a.timestamp);
}

function markNotificationRead(id) {
  if(!currentUser) return;
  let notifs = {};
  try { notifs = JSON.parse(localStorage.getItem(`ft_notifs_${currentUser.id}`) || '{}'); } catch(e) {}
  if(notifs[id]) notifs[id].read = true;
  try { localStorage.setItem(`ft_notifs_${currentUser.id}`, JSON.stringify(notifs)); } catch(e) {}
  updateNotificationBadge();
}

function updateNotificationBadge() {
  const badge = document.getElementById('notifBadge');
  if(!badge) return;
  const count = getNotificationCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? '' : 'none';
}

// ── Record Activity (called when user interacts) ──
function recordActivity(type, videoId) {
  if(!currentUser) return;
  const v = findVideo(videoId);
  if(!v) return;

  // Create notification for video owner
  if(v.uploaderId !== currentUser.id) {
    const typeText = { like: 'aimé', comment: 'commenté', view: 'regardé' }[type] || type;
    recordNotification('interaction', {
      userId: v.uploaderId,
      videoId: videoId,
      actor: currentUser.username,
      type: typeText
    });
  }
}

// ── Retention score : mesure comment un utilisateur revient ──
function getUserRetentionScore(uid) {
  let hist = {};
  try { hist = JSON.parse(localStorage.getItem('ft_history') || '{}'); } catch(e) {}

  let sessions = [];
  try { sessions = JSON.parse(localStorage.getItem('ft_sessions') || '[]'); } catch(e) {}

  const userSessions = sessions.filter(s => s.uid === uid);
  if(userSessions.length < 2) return 0; // need at least 2 sessions

  // Calculate average days between sessions
  const daysApart = [];
  for(let i = 1; i < userSessions.length; i++) {
    const diff = (userSessions[i].date - userSessions[i-1].date) / 86400000;
    if(diff < 30) daysApart.push(diff); // ignore very old sessions
  }

  if(daysApart.length === 0) return 100; // perfect retention, visits often
  const avgDaysApart = daysApart.reduce((a, b) => a + b) / daysApart.length;

  // Score: less than 3 days apart = 100, 30+ days = 10
  return Math.max(10, 100 - (avgDaysApart / 30) * 90);
}

// Track sessions
function trackSession() {
  if(!currentUser) return;
  let sessions = [];
  try { sessions = JSON.parse(localStorage.getItem('ft_sessions') || '[]'); } catch(e) {}
  const today = Math.floor(Date.now() / 86400000);
  const todaySession = sessions.find(s => s.uid === currentUser.id && s.date === today * 86400000);
  if(!todaySession) {
    sessions.push({ uid: currentUser.id, date: Date.now() });
  }
  try { localStorage.setItem('ft_sessions', JSON.stringify(sessions.slice(-365))); } catch(e) {} // keep last year
}
