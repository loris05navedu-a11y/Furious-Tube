/* FuriousTubes — lecteur, likes & abonnements */
// ── Page de visionnage ──
let curId=null,curUploaderId=null,curUploaderName=null;

function urlVideoId(){return new URLSearchParams(location.search).get('v');}

function openPlayer(v){
  const pov=document.getElementById('pov');
  const wasOpen=pov.classList.contains('open');
  curId=v.id;curUploaderId=v.uploaderId;curUploaderName=v.uploader;
  document.getElementById('ptitle').textContent=v.title;
  document.title=v.title+' — FuriousTubes';
  document.getElementById('pcat').textContent=v.category||'';
  document.getElementById('pcat').style.display=v.category?'':'none';
  document.getElementById('pstats').textContent=fmtViews(v)+' · '+fmtCount((v.likes||[]).length)+' J’aime · '+fmtAgo(v.date);
  countView(v);
  document.getElementById('pdate').textContent=v.date?'· '+fmtDate(v.date):'';
  const av=document.getElementById('pav');
  if(v.uploaderAvatar){av.innerHTML='<img alt="">';av.querySelector('img').src=v.uploaderAvatar;}
  else av.textContent=(v.uploader||'?')[0].toUpperCase();
  document.getElementById('pupname').textContent=v.uploader;
  document.getElementById('psubs').textContent='';
  const isAdmin=canModerate();
  document.getElementById('delbtn').style.display=(currentUser&&(currentUser.id===v.uploaderId||isAdmin))?'':'none';
  const hideBtn=document.getElementById('hidebtn');
  hideBtn.style.display=isAdmin?'':'none';
  hideBtn.textContent=v.hidden?'👁 Rétablir':'🙈 Masquer';
  const nRep=(v.reports||[]).length;
  document.getElementById('repbtn').title=isAdmin?`${nRep} signalement(s)`:'Signaler';
  document.getElementById('subBtn2').style.display=(currentUser&&currentUser.id===v.uploaderId)?'none':'';
  updateLikeUI(v);
  document.getElementById('commentsSec').classList.remove('open');
  renderComments(v.comments||[]);
  renderUpNext(v);

  getBin(CONFIG.USERS_BIN_ID).then(users=>{
    if(curId!==v.id)return;
    updateSubUI(users.find(u=>u.id===v.uploaderId));
    renderComments(v.comments||[]);
  }).catch(()=>{});

  if(urlVideoId()!==v.id){
    const u=new URL(location.href);u.searchParams.set('v',v.id);
    history.pushState({ftv:v.id},'',u);
  }
  pov.classList.add('open');
  pov.setAttribute('aria-hidden','false');
  document.body.classList.add('watching');
  pov.scrollTop=0;
  if(!wasOpen)pauseMusic();
  FTPlayer.load(v.url);
}

function hidePlayer(){
  const pov=document.getElementById('pov');
  if(!pov.classList.contains('open'))return;
  pov.classList.remove('open');
  pov.setAttribute('aria-hidden','true');
  document.body.classList.remove('watching');
  document.title='FuriousTubes';
  FTPlayer.unload();
  curId=null;curUploaderId=null;curUploaderName=null;
  resumeMusic();
}

function closePlayer(){
  hidePlayer();
  if(urlVideoId()){const u=new URL(location.href);u.searchParams.delete('v');history.pushState(null,'',u);}
}

// Bouton « retour » du navigateur / du téléphone
window.addEventListener('popstate',()=>{
  const id=urlVideoId();
  if(!id){hidePlayer();return;}
  if(id!==curId){const v=findVideo(id);if(v&&!v.hidden)openPlayer(v);else hidePlayer();}
});

// Lien partagé : ?v=<id>
function openFromUrl(){
  const id=urlVideoId();if(!id)return;
  const v=findVideo(id);
  if(v&&(!v.hidden||canModerate())){
    history.replaceState({ftv:id},'',location.href);
    openPlayer(v);
  }else toast('Vidéo introuvable','er');
}

// « À suivre » : même catégorie et même créateur d'abord, puis les plus récentes
function renderUpNext(v){
  const list=(cachedVideos||[]).filter(x=>x.id&&!x.hidden&&x.id!==v.id).map(x=>{
    let s=0;
    if(x.category&&x.category===v.category)s+=3;
    if(x.uploaderId===v.uploaderId)s+=2;
    s+=Math.max(0,1-(Date.now()-(x.date||0))/(30*864e5));
    return{x,s};
  }).sort((a,b)=>b.s-a.s).slice(0,20).map(o=>o.x);
  document.getElementById('upNext').innerHTML=list.length
    ?list.map(videoCardHtml).join('')
    :'<div class="no-comments">Aucune autre vidéo pour le moment.</div>';
}

function shareVideo(){
  if(!curId)return;
  const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('v',curId);
  const url=u.toString(),title=document.getElementById('ptitle').textContent;
  if(navigator.share){navigator.share({title,url}).catch(()=>{});return;}
  if(navigator.clipboard)navigator.clipboard.writeText(url).then(()=>toast('Lien copié ! 🔗','ok')).catch(()=>prompt('Copiez le lien :',url));
  else prompt('Copiez le lien :',url);
}

function toggleComments(){document.getElementById('commentsSec').classList.toggle('open');}

// ── Instant Like/Dislike ──
function doLike(){
  if(!requireLogin('Connectez-vous pour liker'))return;
  if(!curId) return;
  const btn=document.getElementById('likeBtn');
  const cnt=document.getElementById('likeCount');
  const wasLiked=btn.classList.contains('active');
  const disBtn=document.getElementById('dislikeBtn');
  const disCnt=document.getElementById('dislikeCount');

  // Instant UI
  btn.classList.toggle('active',!wasLiked);
  cnt.textContent=parseInt(cnt.textContent)+(wasLiked?-1:1);
  if(!wasLiked&&disBtn.classList.contains('active')){
    disBtn.classList.remove('active');
    disCnt.textContent=Math.max(0,parseInt(disCnt.textContent)-1);
  }

  // Save in background
  getBin(CONFIG.VIDEOS_BIN_ID).then(videos=>{
    const idx=videos.findIndex(v=>v.id===curId);if(idx===-1)return;
    videos[idx].likes=videos[idx].likes||[];
    videos[idx].dislikes=videos[idx].dislikes||[];
    if(wasLiked) videos[idx].likes=videos[idx].likes.filter(id=>id!==currentUser.id);
    else{videos[idx].likes.push(currentUser.id);videos[idx].dislikes=videos[idx].dislikes.filter(id=>id!==currentUser.id);}
    return setBin(CONFIG.VIDEOS_BIN_ID,videos);
  }).then(()=>loadFeed()).catch(()=>{});
}

function doDislike(){
  if(!requireLogin('Connectez-vous pour donner votre avis'))return;
  if(!curId) return;
  const btn=document.getElementById('dislikeBtn');
  const cnt=document.getElementById('dislikeCount');
  const wasDisliked=btn.classList.contains('active');
  const likeBtn=document.getElementById('likeBtn');
  const likeCnt=document.getElementById('likeCount');

  btn.classList.toggle('active',!wasDisliked);
  cnt.textContent=parseInt(cnt.textContent)+(wasDisliked?-1:1);
  if(!wasDisliked&&likeBtn.classList.contains('active')){
    likeBtn.classList.remove('active');
    likeCnt.textContent=Math.max(0,parseInt(likeCnt.textContent)-1);
  }

  getBin(CONFIG.VIDEOS_BIN_ID).then(videos=>{
    const idx=videos.findIndex(v=>v.id===curId);if(idx===-1)return;
    videos[idx].likes=videos[idx].likes||[];
    videos[idx].dislikes=videos[idx].dislikes||[];
    if(wasDisliked) videos[idx].dislikes=videos[idx].dislikes.filter(id=>id!==currentUser.id);
    else{videos[idx].dislikes.push(currentUser.id);videos[idx].likes=videos[idx].likes.filter(id=>id!==currentUser.id);}
    return setBin(CONFIG.VIDEOS_BIN_ID,videos);
  }).then(()=>loadFeed()).catch(()=>{});
}

function updateLikeUI(v){
  const likes=v.likes||[],dislikes=v.dislikes||[];
  document.getElementById('likeCount').textContent=likes.length;
  document.getElementById('dislikeCount').textContent=dislikes.length;
  document.getElementById('likeBtn').classList.toggle('active',currentUser&&likes.includes(currentUser.id));
  document.getElementById('dislikeBtn').classList.toggle('active',currentUser&&dislikes.includes(currentUser.id));
}

// ── Instant Subscribe ──
function doSubscribe(){
  if(!requireLogin('Connectez-vous pour vous abonner'))return;
  if(!curUploaderId||curUploaderId===currentUser.id) return;
  const btn=document.getElementById('subBtn2');
  const wasSubbed=btn.classList.contains('subscribed');
  btn.classList.toggle('subscribed',!wasSubbed);
  btn.textContent=!wasSubbed?'Abonné':'S\'abonner';
  const n=parseInt(document.getElementById('psubs').dataset.n||'0',10);
  setSubCount(Math.max(0,n+(wasSubbed?-1:1)));
  toast(!wasSubbed?'Vous êtes abonné ! 🔥':'Désabonné','ok');

  getBin(CONFIG.USERS_BIN_ID).then(users=>{
    const idx=users.findIndex(u=>u.id===curUploaderId);if(idx===-1)return;
    users[idx].subscribers=users[idx].subscribers||[];
    if(wasSubbed) users[idx].subscribers=users[idx].subscribers.filter(id=>id!==currentUser.id);
    else if(!users[idx].subscribers.includes(currentUser.id)) users[idx].subscribers.push(currentUser.id);
    return setBin(CONFIG.USERS_BIN_ID,users);
  }).catch(()=>{});
}

function setSubCount(n){
  document.getElementById('psubs').textContent=`${fmtCount(n)} abonné${n>1?'s':''}`;
  document.getElementById('psubs').dataset.n=n;
}
function updateSubUI(uploader){
  const subs=uploader?.subscribers||[];
  const isSub=currentUser&&subs.includes(currentUser.id);
  const btn=document.getElementById('subBtn2');
  if(btn){btn.classList.toggle('subscribed',isSub);btn.textContent=isSub?'Abonné':'S\'abonner';}
  setSubCount(subs.length);
}
