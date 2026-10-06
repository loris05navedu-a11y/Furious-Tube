/* FuriousTubes — fil de vidéos, sections façon YouTube & algorithme "Pour toi" */
let cachedVideos = null;
let searchQuery = '', sortMode = 'recent';
const SORTS = [['recent','Plus récentes'],['viewed','Plus vues'],['liked','Plus aimées'],['commented','Plus commentées']];

const nLikes = v => (v.likes||[]).length;
const nComments = v => (v.comments||[]).length;
const nViews = v => v.views||0;
const fmtViews = v => { const n=nViews(v); return fmtCount(n)+(n>1?' vues':' vue'); };

// Une vue par vidéo et par navigateur toutes les 30 min (pas pour l'auteur)
function countView(v){
  if(currentUser&&currentUser.id===v.uploaderId) return;
  let seen={};try{seen=JSON.parse(localStorage.getItem('ft_views')||'{}');}catch(e){}
  const now=Date.now();
  if(seen[v.id]&&now-seen[v.id]<30*60*1000) return;
  seen[v.id]=now;
  try{localStorage.setItem('ft_views',JSON.stringify(seen));}catch(e){}
  v.views=nViews(v)+1;
  const ps=document.getElementById('pstats');
  if(ps&&curId===v.id) ps.textContent=ps.textContent.replace(/^[^·]*/,fmtViews(v)+' ');
  getBin(CONFIG.VIDEOS_BIN_ID).then(list=>{
    const i=list.findIndex(x=>x.id===v.id);if(i===-1) return;
    list[i].views=nViews(list[i])+1;
    return setBin(CONFIG.VIDEOS_BIN_ID,list);
  }).catch(()=>{});
}

function sortVideos(list, mode){
  const a = [...list];
  if(mode==='trending'){const sc=v=>nViews(v)+nLikes(v)*5+nComments(v)*3;a.sort((x,y)=>sc(y)-sc(x)||y.date-x.date);}
  else if(mode==='viewed') a.sort((x,y)=>nViews(y)-nViews(x)||y.date-x.date);
  else if(mode==='liked') a.sort((x,y)=>nLikes(y)-nLikes(x)||y.date-x.date);
  else if(mode==='commented') a.sort((x,y)=>nComments(y)-nComments(x)||y.date-x.date);
  else a.sort((x,y)=>y.date-x.date);
  return a;
}


// ── Recherche approximative (accents, fautes de frappe, mots collés, lettres manquantes) ──
const normTxt = t => (t||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function lev(a,b){
  const m=a.length,n=b.length;if(!m)return n;if(!n)return m;
  let prev=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){
    const cur=[i];
    for(let j=1;j<=n;j++) cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev=cur;
  }
  return prev[n];
}
function isSubseq(t,w){let i=0;for(const c of w){if(c===t[i])i++;if(i===t.length)return true;}return false;}
function tokenScore(t,words,joined){
  let best=0;
  for(const w of words){
    let sc=0;
    if(w===t) sc=100;
    else if(w.startsWith(t)) sc=85;
    else if(w.includes(t)) sc=65;
    else if(t.length>=3){
      const allowed=Math.max(1,Math.ceil(t.length/2.5));
      const d=Math.min(lev(t,w),lev(t,w.slice(0,t.length)));
      if(d<=allowed) sc=Math.max(sc,48-d*8);
      if(t.length>=3&&isSubseq(t,w)&&w.length<=t.length*2.5) sc=Math.max(sc,22);
    }
    if(sc>best) best=sc;
  }
  if(!best&&t.length>=3&&joined.includes(t)) best=50;
  return best;
}
function fuzzyScore(query,fields){
  const tokens=normTxt(query).split(' ').filter(Boolean);
  if(!tokens.length) return 0;
  let total=0;
  for(const t of tokens){
    let best=0;
    for(const [text,weight] of fields){
      const n=normTxt(text);if(!n) continue;
      const sc=tokenScore(t,n.split(' '),n.replace(/ /g,''))*weight;
      if(sc>best) best=sc;
    }
    if(!best) return 0;
    total+=best;
  }
  return total/tokens.length;
}
const videoMatches=(v,q)=>fuzzyScore(q,[[v.title,1],[v.uploader,.9],[v.category,.7],[v.description||v.desc,.5]]);

let usersCache=null,usersLoadedAt=0;
async function ensureUsers(){
  if(usersCache&&Date.now()-usersLoadedAt<60000) return;
  try{usersCache=(await getBin(CONFIG.USERS_BIN_ID)).filter(u=>u.id&&u.username&&!isBanActive(u));usersLoadedAt=Date.now();}
  catch(e){usersCache=usersCache||[];}
}
function accountsSection(q,all){
  const found=(usersCache||[]).map(u=>({u,sc:fuzzyScore(q,[[u.username,1]])})).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc).slice(0,12);
  if(!found.length) return {html:'',count:0};
  const cards=found.map(({u})=>{
    const n=all.filter(v=>v.uploaderId===u.id).length,subs=(u.subscribers||[]).length;
    const av=u.avatar?`<img src="${escHtml(u.avatar)}" alt="" loading="lazy">`:escHtml(u.username[0].toUpperCase());
    return `<div class="acc-card" data-ch="${escHtml(u.id)}" data-name="${escHtml(u.username)}"><div class="acc-av">${av}</div><div class="acc-txt"><div class="acc-name">${escHtml(u.username)}</div><div class="acc-meta">${n} vidéo${n>1?'s':''} · ${subs} abonné${subs>1?'s':''}</div></div></div>`;
  }).join('');
  return {count:found.length,html:`<section class="sec"><div class="sec-head"><span class="sec-ico">${ico('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>')}</span><h2>Comptes</h2><span class="pill">${found.length}</span></div><div class="acc-grid">${cards}</div></section>`};
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
            <div class="yt-meta">${fmtViews(v)} · ${fmtAgo(v.date)}</div>
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
  const trending=take(sortVideos(all,'trending'));
  const reco=take(getPersonalizedFeed(all));
  const fresh=take(sortVideos(all,'recent'));
  return rowSection(SEC_ICO.fire,'Tendances',trending,'🔥 Tendances',n)
    +rowSection(SEC_ICO.star,'Vidéos recommandées',reco,'✨ Pour toi',n)
    +rowSection(SEC_ICO.fresh,'Nouveautés',fresh,'🧭 Explorer',n);
}

function renderFeed(all){
  const feed=document.getElementById('feed'),hero=document.getElementById('hero');
  const q=searchQuery.trim();
  const home=!q&&activeCategory==='🏠 Accueil';
  hero.hidden=!home;
  if(home) setHeroImage(all); else clearInterval(heroTimer);
  if(!all.length){feed.innerHTML=emptyHtml();return;}
  if(home){feed.innerHTML=homeSections(all);return;}

  let list,icon,title,acc={html:'',count:0};
  const cat=activeCategory;
  if(q){
    const scored=all.map(v=>({v,sc:videoMatches(v,q)})).filter(x=>x.sc>0);
    const order=new Map(sortVideos(scored.map(x=>x.v),sortMode).map((v,i)=>[v.id,i]));
    scored.sort((a,b)=>sortMode==='recent'?(b.sc-a.sc||order.get(a.v.id)-order.get(b.v.id)):(order.get(a.v.id)-order.get(b.v.id)));
    list=scored.map(x=>x.v);
    acc=accountsSection(q,all);
    icon=ico('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>');title='Résultats pour « '+escHtml(searchQuery.trim())+' »';
  }else{
    const [ic,...rest]=cat.split(' ');
    icon=ICONS[cat]||ic;title=escHtml(rest.join(' '));
    if(cat==='✨ Pour toi') list=getPersonalizedFeed(all);
    else if(cat==='🔥 Tendances') list=sortVideos(all,'trending');
    else if(cat==='📁 Mes vidéos') list=sortVideos(all.filter(v=>currentUser&&v.uploaderId===currentUser.id),sortMode);
    else if(cat==='❤️ Favoris') list=sortVideos(all.filter(v=>currentUser&&(v.likes||[]).includes(currentUser.id)),sortMode);
    else if(cat==='🧭 Explorer') list=sortVideos(all,sortMode);
    else list=sortVideos(all.filter(v=>v.category===cat),sortMode);
  }
  feed.innerHTML=acc.html+((list.length||!acc.count)?gridSection(icon,title,list):'');
}

// ── Recherche & tri ──
let searchTimer;
function onSearch(v){clearTimeout(searchTimer);searchTimer=setTimeout(async()=>{searchQuery=v;if(v.trim())await ensureUsers();loadFeed(true);},150);}
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
  const acc=e.target.closest('.acc-card');
  if(acc){openProfileById(acc.dataset.ch,acc.dataset.name);return;}
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
