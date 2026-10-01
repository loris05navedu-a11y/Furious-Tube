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

function findVideo(id){return (cachedVideos||[]).find(v=>v.id===id)||null;}

// Carte vidéo façon YouTube (fil d'accueil et colonne « À suivre »)
function videoCardHtml(v){
  const likes=(v.likes||[]).length;
  const id=escHtml(v.id),name=escHtml(v.uploader||'?');
  const av=v.uploaderAvatar
    ?`<img src="${escHtml(v.uploaderAvatar)}" alt="" loading="lazy">`
    :escHtml((v.uploader||'?')[0].toUpperCase());
  return `
    <article class="yt-card" data-id="${id}">
      <div class="yt-thumb">
        ${v.thumb
          ?`<img src="${escHtml(v.thumb)}" alt="" loading="lazy" onerror="this.remove()">`
          :`<video class="yt-poster" src="${escHtml(v.url)}#t=1" preload="metadata" muted playsinline></video>`}
        ${v.duration?`<span class="yt-dur">${fmt(v.duration)}</span>`:''}
        <div class="yt-prog"></div>
      </div>
      <div class="yt-info">
        <div class="yt-av" data-ch="${escHtml(v.uploaderId||'')}" data-name="${name}">${av}</div>
        <div class="yt-text">
          <h3 class="yt-title" title="${escHtml(v.title)}">${escHtml(v.title)}</h3>
          <div class="yt-ch" data-ch="${escHtml(v.uploaderId||'')}" data-name="${name}">${name}</div>
          <div class="yt-meta">${fmtCount(likes)} J’aime · ${fmtAgo(v.date)}</div>
        </div>
      </div>
    </article>`;
}

function renderGrid(videos){
  const grid=document.getElementById('grid');
  document.getElementById('count').textContent=
    videos.length===0?'0 vidéo':videos.length===1?'1 vidéo':`${videos.length} vidéos`;
  if(!videos.length){
    grid.innerHTML=`<div class="empty"><div class="icon">🎬</div><h3>AUCUNE VIDÉO</h3><p>Soyez le premier à enflammer la communauté !</p><button class="btn btn-primary" onclick="openUpload()" style="margin:0 auto">⬆ Importer</button></div>`;
    return;
  }
  grid.innerHTML=videos.map(videoCardHtml).join('');
}

// Clic sur une carte (ouvre la vidéo) ou sur la chaîne (ouvre le profil)
document.addEventListener('click',e=>{
  const ch=e.target.closest('.yt-card [data-ch]');
  if(ch&&ch.dataset.ch){e.stopPropagation();openProfileById(ch.dataset.ch,ch.dataset.name);return;}
  const card=e.target.closest('.yt-card');
  if(!card)return;
  const v=findVideo(card.dataset.id);
  if(v)openPlayer(v);
});

// Aperçu muet au survol (souris uniquement), comme sur YouTube
(()=>{
  if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  let timer=null,cur=null;
  const stop=()=>{
    clearTimeout(timer);
    if(cur){
      const p=cur.querySelector('.yt-pv');if(p){p.pause();p.removeAttribute('src');p.load();p.remove();}
      cur.querySelector('.yt-prog').style.width='';cur.classList.remove('previewing');cur=null;
    }
  };
  document.addEventListener('mouseover',e=>{
    const card=e.target.closest('.yt-card');
    if(card===cur)return;
    stop();
    if(!card)return;
    cur=card;
    timer=setTimeout(()=>{
      const v=findVideo(card.dataset.id);if(!v||cur!==card)return;
      const pv=document.createElement('video');
      pv.className='yt-pv';pv.muted=true;pv.playsInline=true;pv.loop=true;pv.preload='auto';pv.src=v.url;
      const bar=card.querySelector('.yt-prog');
      pv.addEventListener('timeupdate',()=>{if(pv.duration)bar.style.width=(pv.currentTime/pv.duration*100)+'%';});
      pv.addEventListener('playing',()=>card.classList.add('previewing'));
      card.querySelector('.yt-thumb').appendChild(pv);
      pv.play().catch(()=>{});
    },700);
  });
  document.addEventListener('scroll',stop,true);
})();

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
