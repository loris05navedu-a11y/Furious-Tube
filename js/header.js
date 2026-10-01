/* FuriousTubes — en-tête */
// ── Header ──
function renderHeader(){
  const el=document.getElementById('headerRight');
  if(currentUser){
    // Connecté : « Connexion » devient « Profil » (la déconnexion se trouve dans le profil)
    const pic = currentUser.avatar ? '<img alt="">' : '';
    el.innerHTML=`
      <button class="btn btn-profile" onclick="openMyProfile()"><span class="av-xs">${pic}</span><span class="lbl">Profil</span></button>
      ${currentUser.isAdmin?'<button class="btn btn-admin" onclick="openAdmin()"><span class="lbl"><span class="ico">👑 </span>Admin</span></button>':''}
      <button class="btn btn-primary" onclick="openUpload()"><span class="lbl"><span class="ico">⬆ </span>Importer</span></button>`;
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
