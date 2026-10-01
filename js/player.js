/* FuriousTubes — lecteur, likes & abonnements */
// ── Player ──
let curId=null,curUploaderId=null,curUploaderName=null;

function openPlayer(v){
  curId=v.id;curUploaderId=v.uploaderId;curUploaderName=v.uploader;
  document.getElementById('ptitle').textContent=v.title;
  document.getElementById('pcat').textContent=v.category||'';
  document.getElementById('pdate').textContent=fmtDate(v.date);
  const av=document.getElementById('pav');
  av.innerHTML=v.uploaderAvatar?`<img src="${v.uploaderAvatar}">`:(v.uploader||'?')[0].toUpperCase();
  document.getElementById('pupname').textContent=v.uploader;
  const isAdmin=!!(currentUser&&currentUser.isAdmin);
  document.getElementById('delbtn').style.display=(currentUser&&(currentUser.id===v.uploaderId||isAdmin))?'':'none';
  const hideBtn=document.getElementById('hidebtn');
  hideBtn.style.display=isAdmin?'':'none';
  hideBtn.textContent=v.hidden?'👁 Rétablir':'🙈 Masquer';
  const nRep=(v.reports||[]).length;
  document.getElementById('repbtn').title=isAdmin?`${nRep} signalement(s)`:'Signaler';
  document.getElementById('subBtn2').style.display=(currentUser&&currentUser.id===v.uploaderId)?'none':'';
  updateLikeUI(v);
  renderComments(v.comments||[]);

  // Load sub state
  getBin(CONFIG.USERS_BIN_ID).then(users=>{
    const uploader=users.find(u=>u.id===v.uploaderId);
    updateSubUI(uploader);
  }).catch(()=>{});

  document.getElementById('pov').classList.add('open');
  pauseMusic();
  FTPlayer.load(v.url);
}

function closePlayer(){
  document.getElementById('pov').classList.remove('open');
  FTPlayer.unload();
  curId=null;curUploaderId=null;curUploaderName=null;
  resumeMusic();
}
document.getElementById('pov').addEventListener('click',e=>{if(e.target.id==='pov')closePlayer();});

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
  btn.textContent=!wasSubbed?'✓ Abonné':'➕ S\'abonner';
  toast(!wasSubbed?'Vous êtes abonné ! 🔥':'Désabonné','ok');

  getBin(CONFIG.USERS_BIN_ID).then(users=>{
    const idx=users.findIndex(u=>u.id===curUploaderId);if(idx===-1)return;
    users[idx].subscribers=users[idx].subscribers||[];
    if(wasSubbed) users[idx].subscribers=users[idx].subscribers.filter(id=>id!==currentUser.id);
    else if(!users[idx].subscribers.includes(currentUser.id)) users[idx].subscribers.push(currentUser.id);
    return setBin(CONFIG.USERS_BIN_ID,users);
  }).catch(()=>{});
}

function updateSubUI(uploader){
  const subs=uploader?.subscribers||[];
  const isSub=currentUser&&subs.includes(currentUser.id);
  const btn=document.getElementById('subBtn2');
  if(btn){btn.classList.toggle('subscribed',isSub);btn.textContent=isSub?'✓ Abonné':'➕ S\'abonner';}
}
