/* FuriousTubes — panneau d'administration (vidéos & utilisateurs) */
let adminView='videos';

function openAdmin(){
  if(!currentUser?.isAdmin) return;
  document.getElementById('adminOv').classList.add('open');
  adminTab(adminView);
}
function closeAdmin(){document.getElementById('adminOv').classList.remove('open');}
document.getElementById('adminOv').addEventListener('click',e=>{if(e.target.id==='adminOv')closeAdmin();});

function adminTab(view){
  adminView=view;
  document.getElementById('admTabVids').classList.toggle('active',view==='videos');
  document.getElementById('admTabUsers').classList.toggle('active',view==='users');
  renderAdminList();
}

async function renderAdminList(){
  const box=document.getElementById('adminList');
  box.innerHTML='<div class="no-comments">Chargement…</div>';
  try{
    if(adminView==='videos'){
      const videos=(await getBin(CONFIG.VIDEOS_BIN_ID)).filter(v=>v.id).sort((a,b)=>(b.reports||[]).length-(a.reports||[]).length||b.date-a.date);
      if(!videos.length){box.innerHTML='<div class="no-comments">Aucune vidéo</div>';return;}
      box.innerHTML=videos.map(v=>`
        <div class="adm-row">
          <img src="${v.thumb||''}" onerror="this.style.visibility='hidden'">
          <div class="adm-main"><b>${escHtml(v.title)}${v.hidden?'<span class="adm-tag">masquée</span>':''}</b>
            <span>${escHtml(v.uploader||'?')} · 👍 ${(v.likes||[]).length} · 💬 ${(v.comments||[]).length} · ⚠ ${(v.reports||[]).length}</span></div>
          <div class="adm-btns">
            <button onclick="adminOpenVideo('${v.id}')">Voir</button>
            <button onclick="adminSetHidden('${v.id}',${!v.hidden})">${v.hidden?'Rétablir':'Masquer'}</button>
            <button class="danger" onclick="adminDeleteVideo('${v.id}')">Supprimer</button>
          </div>
        </div>`).join('');
    }else{
      const [users,videos]=await Promise.all([getBin(CONFIG.USERS_BIN_ID),getBin(CONFIG.VIDEOS_BIN_ID)]);
      const list=users.filter(u=>u.id);
      if(!list.length){box.innerHTML='<div class="no-comments">Aucun utilisateur</div>';return;}
      box.innerHTML=list.map(u=>{
        const n=videos.filter(v=>v.uploaderId===u.id).length;
        const self=u.id===currentUser.id;
        return `<div class="adm-row">
          <div class="av-md">${u.avatar?`<img src="${u.avatar}">`:escHtml((u.username||'?')[0].toUpperCase())}</div>
          <div class="adm-main"><b>${escHtml(u.username||'?')}${u.admin?'<span class="adm-tag">admin</span>':''}${u.banned?'<span class="adm-tag">banni</span>':''}</b>
            <span>${n} vidéo(s) · ${(u.subscribers||[]).length} abonné(s)</span></div>
          <div class="adm-btns">
            <button onclick="closeAdmin();openProfileById('${u.id}','${escHtml(u.username||'')}')">Profil</button>
            ${(u.admin||self)?'':`<button class="danger" onclick="adminBan('${u.id}',${!u.banned})">${u.banned?'Débannir':'Bannir'}</button>`}
          </div></div>`;
      }).join('');
    }
  }catch(e){box.innerHTML='<div class="no-comments">Erreur de chargement</div>';}
}

async function adminOpenVideo(id){
  const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
  const v=videos.find(x=>x.id===id);
  if(v){closeAdmin();openPlayer(v);}
}
async function adminSetHidden(id,hidden){
  if(!currentUser?.isAdmin) return;
  const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
  const i=videos.findIndex(v=>v.id===id);if(i===-1)return;
  videos[i].hidden=hidden;if(!hidden)videos[i].reports=[];
  await setBin(CONFIG.VIDEOS_BIN_ID,videos);
  toast(hidden?'Vidéo masquée':'Vidéo rétablie','ok');
  renderAdminList();loadFeed();
}
async function adminDeleteVideo(id){
  if(!currentUser?.isAdmin||!confirm('Supprimer définitivement cette vidéo ?')) return;
  const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
  await setBin(CONFIG.VIDEOS_BIN_ID,videos.filter(v=>v.id!==id));
  toast('Vidéo supprimée','ok');
  renderAdminList();loadFeed();
}
async function adminBan(uid,ban){
  if(!currentUser?.isAdmin||!confirm(ban?'Bannir cet utilisateur ?':'Débannir cet utilisateur ?')) return;
  const users=await getBin(CONFIG.USERS_BIN_ID);
  const i=users.findIndex(u=>u.id===uid);if(i===-1||users[i].admin)return;
  users[i].banned=ban;
  await setBin(CONFIG.USERS_BIN_ID,users);
  toast(ban?'Utilisateur banni 🚫':'Utilisateur débanni ✅','ok');
  renderAdminList();
}
