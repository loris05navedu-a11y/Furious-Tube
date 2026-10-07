/* FuriousTubes — profils & avatars */
// ── Profile ──
let viewingProfileId=null;

function closeProfile(){document.getElementById('profileOv').classList.remove('open');viewingProfileId=null;}

async function openProfileById(uid,uname){
  if(!uid) return;
  viewingProfileId=uid;
  document.getElementById('profileOv').classList.add('open');
  const isMe=currentUser&&currentUser.id===uid;

  // Avatar
  const initial=document.getElementById('profAvatarInitial');
  const img=document.getElementById('profAvatarImg');
  const overlay=document.getElementById('editOverlay');
  initial.textContent=(uname||'?')[0].toUpperCase();
  img.style.display='none'; img.src='';
  overlay.style.display=isMe?'':'none';
  const logoutBtn=document.getElementById('logoutBtn');
  if(logoutBtn) logoutBtn.style.display=isMe?'':'none';

  document.getElementById('profName').textContent=uname||'';
  cancelNameEdit();
  const nb=document.getElementById('nameEditBtn');if(nb){nb.style.display=isMe?'':'none';nb.title=currentUser&&currentUser.isAdmin?"Modifier le nom d'utilisateur":isStaff()?"Modifier le nom d'utilisateur (1 fois / 4 h)":"Modifier le nom d'utilisateur (1 fois / 24 h)";}
  const crown=document.getElementById('profCrown');
  crown.style.display=(isMe&&currentUser.isAdmin)?'':'none';
  document.getElementById('profStaff').style.display='none';
  document.getElementById('staffBtn').style.display='none';
  document.getElementById('adminPending').style.display=(isMe&&adminPending())?'':'none';
  document.getElementById('profSince').textContent='Chargement...';
  document.getElementById('profSubs').textContent='—';
  document.getElementById('profVids').textContent='—';
  document.getElementById('profTime').textContent='—';
  document.getElementById('profVideoList').innerHTML='';

  try{
    // Load users and videos separately to be more robust
    let users=[], videos=[];
    try{ users=await getBin(CONFIG.USERS_BIN_ID); }catch(e){ users=[]; }
    try{ videos=await getBin(CONFIG.VIDEOS_BIN_ID); }catch(e){ videos=[]; }

    // Try to find by id first, then by username
    let user=users.find(u=>u.id===uid);
    if(!user) user=users.find(u=>u.username?.toLowerCase()===uname?.toLowerCase());

    const uvideos=videos.filter(v=>(v.uploaderId===uid||(v.uploader?.toLowerCase()===uname?.toLowerCase()))&&!v.hidden);

    // Show avatar if exists
    if(user?.avatar){
      img.src=user.avatar; img.style.display='block';
      initial.style.display='none';
      if(isMe&&currentUser){currentUser.avatar=user.avatar;saveSession(currentUser);renderHeader();}
    } else {
      img.style.display='none'; initial.style.display='';
    }

    if(isMe) crown.style.display=currentUser.isAdmin?'':'none';
    else if(user?.admin) crown.style.display='';
    const subs=user?.subscribers?.length||0;
    const since=user?.date?Math.floor((Date.now()-user.date)/(86400000)):0;
    const mins=user?.timeOnSite||0;
    const hours=Math.floor(mins/60);
    document.getElementById('profSince').textContent=since===0?"Actif depuis aujourd'hui":since===1?'Actif depuis 1 jour':`Actif depuis ${since} jours`;
    document.getElementById('profSubs').textContent=subs;
    document.getElementById('profVids').textContent=uvideos.length;
    document.getElementById('profTime').textContent=hours>0?hours+'h':(mins>0?`${mins}min`:'0min');

    // Creator stats for their own profile
    const csec=document.getElementById('creatorStats');
    if(isMe && uvideos.length > 0) {
      const stats=getCreatorStats(uid,videos);
      document.getElementById('statViews').textContent=fmtCount(stats.totalViews);
      document.getElementById('statLikes').textContent=fmtCount(stats.totalLikes);
      document.getElementById('statComments').textContent=fmtCount(stats.totalComments);
      document.getElementById('statEngagement').textContent=stats.engagementRate.toFixed(1)+'%';
      csec.style.display='';
    } else {
      csec.style.display='none';
    }

    // Boutons de modération : admin = tout ; staff = pas d'admin ni de staff, et pas de levée d'un ban définitif
    const banBtn=document.getElementById('banBtn'),staffBtn=document.getElementById('staffBtn');
    const isAdmin=!!(currentUser&&currentUser.isAdmin),mod=canModerate();
    const targetIsAdmin=!!user?.admin,targetStaff=isStaffRec(user),banned=isBanActive(user);
    const canBan=mod&&!isMe&&!targetIsAdmin&&(isAdmin||(!targetStaff&&!(banned&&!user?.bannedUntil)));
    if(banBtn){
      banBtn.style.display=canBan?'':'none';
      banBtn.textContent=banned?'✅ Débannir':'🚫 Bannir';
      banBtn.dataset.banned=banned?'1':'0';banBtn.dataset.uid=uid;
    }
    if(staffBtn){
      staffBtn.style.display=(isAdmin&&!isMe&&!targetIsAdmin)?'':'none';
      staffBtn.dataset.uid=uid;staffBtn.dataset.active=targetStaff?'1':'0';
      staffBtn.textContent=targetStaff?'🦺 Staff ✓':'🦺 Staff';
    }
    const sb=document.getElementById('profStaff');
    if(targetStaff){
      sb.innerHTML=BIB_SVG(21)+'Staff';
      sb.title=user.staff.until?'Staff jusqu\'au '+fmtDate(user.staff.until):'Membre du staff';
      sb.style.display='';
    }else sb.style.display='none';

    const list=document.getElementById('profVideoList');
    if(!uvideos.length){list.innerHTML='<div style="font-size:12px;color:var(--muted);text-align:center;padding:14px">Aucune vidéo</div>';return;}
    list.innerHTML=[...uvideos].reverse().map(v=>`
      <div class="pv-item" onclick="closeProfile();setTimeout(()=>openPlayer(${JSON.stringify(v).replace(/'/g,'&#39;')}),200)">
        <img class="pv-thumb" src="${v.thumb||''}" onerror="this.style.display='none'">
        <div style="min-width:0">
          <div class="pv-title">${v.title}</div>
          <div class="pv-likes">👍 ${(v.likes||[]).length} · ${fmtDate(v.date)}</div>
        </div>
      </div>`).join('');
  }catch(e){
    console.error('Profile load error:',e);
    document.getElementById('profSince').textContent='Erreur : '+e.message;
    document.getElementById('profSubs').textContent='0';
    document.getElementById('profVids').textContent='0';
    document.getElementById('profTime').textContent='0min';
  }
}

// ── Avatar upload ──
function tryEditAvatar(){
  if(!currentUser||viewingProfileId!==currentUser.id) return;
  document.getElementById('avatarFileInput').click();
}

document.getElementById('avatarFileInput').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file) return;
  if(file.size>2*1024*1024){toast('Image trop lourde (max 2 MB)','er');return;}
  try{
    // Upload to Cloudinary as image
    const fd=new FormData();fd.append('file',file);fd.append('upload_preset',CONFIG.UPLOAD_PRESET);
    const r=await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUD_NAME}/image/upload`,{method:'POST',body:fd});
    const cr=await r.json();
    if(cr.error) throw new Error(cr.error.message);
    const avatarUrl=cr.secure_url;

    toast('Photo uploadée, mise à jour en cours...','ok');

    // Save to user
    const users=await getBin(CONFIG.USERS_BIN_ID);
    const idx=users.findIndex(u=>u.id===currentUser.id);if(idx===-1)return;
    users[idx].avatar=avatarUrl;
    await setBin(CONFIG.USERS_BIN_ID,users);

    // Update all videos and comments with new avatar
    const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
    let changed=false;
    for(const v of videos){
      if(v.uploaderId===currentUser.id){v.uploaderAvatar=avatarUrl;changed=true;}
      if(v.comments&&!DATA_V2){
        for(const c of v.comments){
          if(c.authorId===currentUser.id){c.authorAvatar=avatarUrl;changed=true;}
        }
      }
    }
    if(changed) await setBin(CONFIG.VIDEOS_BIN_ID,videos);

    // Update session
    currentUser.avatar=avatarUrl;saveSession(currentUser);renderHeader();

    // Refresh profile + feed
    openProfileById(currentUser.id,currentUser.username);
    loadFeed();
    toast('Photo de profil mise à jour partout ! 🎉','ok');
  }catch(e){toast('Erreur upload photo : '+e.message,'er');}
  e.target.value='';
});

// ── Changement de pseudo (1 fois toutes les 24 h) ──
function cancelNameEdit(){
  const f=document.getElementById('nameForm');if(!f) return;
  f.style.display='none';document.getElementById('profName').style.display='';
  const b=document.getElementById('nameEditBtn');
  if(b&&currentUser&&viewingProfileId===currentUser.id) b.style.display='';
}
function startNameEdit(){
  if(!currentUser||viewingProfileId!==currentUser.id) return;
  const inp=document.getElementById('nameInput');
  inp.value=currentUser.username;
  document.getElementById('profName').style.display='none';
  document.getElementById('nameEditBtn').style.display='none';
  document.getElementById('nameForm').style.display='flex';
  inp.focus();inp.select();
}
function fmtWait(ms){
  const t=Math.max(1,Math.ceil(ms/60000)),h=Math.floor(t/60),m=t%60;
  return h>0?`${h} h ${m} min`:`${m} min`;
}
async function saveName(){
  if(!currentUser) return;
  const name=document.getElementById('nameInput').value.trim();
  if(name===currentUser.username){cancelNameEdit();return;}
  const err=checkUsername(name,!!currentUser.isAdmin);
  const role=await actorRole();
  const cd=role==='admin'?0:role==='staff'?STAFF_NAME_COOLDOWN:USER_NAME_COOLDOWN;
  if(err){toast(err,'er');return;}
  if(name.toLowerCase()===ADMIN_USERNAME.toLowerCase()&&!currentUser.isAdmin){toast('Ce pseudo est réservé ❌','er');return;}
  const ok=document.querySelector('#nameForm .name-ok');ok.disabled=true;
  try{
    const users=await getBin(CONFIG.USERS_BIN_ID);
    const idx=users.findIndex(u=>u.id===currentUser.id);
    if(idx===-1) throw new Error('Compte introuvable');
    const last=users[idx].usernameChangedAt||0;
    if(Date.now()-last<cd){toast('Prochain changement possible dans '+fmtWait(cd-(Date.now()-last)),'er');return;}
    if(users.some(u=>u.id!==currentUser.id&&u.username?.toLowerCase()===name.toLowerCase())){toast('Ce pseudo est déjà pris ❌','er');return;}
    users[idx].username=name;users[idx].usernameChangedAt=Date.now();
    await setBin(CONFIG.USERS_BIN_ID,users);

    const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
    let changed=false;
    for(const v of videos){
      if(v.uploaderId===currentUser.id){v.uploader=name;changed=true;}
      if(!DATA_V2) for(const c of (v.comments||[])) if(c.authorId===currentUser.id){c.author=name;changed=true;}
    }
    if(changed) await setBin(CONFIG.VIDEOS_BIN_ID,videos);

    currentUser.username=name;saveSession(currentUser);renderHeader();
    usersCache=null;
    openProfileById(currentUser.id,name);
    loadFeed();
    toast('Pseudo modifié ! ✏️','ok');
  }catch(e){toast('Erreur : '+e.message,'er');}
  finally{ok.disabled=false;}
}
