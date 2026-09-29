/* FuriousTubes — fil de vidéos & algorithme "Pour toi" */
// ── Feed ──
let cachedVideos = null;

async function loadFeed(useCache=false){
  try{
    if(!useCache || !cachedVideos){
      cachedVideos = await getBin(CONFIG.VIDEOS_BIN_ID);
    }
    let videos = cachedVideos.filter(v=>v.id&&!v.hidden);

    if(activeCategory==='🏠 Accueil') {
      // Accueil: vidéos les plus récentes en premier
      videos = videos.sort((a,b)=>b.date-a.date);
    } else if(activeCategory==='✨ Pour toi') {
      videos = getPersonalizedFeed(videos);
    } else {
      videos = videos.filter(v=>v.category===activeCategory);
    }

    renderGrid(videos);
  }catch(e){renderGrid([]);toast('Erreur de chargement','er');}
}

// ── Algorithme Pour toi ──
function getPersonalizedFeed(videos) {
  if(!currentUser) {
    // Pas connecté : vidéos populaires
    return [...videos].sort((a,b)=>(b.likes||[]).length-(a.likes||[]).length);
  }

  // Analyser les goûts de l'utilisateur
  const likedVideos = videos.filter(v=>(v.likes||[]).includes(currentUser.id));
  const commentedVideos = videos.filter(v=>(v.comments||[]).some(c=>c.authorId===currentUser.id));
  const watchedUploaders = new Set([
    ...likedVideos.map(v=>v.uploaderId),
    ...commentedVideos.map(v=>v.uploaderId)
  ]);
  const likedCategories = {};
  [...likedVideos, ...commentedVideos].forEach(v=>{
    if(v.category) likedCategories[v.category]=(likedCategories[v.category]||0)+1;
  });

  // Score chaque vidéo
  const scored = videos.map(v=>{
    let score = 0;
    score += (v.likes||[]).length * 2;           // popularité
    score += (v.comments||[]).length * 1.5;       // engagement
    if(watchedUploaders.has(v.uploaderId)) score += 15; // créateur aimé
    if(likedCategories[v.category]) score += likedCategories[v.category] * 10; // catégorie aimée
    score += Math.random() * 3;                   // un peu d'aléatoire
    // Pénaliser les vidéos déjà likées
    if((v.likes||[]).includes(currentUser.id)) score -= 5;
    return {...v, _score: score};
  });

  return scored.sort((a,b)=>b._score-a._score);
}

function renderGrid(videos){
  const grid=document.getElementById('grid');
  document.getElementById('count').textContent=
    videos.length===0?'0 vidéo':videos.length===1?'1 vidéo':`${videos.length} vidéos`;
  if(!videos.length){
    grid.innerHTML=`<div class="empty"><div class="icon">🎬</div><h3>AUCUNE VIDÉO</h3><p>Soyez le premier à enflammer la communauté !</p><button class="btn btn-primary" onclick="openUpload()" style="margin:0 auto">⬆ Importer</button></div>`;
    return;
  }
  grid.innerHTML=[...videos].map(v=>`
    <div class="card" onclick='openPlayer(${JSON.stringify(v).replace(/'/g,"&#39;")})'>
      <div class="thumb">
        <img src="${v.thumb||''}" onerror="this.style.display='none'" loading="lazy">
        <div class="hover-play"><div class="play-ring"><svg width="15" height="15" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>
        ${v.duration?`<span class="dur">${fmt(v.duration)}</span>`:''}
        ${v.category?`<span class="cat-tag">${v.category}</span>`:''}
      </div>
      <div class="info">
        <h3 title="${v.title}">${v.title}</h3>
        <div class="meta">
          <div class="who" onclick="event.stopPropagation();openProfileById('${v.uploaderId}','${v.uploader}')">
            ${getAvatarHtml(v.uploaderAvatar,v.uploader,'av-sm')}
            <span>${v.uploader}</span>
          </div>
          <span>${fmtDate(v.date)}</span>
        </div>
        <div class="card-likes">👍 ${(v.likes||[]).length} &nbsp;👎 ${(v.dislikes||[]).length} &nbsp;💬 ${(v.comments||[]).length}</div>
      </div>
    </div>`).join('');
}

// ── Surprise me ──
function surpriseMe(){
  if(!cachedVideos||!cachedVideos.length){
    toast('Aucune vidéo disponible','er');return;
  }
  const available = cachedVideos.filter(v=>v.id&&!v.hidden);
  if(!available.length){toast('Aucune vidéo disponible','er');return;}
  const random = available[Math.floor(Math.random()*available.length)];
  toast('🎲 Vidéo surprise !','ok');
  openPlayer(random);
}
