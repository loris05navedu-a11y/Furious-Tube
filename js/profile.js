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

    const subs=user?.subscribers?.length||0;
    const since=user?.date?Math.floor((Date.now()-user.date)/(86400000)):0;
    const mins=user?.timeOnSite||0;
    const hours=Math.floor(mins/60);
    document.getElementById('profSince').textContent=since===0?"Actif depuis aujourd'hui":since===1?'Actif depuis 1 jour':`Actif depuis ${since} jours`;
    document.getElementById('profSubs').textContent=subs;
    document.getElementById('profVids').textContent=uvideos.length;
    document.getElementById('profTime').textContent=hours>0?hours+'h':(mins>0?`${mins}min`:'0min');

    // Show ban button for admin (not on own profile, not on other admin)
    const banBtn=document.getElementById('banBtn');
    const isAdmin=!!(currentUser&&currentUser.isAdmin);
    const targetIsAdmin=!!user?.admin;
    if(banBtn) banBtn.style.display=(isAdmin&&!isMe&&!targetIsAdmin)?'':'none';
    if(banBtn&&user?.banned) banBtn.textContent='✅ Débannir';
    if(banBtn) banBtn.dataset.banned=user?.banned?'1':'0';
    if(banBtn) banBtn.dataset.uid=uid;

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
      if(v.comments){
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
