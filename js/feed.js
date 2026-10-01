/* FuriousTubes — fil de vidéos, sections façon YouTube & algorithme "Pour toi" */
let cachedVideos = null;
let searchQuery = '', sortMode = 'recent';
const SORTS = [['recent','Plus récentes'],['liked','Plus aimées'],['commented','Plus commentées']];

const nLikes = v => (v.likes||[]).length;
const nComments = v => (v.comments||[]).length;

function sortVideos(list, mode){
  const a = [...list];
  if(mode==='liked') a.sort((x,y)=>nLikes(y)-nLikes(x)||y.date-x.date);
  else if(mode==='commented') a.sort((x,y)=>nComments(y)-nComments(x)||y.date-x.date);
  else a.sort((x,y)=>y.date-x.date);
  return a;
}

async function loadFeed(useCache=false){
  try{
    if(!useCache || !cachedVideos){
      cachedVideos = await getBin(CONFIG.VIDEOS_BIN_ID);
    }
    renderFeed(cachedVideos.filter(v=>v.id&&!v.hidden));
  }catch(e){renderFeed([]);toast('Erreur de chargement','er');}
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

const ICO_LIKE='<svg viewBox="0 0 24 24" width="17" height="17"><path d="M7 10v11H3V10zM7 10l4.5-8a2.5 2.5 0 0 1 2.9 2.9L13.6 9H20a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 21H7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const ICO_COMMENT='<svg viewBox="0 0 24 24" width="17" height="17"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const ICO_MORE='<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="5" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/></svg>';

// Carte vidéo (fil, sections et colonne « À suivre »)
function videoCardHtml(v){
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
      <div class="yt-body">
        <h3 class="yt-title" title="${escHtml(v.title)}">${escHtml(v.title)}</h3>
        <div class="yt-info">
          <div class="yt-av" data-ch="${escHtml(v.uploaderId||'')}" data-name="${name}">${av}</div>
          <div class="yt-text">
            <div class="yt-ch" data-ch="${escHtml(v.uploaderId||'')}" data-name="${name}">${name}</div>
            <div class="yt-meta">${fmtAgo(v.date)}</div>
          </div>
        </div>
        <div class="yt-stats">
          <span>${ICO_LIKE}${fmtCount(nLikes(v))}</span>
          <span>${ICO_COMMENT}${fmtCount(nComments(v))}</span>
          <button class="yt-more" type="button" aria-label="Copier le lien" title="Copier le lien">${ICO_MORE}</button>
        </div>
      </div>
    </article>`;
}

// Nombre de cartes par rangée (téléphone : défilement horizontal)
let lastPerRow=0;
function perRow(){
  if(window.matchMedia('(max-width:640px)').matches) return 8;
  const w=document.getElementById('feed').clientWidth||1000;
  return Math.max(2,Math.floor((w+18)/218));
}

function rowSection(icon,title,list,view,n){
  if(!list.length) return '';
  return `<section class="sec">
    <div class="sec-head"><span class="sec-ico">${icon}</span><h2>${title}</h2>
      <button class="sec-more" type="button" onclick="filterCat('${view}')">Voir tout <span aria-hidden="true">→</span></button></div>
    <div class="row-grid" style="--n:${n}">${list.map(videoCardHtml).join('')}</div>
  </section>`;
}

function gridSection(icon,title,list){
  const c=list.length;
  return `<section class="sec">
    <div class="sec-head"><span class="sec-ico">${icon}</span><h2>${title}</h2>
      <span class="pill">${c===0?'0 vidéo':c===1?'1 vidéo':c+' vidéos'}</span></div>
    <div class="full-grid">${c?list.map(videoCardHtml).join(''):emptyHtml(emptyMsg())}</div>
  </section>`;
}

function emptyMsg(){
  if(searchQuery.trim()) return 'Aucun résultat. Essayez un autre mot-clé.';
  if(activeCategory==='📁 Mes vidéos') return 'Vous n’avez pas encore publié de vidéo.';
  if(activeCategory==='❤️ Favoris') return 'Aucune vidéo aimée pour le moment.';
  return 'Aucune vidéo dans cette section.';
}

function emptyHtml(msg){
  return `<div class="empty"><div class="icon">🎬</div><h3>AUCUNE VIDÉO</h3><p>${escHtml(msg||'Soyez le premier à enflammer la communauté !')}</p><button class="btn btn-primary" onclick="openUpload()" style="margin:0 auto">⬆ Importer</button></div>`;
}

const SEC_ICO={
  fire:'<svg viewBox="0 0 24 24" width="24" height="24" fill="#ff6a3d"><path d="M12 2c1 4 6 6 6 11.5A6 6 0 0 1 6 14c0-2.5 1.2-4 2.5-5.2.2 2 1 3 2.2 3.2C10.5 8.5 10 5 12 2z"/></svg>',
  star:'<svg viewBox="0 0 24 24" width="24" height="24" fill="#fbbf24"><path d="M12 2.5l2.9 6 6.6.9-4.800 4.6 1.2 6.5L12 17.3 6.1 20.5l1.2-6.5L2.5 9.400l6.6-.9z"/></svg>',
  fresh:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
};

let heroTimer=null,heroImgs=[],heroIdx=0;
function showHero(i){
  const hero=document.getElementById('hero');
  heroIdx=i;
  if(heroImgs[i]) hero.style.setProperty('--hero-img',`url(${JSON.stringify(heroImgs[i])})`);
  else hero.style.removeProperty('--hero-img');
  hero.querySelectorAll('.hero-dots button').forEach((b,j)=>b.classList.toggle('on',j===i));
}
function setHeroImage(all){
  clearInterval(heroTimer);
  heroImgs=sortVideos(all,'liked').filter(v=>v.thumb).slice(0,3).map(v=>v.thumb);
  const dots=document.querySelector('#hero .hero-dots');
  dots.innerHTML=heroImgs.length>1?heroImgs.map((_,i)=>`<button type="button" aria-label="Image ${i+1}" onclick="showHero(${i});setHeroImage_restart()"></button>`).join(''):'';
  showHero(0);
  if(heroImgs.length>1) heroTimer=setInterval(()=>showHero((heroIdx+1)%heroImgs.length),6000);
}
function setHeroImage_restart(){
  clearInterval(heroTimer);
  heroTimer=setInterval(()=>showHero((heroIdx+1)%heroImgs.length),6000);
}

function homeSections(all){
  const n=perRow();lastPerRow=n;
  const shown=new Set();
  const take=list=>{const out=list.filter(v=>!shown.has(v.id)).slice(0,n);out.forEach(v=>shown.add(v.id));return out;};
  const trending=take(sortVideos(all,'liked'));
  const reco=take(getPersonalizedFeed(all));
  const fresh=take(sortVideos(all,'recent'));
  return rowSection(SEC_ICO.fire,'Tendances',trending,'🔥 Tendances',n)
    +rowSection(SEC_ICO.star,'Vidéos recommandées',reco,'✨ Pour toi',n)
    +rowSection(SEC_ICO.fresh,'Nouveautés',fresh,'🧭 Explorer',n);
}

function renderFeed(all){
  const feed=document.getElementById('feed'),hero=document.getElementById('hero');
  const q=searchQuery.trim().toLowerCase();
  const home=!q&&activeCategory==='🏠 Accueil';
  hero.hidden=!home;
  if(home) setHeroImage(all); else clearInterval(heroTimer);
  if(!all.length){feed.innerHTML=emptyHtml();return;}
  if(home){feed.innerHTML=homeSections(all);return;}

  let list,icon,title;
  const cat=activeCategory;
  if(q){
    list=sortVideos(all.filter(v=>[v.title,v.uploader,v.category].some(s=>(s||'').toLowerCase().includes(q))),sortMode);
    icon=ico('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>');title='Résultats pour « '+escHtml(searchQuery.trim())+' »';
  }else{
    const [ic,...rest]=cat.split(' ');
    icon=ICONS[cat]||ic;title=escHtml(rest.join(' '));
    if(cat==='✨ Pour toi') list=getPersonalizedFeed(all);
    else if(cat==='🔥 Tendances') list=sortVideos(all,'liked');
    else if(cat==='📁 Mes vidéos') list=sortVideos(all.filter(v=>currentUser&&v.uploaderId===currentUser.id),sortMode);
    else if(cat==='❤️ Favoris') list=sortVideos(all.filter(v=>currentUser&&(v.likes||[]).includes(currentUser.id)),sortMode);
    else if(cat==='🧭 Explorer') list=sortVideos(all,sortMode);
    else list=sortVideos(all.filter(v=>v.category===cat),sortMode);
  }
  feed.innerHTML=gridSection(icon,title,list);
}

// ── Recherche & tri ──
let searchTimer;
function onSearch(v){clearTimeout(searchTimer);searchTimer=setTimeout(()=>{searchQuery=v;loadFeed(true);},150);}
function renderSortMenu(){
  document.getElementById('sortMenu').innerHTML=SORTS.map(([k,l])=>`<button type="button" class="${k===sortMode?'on':''}" onclick="setSort('${k}')">${l}</button>`).join('');
}
function toggleSort(e){e.stopPropagation();renderSortMenu();document.getElementById('sortMenu').classList.toggle('open');}
function setSort(k){sortMode=k;document.getElementById('sortMenu').classList.remove('open');loadFeed(true);}
document.addEventListener('click',()=>document.getElementById('sortMenu').classList.remove('open'));

let resizeTimer;
window.addEventListener('resize',()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
    if(cachedVideos&&!searchQuery.trim()&&activeCategory==='🏠 Accueil'&&perRow()!==lastPerRow) loadFeed(true);
  },200);
});

function copyVideoLink(id){
  const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('v',id);
  const url=u.toString();
  if(navigator.clipboard)navigator.clipboard.writeText(url).then(()=>toast('Lien copié ! 🔗','ok')).catch(()=>prompt('Copiez le lien :',url));
  else prompt('Copiez le lien :',url);
}

// Clic sur une carte (ouvre la vidéo) ou sur la chaîne (ouvre le profil)
document.addEventListener('click',e=>{
  const more=e.target.closest('.yt-card .yt-more');
  if(more){e.stopPropagation();copyVideoLink(more.closest('.yt-card').dataset.id);return;}
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
