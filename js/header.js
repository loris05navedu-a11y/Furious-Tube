/* FuriousTubes — en-tête */
// ── Header ──
function renderHeader(){
  const el=document.getElementById('headerRight');
  if(currentUser){
    // Connecté : « Connexion » devient « Profil » (la déconnexion se trouve dans le profil)
    const pic = currentUser.avatar ? '<img alt="">' : '';
    el.innerHTML=`
      <button class="btn btn-profile" onclick="openMyProfile()"><span class="av-xs">${pic}</span><span class="lbl">Profil</span></button>
      ${canModerate()?'<button class="btn btn-admin" onclick="openAdmin()"><span class="lbl">'+(currentUser.isAdmin?'<svg class="ico" viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>':BIB_SVG(15).replace('<svg ','<svg class="ico" '))+''+(currentUser.isAdmin?'Admin':'Staff')+'</span></button>':''}
      <button class="btn btn-primary" onclick="openUpload()"><span class="lbl"><svg class="ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6m0 0l-5 5m5-5l5 5"/></svg>Importer</span></button>`;
    const av=el.querySelector('.av-xs');
    if(currentUser.avatar) av.querySelector('img').src=currentUser.avatar;
    else av.textContent=(currentUser.username||'?')[0].toUpperCase();
    el.querySelector('.btn-profile').title=currentUser.username||'Profil';
  } else {
    el.innerHTML=`<button class="btn btn-outline" onclick="openAuth('login')"><span class="lbl">Se connecter</span></button><button class="btn btn-primary" onclick="openAuth('register')"><span class="lbl">S'inscrire</span></button>`;
  }
}

function openMyProfile(){
  if(currentUser) openProfileById(currentUser.id,currentUser.username);
}
