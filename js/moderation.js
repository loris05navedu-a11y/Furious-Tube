/* FuriousTubes — signalement, suppression & bannissement */
// ── Report ──
async function doReport(){
  if(!requireLogin('Connectez-vous pour signaler'))return;
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
  try{
    const r=await toggleBan(btn.dataset.uid);
    if(!r) return;
    btn.textContent=r.banned?'✅ Débannir':'🚫 Bannir';
    btn.dataset.banned=r.banned?'1':'0';
  }catch(e){toast('Erreur : '+e.message,'er');}
}

// ── Admin : masquer / rétablir la vidéo ouverte ──
async function adminToggleHide(){
  if(!curId||!await actorRole()) return;
  try{
    const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
    const idx=videos.findIndex(v=>v.id===curId);if(idx===-1)return;
    videos[idx].hidden=!videos[idx].hidden;
    if(!videos[idx].hidden) videos[idx].reports=[];
    await setBin(CONFIG.VIDEOS_BIN_ID,videos);
    toast(videos[idx].hidden?'Vidéo masquée 🙈':'Vidéo rétablie 👁','ok');
    closePlayer();loadFeed();
  }catch(e){toast('Erreur','er');}
}
