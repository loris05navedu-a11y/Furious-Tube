/* FuriousTubes — commentaires */
// ── Comments ──
function renderComments(comments){
  const list=document.getElementById('commentsList');
  document.getElementById('commentCount').textContent=comments.length;
  if(!comments.length){list.innerHTML='<div class="no-comments">Aucun commentaire — soyez le premier ! 💬</div>';return;}
  list.innerHTML=[...comments].reverse().map(c=>`
    <div class="comment">
      ${getAvatarHtml(c.authorAvatar,c.author,'av-c')}
      <div class="comment-body">
        <div class="comment-author" onclick="openProfileById('${c.authorId||''}','${c.author}')">${c.author}</div>
        <div class="comment-text">${escHtml(c.text)}</div>
        <div class="comment-date">${fmtDate(c.date)}</div>
      </div>
    </div>`).join('');
}

async function sendComment(){
  if(!currentUser){toast('Connectez-vous pour commenter','er');return;}
  const input=document.getElementById('commentInput');
  const text=input.value.trim();
  if(!text) return;
  if(containsBanned(text)){toast('Commentaire non autorisé','er');return;}
  input.value='';

  const newComment={id:'c_'+Date.now(),author:currentUser.username,authorId:currentUser.id,authorAvatar:currentUser.avatar||null,text,date:Date.now()};

  try{
    const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
    const idx=videos.findIndex(v=>v.id===curId);if(idx===-1)return;
    videos[idx].comments=videos[idx].comments||[];
    videos[idx].comments.push(newComment);
    await setBin(CONFIG.VIDEOS_BIN_ID,videos);
    renderComments(videos[idx].comments);
    loadFeed();
  }catch(e){toast('Erreur commentaire','er');}
}
