/* FuriousTubes — commentaires */
// ── Comments ──
// Nom et photo à jour (profil actuel de l'auteur) plutôt que ceux enregistrés au moment du commentaire
function commentAuthor(c){
  const u=usersById[c.authorId];
  return {name:(u&&u.username)||c.author||'?',avatar:u?(u.avatar||null):(c.authorAvatar||null)};
}

function renderComments(comments){
  const list=document.getElementById('commentsList');
  document.getElementById('commentCount').textContent=fmtCount(comments.length);
  const prev=document.getElementById('cmPreview');
  const last=comments[comments.length-1];
  const la=last&&commentAuthor(last);
  prev.innerHTML=last
    ?`${getAvatarHtml(la.avatar,la.name,'av-c')}<span class="cm-preview-text">${escHtml(last.text)}</span>`
    :'<span class="cm-preview-text cm-empty">Ajouter un commentaire...</span>';
  if(!comments.length){list.innerHTML='<div class="no-comments">Aucun commentaire — soyez le premier ! 💬</div>';return;}
  list.innerHTML=[...comments].reverse().map(c=>{const a=commentAuthor(c);return `
    <div class="comment">
      ${getAvatarHtml(a.avatar,a.name,'av-c')}
      <div class="comment-body">
        <div class="comment-author" onclick="openProfileById('${escHtml(c.authorId||'')}','${escHtml(a.name)}')">${escHtml(a.name)}</div>
        <div class="comment-text">${escHtml(c.text)}</div>
        <div class="comment-date">${fmtDate(c.date)}${(currentUser&&(canModerate()||currentUser.id===c.authorId))?` · <span class="comment-del" onclick="deleteComment('${c.id}')">Supprimer</span>`:''}</div>
      </div>
    </div>`;}).join('');
}

async function sendComment(){
  if(!requireLogin('Connectez-vous pour commenter'))return;
  const input=document.getElementById('commentInput');
  const text=input.value.trim();
  if(!text) return;
  if(containsBanned(text)){toast('Commentaire non autorisé','er');return;}
  input.value='';

  const newComment={id:'c_'+currentUser.id+'_'+Date.now(),author:currentUser.username,authorId:currentUser.id,authorAvatar:currentUser.avatar||null,text,date:Date.now()};

  try{
    recordActivity('comment', curId);
    const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
    const idx=videos.findIndex(v=>v.id===curId);if(idx===-1)return;
    videos[idx].comments=videos[idx].comments||[];
    videos[idx].comments.push(newComment);
    await setBin(CONFIG.VIDEOS_BIN_ID,videos);
    renderComments(videos[idx].comments);
    loadFeed();
  }catch(e){toast('Erreur commentaire','er');}
}

// Suppression : l'auteur du commentaire ou un admin
async function deleteComment(cid){
  if(!currentUser||!curId||!confirm('Supprimer ce commentaire ?')) return;
  try{
    const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
    const idx=videos.findIndex(v=>v.id===curId);if(idx===-1)return;
    const c=(videos[idx].comments||[]).find(x=>x.id===cid);
    if(!c||!(canModerate()||c.authorId===currentUser.id)) return;
    videos[idx].comments=videos[idx].comments.filter(x=>x.id!==cid);
    await setBin(CONFIG.VIDEOS_BIN_ID,videos);
    renderComments(videos[idx].comments);
    loadFeed();
    toast('Commentaire supprimé','ok');
  }catch(e){toast('Erreur suppression','er');}
}
