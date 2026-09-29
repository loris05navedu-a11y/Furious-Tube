/* FuriousTubes — connexion & inscription */
// ── Auth ──
function switchTab(tab){
  document.getElementById('fLogin').style.display=tab==='login'?'':'none';
  document.getElementById('fReg').style.display=tab==='register'?'':'none';
  document.getElementById('tabLogin').classList.toggle('active',tab==='login');
  document.getElementById('tabReg').classList.toggle('active',tab==='register');
  document.getElementById('authErr').style.display='none';
  document.getElementById('authSuc').style.display='none';
}

async function doRegister(){
  const name=document.getElementById('rName').value.trim();
  const pass=document.getElementById('rPass').value;
  
  // Validate username
  const usernameError = checkUsername(name);
  if(usernameError) return showAuthErr(usernameError);
  if(pass.length<6) return showAuthErr('Mot de passe trop court (min. 6 caractères)');
  if(name.toLowerCase()===ADMIN_USERNAME.toLowerCase()) return showAuthErr('Ce pseudo est réservé ❌');

  setBtn('regBtn',true,'Création...');
  try{
    const users=await getBin(CONFIG.USERS_BIN_ID);
    if(users.find(u=>u.username?.toLowerCase()===name.toLowerCase())) return showAuthErr('Ce pseudo est déjà pris ❌');
    const hash=await hashPwd(pass);
    const clean=users.filter(u=>u.id);
    clean.push({id:'u_'+Date.now(),username:name,hash,date:Date.now(),timeOnSite:0,banned:false});
    await setBin(CONFIG.USERS_BIN_ID,clean);
    showAuthSuc('Compte créé ! Connectez-vous 🎉');
    switchTab('login');
    document.getElementById('lName').value=name;
  }catch(e){showAuthErr('Erreur : '+e.message);}
  setBtn('regBtn',false,'Créer mon compte');
}

async function doLogin(){
  const name=document.getElementById('lName').value.trim();
  const pass=document.getElementById('lPass').value;
  if(!name||!pass) return showAuthErr('Remplissez tous les champs');
  setBtn('loginBtn',true,'Connexion...');
  try{
    const users=await getBin(CONFIG.USERS_BIN_ID);
    const user=users.find(u=>u.username?.toLowerCase()===name.toLowerCase());
    if(!user) return showAuthErr('Pseudo introuvable');
    if(user.banned) return showAuthErr('🚫 Votre compte a été banni par un administrateur.');
    const hash=await hashPwd(pass);
    if(hash!==user.hash) return showAuthErr('Mot de passe incorrect');
    saveSession({id:user.id,username:user.username,avatar:user.avatar||null});
    document.getElementById('authOv').classList.remove('open');
    renderHeader();
    toast(`Bienvenue ${user.username} ! 🔥`,'ok');
    startTimeTracking();
  }catch(e){showAuthErr('Erreur : '+e.message);}
  setBtn('loginBtn',false,'Se connecter');
}

function doLogout(){clearSession();renderHeader();toast('À bientôt !','ok');}

function showAuthErr(msg){
  const e=document.getElementById('authErr');e.textContent=msg;e.style.display='block';
  document.getElementById('authSuc').style.display='none';
  setBtn('loginBtn',false,'Se connecter');setBtn('regBtn',false,'Créer mon compte');
}
function showAuthSuc(msg){
  const e=document.getElementById('authSuc');e.textContent=msg;e.style.display='block';
  document.getElementById('authErr').style.display='none';
}
