/* FuriousTubes — panneau d'administration (vidéos & utilisateurs) */
let adminView='videos';

function openAdmin(){
  if(!canModerate()) return;
  document.getElementById('admTitle').textContent=currentUser.isAdmin?'👑 ADMINISTRATION':'🦺 MODÉRATION';
  document.getElementById('adminOv').classList.add('open');
  adminTab(adminView);
  renderDataPanel();
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
        const self=u.id===currentUser.id,st=isStaffRec(u),bn=isBanActive(u),isAdm=currentUser.isAdmin;
        const canBan=!u.admin&&!self&&(isAdm||(!st&&!(bn&&!u.bannedUntil)));
        return `<div class="adm-row">
          <div class="av-md">${u.avatar?`<img src="${u.avatar}">`:escHtml((u.username||'?')[0].toUpperCase())}</div>
          <div class="adm-main"><b>${escHtml(u.username||'?')}${u.admin?'<span class="adm-tag">admin</span>':''}${st?`<span class="adm-tag staff">staff${u.staff.until?' · '+fmtWait(u.staff.until-Date.now()):''}</span>`:''}${bn?`<span class="adm-tag">banni${u.bannedUntil?' · '+fmtWait(u.bannedUntil-Date.now()):''}</span>`:''}</b>
            <span>${n} vidéo(s) · ${(u.subscribers||[]).length} abonné(s)</span></div>
          <div class="adm-btns">
            <button onclick="closeAdmin();openProfileById('${u.id}','${escHtml(u.username||'')}')">Profil</button>
            ${(isAdm&&!u.admin&&!self)?`<button onclick="openStaffModal('${u.id}','${escHtml(u.username||'')}',${st})">🦺 Staff</button>`:''}
            ${canBan?`<button class="danger" onclick="adminBan('${u.id}')">${bn?'Débannir':'Bannir'}</button>`:''}
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
  if(!await actorRole()) return;
  const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
  const i=videos.findIndex(v=>v.id===id);if(i===-1)return;
  videos[i].hidden=hidden;if(!hidden)videos[i].reports=[];
  await setBin(CONFIG.VIDEOS_BIN_ID,videos);
  toast(hidden?'Vidéo masquée':'Vidéo rétablie','ok');
  renderAdminList();loadFeed();
}
async function adminDeleteVideo(id){
  if(!await actorRole()||!confirm('Supprimer définitivement cette vidéo ?')) return;
  const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
  await setBin(CONFIG.VIDEOS_BIN_ID,videos.filter(v=>v.id!==id));
  toast('Vidéo supprimée','ok');
  renderAdminList();loadFeed();
}
async function adminBan(uid){
  try{if(await toggleBan(uid)) renderAdminList();}
  catch(e){toast('Erreur : '+e.message,'er');}
}

// ── Base de données sécurisée (v2) : migration depuis les anciens « bins » (admins uniquement) ──
function renderDataPanel(){
  const box=document.getElementById('admData');
  if(!currentUser?.isAdmin){box.style.display='none';return;}
  box.style.display='';
  box.innerHTML=DATA_V2
    ?`<b>🔒 Base sécurisée active (v2)</b><p>Les droits (admin, staff, bans, pseudo, likes…) sont vérifiés par Firestore. Les anciens « bins » sont en lecture seule.</p>
      <button type="button" onclick="setDataMode(false)">Revenir à l'ancienne base (v1)</button>`
    :`<b>🔓 Ancienne base active (v1)</b><p>Avant de migrer : publiez le fichier <code>firestore.rules</code> du dépôt dans la console Firebase (Firestore → Règles). La migration copie les profils et vidéos vers la base sécurisée, puis l'active pour tout le monde (les visiteurs déjà connectés doivent recharger la page).</p>
      <button type="button" class="on" onclick="migrateToV2()">Migrer vers la base sécurisée</button>`;
}

async function migrateToV2(){
  if(!currentUser?.isAdmin||DATA_V2) return;
  if(!confirm('Migrer tous les profils et vidéos vers la base sécurisée ?\n\nAssurez-vous d\'avoir publié les nouvelles règles Firestore avant.')) return;
  const box=document.getElementById('admData');
  const say=m=>{const p=box.querySelector('p');if(p)p.textContent=m;};
  try{
    say('Lecture des anciennes données…');
    const [users,videos]=await Promise.all([getBinV1(CONFIG.USERS_BIN_ID),getBinV1(CONFIG.VIDEOS_BIN_ID)]);
    const clean=o=>JSON.parse(JSON.stringify(o));
    const used=new Set();
    const docs=[];
    for(const u of users){if(u&&u.id) docs.push(['users',u.id,clean(u)]);}
    for(const v of videos){
      if(!v||!v.id) continue;
      const d=clean(v),map={};
      for(const c of (d.comments||[])){
        let id=/^c_.+_\d+$/.test(c.id||'')?c.id:`c_${c.authorId||'anon'}_${c.date||Date.now()}`;
        while(used.has(v.id+id)||map[id]) id+='0';
        used.add(v.id+id);map[id]={...c,id};
      }
      d.comments=map;
      docs.push(['videos',v.id,d]);
    }
    for(let i=0;i<docs.length;i+=400){
      say(`Copie des données… ${Math.min(i+400,docs.length)} / ${docs.length}`);
      const batch=fbDb.batch();
      docs.slice(i,i+400).forEach(([col,id,d])=>batch.set(fbDb.collection(col).doc(id),d));
      await batch.commit();
    }
    await fbDb.collection('config').doc('app').set({dataV2:true,migratedAt:Date.now(),by:currentUser.id});
    DATA_V2=true;
    toast(`Migration terminée (${docs.length} documents) 🔒`,'ok');
    renderDataPanel();loadFeed();
  }catch(e){
    console.error('Migration :',e);
    renderDataPanel();
    toast(/permission/i.test(e.message)?'Refusé : publiez d\'abord les nouvelles règles Firestore':'Erreur de migration : '+e.message,'er');
  }
}

async function setDataMode(v2){
  if(!currentUser?.isAdmin) return;
  if(!confirm(v2?'Activer la base sécurisée ?':'Revenir à l\'ancienne base ? Les changements faits depuis la migration ne seront pas dans l\'ancienne base.')) return;
  try{
    await fbDb.collection('config').doc('app').set({dataV2:v2,changedAt:Date.now(),by:currentUser.id},{merge:true});
    DATA_V2=v2;renderDataPanel();loadFeed();
    toast(v2?'Base sécurisée activée 🔒':'Ancienne base réactivée','ok');
  }catch(e){toast('Erreur : '+e.message,'er');}
}
