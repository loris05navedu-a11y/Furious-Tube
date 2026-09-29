/* FuriousTubes — connexion & inscription (Firebase Auth email / mot de passe) */

function switchTab(tab){
  document.getElementById('fLogin').style.display=tab==='login'?'':'none';
  document.getElementById('fReg').style.display=tab==='register'?'':'none';
  document.getElementById('tabLogin').classList.toggle('active',tab==='login');
  document.getElementById('tabReg').classList.toggle('active',tab==='register');
  document.getElementById('authErr').style.display='none';
  document.getElementById('authSuc').style.display='none';
}

// ── Accès réservé aux comptes connectés ──
function openAuth(tab){
  document.getElementById('authOv').classList.add('open');
  switchTab(tab||'login');
}
function requireLogin(msg){
  if(currentUser) return true;
  toast(msg||'Connectez-vous pour continuer','er');
  openAuth('login');
  return false;
}

// ── Admin : e-mail dans la liste ET e-mail vérifié (sinon n'importe qui pourrait s'inscrire avec cette adresse) ──
function isAdminEmail(email){return !!email&&ADMIN_EMAILS.includes(email.toLowerCase());}
function isAdminFbUser(fbUser){return !!fbUser&&fbUser.emailVerified&&isAdminEmail(fbUser.email);}

// Messages d'erreur Firebase en français
function authErrorMsg(e){
  const m={
    'auth/invalid-email':'Adresse e-mail invalide',
    'auth/email-already-in-use':'Cet e-mail a déjà un compte ❌',
    'auth/weak-password':'Mot de passe trop faible (min. 6 caractères)',
    'auth/user-not-found':'Aucun compte avec cet e-mail',
    'auth/wrong-password':'Mot de passe incorrect',
    'auth/invalid-credential':'E-mail ou mot de passe incorrect',
    'auth/invalid-login-credentials':'E-mail ou mot de passe incorrect',
    'auth/too-many-requests':'Trop de tentatives, réessayez dans quelques minutes',
    'auth/network-request-failed':'Problème de connexion internet',
    'auth/operation-not-allowed':"La connexion e-mail/mot de passe n'est pas activée dans la console Firebase",
    'auth/unauthorized-domain':"Ce domaine n'est pas autorisé dans Firebase (Authentication → Paramètres → Domaines autorisés)",
    'auth/user-disabled':'🚫 Ce compte a été désactivé',
  };
  return m[e.code]||('Erreur : '+(e.message||e.code));
}

// Retrouve (ou crée) la fiche du compte dans Firestore, identifiée par l'uid Firebase
async function ensureProfile(fbUser,pseudo){
  const users=await getBin(CONFIG.USERS_BIN_ID);
  let user=users.find(u=>u.id===fbUser.uid);
  if(!user){
    let name=pseudo||fbUser.displayName||(fbUser.email||'user').split('@')[0].slice(0,20);
    if(users.some(u=>u.username?.toLowerCase()===name.toLowerCase())) name=name.slice(0,14)+'_'+Math.random().toString(36).slice(2,6);
    user={id:fbUser.uid,username:name,date:Date.now(),timeOnSite:0,banned:false};
    await setBin(CONFIG.USERS_BIN_ID,[...users.filter(u=>u.id),user]);
  }
  if(isAdminFbUser(fbUser)&&!user.admin){
    user.admin=true;
    try{
      const all=await getBin(CONFIG.USERS_BIN_ID);
      const i=all.findIndex(u=>u.id===user.id);
      if(i>=0){all[i].admin=true;await setBin(CONFIG.USERS_BIN_ID,all);}
    }catch(e){}
  }
  return user;
}

// E-mail de vérification (obligatoire pour être reconnu admin)
async function verifyAdminEmail(fbUser){
  if(!isAdminEmail(fbUser.email)||fbUser.emailVerified) return;
  try{
    await fbUser.sendEmailVerification();
    toast('📧 Vérifiez votre e-mail (lien envoyé) pour activer le mode admin','ok');
  }catch(e){}
}

async function doRegister(){
  const name=document.getElementById('rName').value.trim();
  const email=document.getElementById('rEmail').value.trim();
  const pass=document.getElementById('rPass').value;

  const usernameError=checkUsername(name);
  if(usernameError) return showAuthErr(usernameError);
  if(!email) return showAuthErr('Entrez votre adresse e-mail');
  if(pass.length<6) return showAuthErr('Mot de passe trop court (min. 6 caractères)');
  if(name.toLowerCase()===ADMIN_USERNAME.toLowerCase()&&!isAdminEmail(email)) return showAuthErr('Ce pseudo est réservé ❌');
  if(!fbAuth) return showAuthErr('Firebase ne répond pas, rechargez la page');

  setBtn('regBtn',true,'Création...');
  try{
    const users=await getBin(CONFIG.USERS_BIN_ID);
    if(users.find(u=>u.username?.toLowerCase()===name.toLowerCase())){showAuthErr('Ce pseudo est déjà pris ❌');return;}
    authBusy=true;
    const cred=await fbAuth.createUserWithEmailAndPassword(email,pass);
    await cred.user.updateProfile({displayName:name});
    cred.user.sendEmailVerification().catch(()=>{});
    const user=await ensureProfile(cred.user,name);
    finishLogin(user,cred.user);
    toast(`Compte créé, bienvenue ${user.username} ! 🎉`,'ok');
  }catch(e){showAuthErr(authErrorMsg(e));}
  authBusy=false;
  setBtn('regBtn',false,'Créer mon compte');
}

async function doLogin(){
  const email=document.getElementById('lEmail').value.trim();
  const pass=document.getElementById('lPass').value;
  if(!email||!pass) return showAuthErr('Remplissez tous les champs');
  if(!fbAuth) return showAuthErr('Firebase ne répond pas, rechargez la page');
  setBtn('loginBtn',true,'Connexion...');
  try{
    authBusy=true;
    const cred=await fbAuth.signInWithEmailAndPassword(email,pass);
    const user=await ensureProfile(cred.user);
    if(user.banned){await fbAuth.signOut();showAuthErr('🚫 Votre compte a été banni par un administrateur.');}
    else{finishLogin(user,cred.user);toast(`Bienvenue ${user.username} ! 🔥`,'ok');verifyAdminEmail(cred.user);}
  }catch(e){showAuthErr(authErrorMsg(e));}
  authBusy=false;
  setBtn('loginBtn',false,'Se connecter');
}

async function doResetPassword(){
  const email=document.getElementById('lEmail').value.trim();
  if(!email) return showAuthErr("Entrez d'abord votre e-mail ci-dessus");
  try{
    await fbAuth.sendPasswordResetEmail(email);
    showAuthSuc('E-mail de réinitialisation envoyé 📧 (pensez aux spams)');
  }catch(e){showAuthErr(authErrorMsg(e));}
}

function finishLogin(user,fbUser){
  const wasLogged=!!currentUser;
  saveSession({id:user.id,username:user.username,avatar:user.avatar||null,isAdmin:isAdminFbUser(fbUser)});
  document.getElementById('authOv').classList.remove('open');
  renderHeader();
  if(!wasLogged) startTimeTracking();
}

async function doLogout(){
  try{if(fbAuth) await fbAuth.signOut();}catch(e){}
  clearSession();renderHeader();toast('À bientôt !','ok');
}

// Restaure la session Firebase au chargement / la nettoie si elle n'existe plus
let authBusy=false;
function watchAuth(){
  if(!fbAuth) return;
  fbAuth.onAuthStateChanged(async fbUser=>{
    if(authBusy) return;               // doLogin / doRegister gèrent eux-mêmes la suite
    if(!fbUser){if(currentUser){clearSession();renderHeader();}return;}
    try{
      if(isAdminEmail(fbUser.email)&&!fbUser.emailVerified){try{await fbUser.reload();}catch(e){}}
      const user=await ensureProfile(fbUser);
      if(user.banned){await fbAuth.signOut();clearSession();renderHeader();return;}
      finishLogin(user,fbUser);
      renderHeader();
    }catch(e){/* Firestore indisponible : on garde la session locale */}
  });
}

function showAuthErr(msg){
  const e=document.getElementById('authErr');e.textContent=msg;e.style.display='block';
  document.getElementById('authSuc').style.display='none';
  setBtn('loginBtn',false,'Se connecter');setBtn('regBtn',false,'Créer mon compte');
}
function showAuthSuc(msg){
  const e=document.getElementById('authSuc');e.textContent=msg;e.style.display='block';
  document.getElementById('authErr').style.display='none';
}
