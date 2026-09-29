/* FuriousTubes — signalement, suppression & bannissement */
// ── Report ──
async function doReport(){
  if(!currentUser){toast('Connectez-vous pour signaler','er');return;}
  if(!curId||!confirm('Signaler cette vidéo comme inappropriée ?')) return;
  try{
    const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
    const idx=videos.findIndex(v=>v.id===curId);if(idx===-1)return;
    videos[idx].reports=videos[idx].reports||[];
    if(videos[idx].reports.includes(currentUser.id)){toast('Déjà signalé','er');return;}
    videos[idx].reports.push(currentUser.id);
    if(videos[idx].reports.length>=3){videos[idx].hidden=true;toast('Vidéo masquée après 3 signalements','ok');}
    else toast(`Signalement ${videos[idx].reports.length}/3`,'ok');
    await setBin(CONFIG.VIDEOS_BIN_ID,videos);
    closePlayer();loadFeed();
  }catch(e){toast('Erreur signalement','er');}
}

// ── Delete ──
async function doDelete(){
  if(!curId||!confirm('Supprimer cette vidéo ?')) return;
  try{
    const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
    await setBin(CONFIG.VIDEOS_BIN_ID,videos.filter(v=>v.id!==curId));
    closePlayer();loadFeed();toast('Vidéo supprimée','ok');
  }catch(e){toast('Erreur suppression','er');}
}

// ── Ban ──
async function doBan(){
  const btn=document.getElementById('banBtn');
  const uid=btn.dataset.uid;
  const isBanned=btn.dataset.banned==='1';
  const action=isBanned?'débannir':'bannir';
  if(!confirm(`Voulez-vous vraiment ${action} cet utilisateur ?`)) return;
  try{
    const users=await getBin(CONFIG.USERS_BIN_ID);
    const idx=users.findIndex(u=>u.id===uid);
    if(idx===-1) return;
    users[idx].banned=!isBanned;
    await setBin(CONFIG.USERS_BIN_ID,users);
    btn.textContent=!isBanned?'✅ Débannir':'🚫 Bannir';
    btn.dataset.banned=!isBanned?'1':'0';
    toast(!isBanned?'Utilisateur banni 🚫':'Utilisateur débanni ✅','ok');
  }catch(e){toast('Erreur : '+e.message,'er');}
}
