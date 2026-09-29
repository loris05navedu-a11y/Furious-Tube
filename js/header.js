/* FuriousTubes — en-tête */
// ── Header ──
function renderHeader(){
  const el=document.getElementById('headerRight');
  el.style.cssText='display:flex;align-items:center;gap:6px;flex-shrink:0';
  if(currentUser){
    const pic = currentUser.avatar ? `<img src="${currentUser.avatar}">` : currentUser.username[0].toUpperCase();
    el.innerHTML=`
      <div class="user-chip" onclick="openProfileById('${currentUser.id}','${currentUser.username}')">
        <div class="av-xs">${pic}</div>
        <span>${currentUser.username}</span>
      </div>
      ${currentUser.isAdmin?'<button class="btn btn-admin" onclick="openAdmin()">👑 Admin</button>':''}
      <button class="btn btn-primary" onclick="openUpload()">⬆ Importer</button>
      <button class="btn btn-ghost" onclick="doLogout()">✕ Déconnexion</button>`;
  } else {
    el.innerHTML=`<button class="btn btn-primary" onclick="openAuth()">Connexion</button>`;
  }
}
