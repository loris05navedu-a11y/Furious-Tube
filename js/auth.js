/* FuriousTubes — connexion & inscription (Firebase Auth : e-mail / mot de passe ou Google) */

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
  if(currentUser) return openMyProfile();   // déjà connecté : le profil (avec la déconnexion) plutôt que la connexion
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
    'auth/operation-not-allowed':"Ce mode de connexion n'est pas activé dans la console Firebase (Authentication → Sign-in method)",
    'auth/popup-closed-by-user':'Connexion Google annulée',
    'auth/cancelled-popup-request':'Connexion Google annulée',
    'auth/account-exists-with-different-credential':'Cet e-mail est déjà utilisé avec un autre mode de connexion',
    'auth/unauthorized-domain':"Ce domaine n'est pas autorisé dans Firebase (Authentication → Paramètres → Domaines autorisés)",
    'auth/user-disabled':'🚫 Ce compte a été désactivé',
  };
  return m[e.code]||('Erreur : '+(e.message||e.code));
}

// Nom Google → pseudo valide (les pseudos sont affichés dans la page : seuls les caractères autorisés sont gardés)
function safePseudo(raw){
  let name=(raw||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_. -]/g,'').trim().slice(0,20);
  if(name.toLowerCase()===ADMIN_USERNAME.toLowerCase()) name='';
  if(name.length<3||checkUsername(name)) name='';
  return name;
}

// Retrouve (ou crée) la fiche du compte dans Firestore, identifiée par l'uid Firebase
async function ensureProfile(fbUser,pseudo){
  const users=await getBin(CONFIG.USERS_BIN_ID);
  let user=users.find(u=>u.id===fbUser.uid);
  if(!user){
    let name=pseudo||safePseudo(fbUser.displayName)||safePseudo((fbUser.email||'').split('@')[0])||'user_'+Math.random().toString(36).slice(2,8);
    if(users.some(u=>u.username?.toLowerCase()===name.toLowerCase())) name=name.slice(0,14)+'_'+Math.random().toString(36).slice(2,6);
    user={id:fbUser.uid,username:name,date:Date.now(),timeOnSite:0,banned:false};
    await setBin(CONFIG.USERS_BIN_ID,[...users.filter(u=>u.id),user]);
  }
  if(user.banned&&!isBanActive(user)){
    user.banned=false;delete user.bannedUntil;
    try{
      const all=await getBin(CONFIG.USERS_BIN_ID);
      const i=all.findIndex(u=>u.id===user.id);
      if(i>=0){all[i].banned=false;delete all[i].bannedUntil;await setBin(CONFIG.USERS_BIN_ID,all);}
    }catch(e){}
  }
  const admin=isAdminFbUser(fbUser);
  if(!!user.admin!==admin){
    user.admin=admin;
    try{
      const all=await getBin(CONFIG.USERS_BIN_ID);
      const i=all.findIndex(u=>u.id===user.id);
      if(i>=0){all[i].admin=admin;await setBin(CONFIG.USERS_BIN_ID,all);}
    }catch(e){}
  }
  return user;
}

// Compte admin dont l'e-mail n'est pas encore vérifié
function adminPending(){
  const u=fbAuth&&fbAuth.currentUser;
  return !!u&&isAdminEmail(u.email)&&!u.emailVerified;
}
// Relit l'état de vérification de l'e-mail et active le mode admin si c'est fait
async function refreshAdmin(silent){
  const u=fbAuth&&fbAuth.currentUser;
  if(!u||!isAdminEmail(u.email)) return false;
  try{await u.reload();await u.getIdToken(true);}catch(e){}
  const fresh=fbAuth.currentUser;
  if(!fresh.emailVerified){if(!silent)toast("E-mail pas encore vérifié : cliquez le lien reçu (pensez aux spams)",'er');return false;}
  if(currentUser&&currentUser.isAdmin) return true;
  const user=await ensureProfile(fresh);
  finishLogin(user,fresh);
  toast('👑 Mode admin activé !','ok');
  return true;
}
async function resendAdminVerification(){
  const u=fbAuth&&fbAuth.currentUser;if(!u) return;
  try{await u.sendEmailVerification();toast('📧 E-mail de vérification envoyé (pensez aux spams)','ok');}
  catch(e){toast(e.code==='auth/too-many-requests'?'Trop de demandes, réessayez dans quelques minutes':authErrorMsg(e),'er');}
}
// Retour sur l'onglet après avoir cliqué le lien de vérification
window.addEventListener('focus',()=>{if(adminPending()) refreshAdmin(true).then(ok=>{if(ok&&viewingProfileId)openProfileById(currentUser.id,currentUser.username);});});

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

  const usernameError=checkUsername(name,isAdminEmail(email));
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
    if(isBanActive(user)){await fbAuth.signOut();showAuthErr(banMessage(user));}
    else{finishLogin(user,cred.user);toast(`Bienvenue ${user.username} ! 🔥`,'ok');verifyAdminEmail(cred.user);}
  }catch(e){showAuthErr(authErrorMsg(e));}
  authBusy=false;
  setBtn('loginBtn',false,'Se connecter');
}

// Connexion Google (même compte que sur WhatQuiz). Fenêtre bloquée → redirection, reprise par watchAuth au retour.
async function doGoogleLogin(){
  if(!fbAuth) return showAuthErr('Firebase ne répond pas, rechargez la page');
  const provider=new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  const btn=document.getElementById('googleBtn');btn.disabled=true;
  try{
    authBusy=true;
    const cred=await fbAuth.signInWithPopup(provider);
    const user=await ensureProfile(cred.user);
    if(isBanActive(user)){await fbAuth.signOut();showAuthErr(banMessage(user));}
    else{finishLogin(user,cred.user);toast(`Bienvenue ${user.username} ! 🔥`,'ok');}
  }catch(e){
    if(e.code==='auth/popup-blocked'){authBusy=false;return fbAuth.signInWithRedirect(provider);}
    showAuthErr(authErrorMsg(e));
  }
  authBusy=false;
  btn.disabled=false;
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
  saveSession({id:user.id,username:user.username,avatar:user.avatar||null,isAdmin:isAdminFbUser(fbUser),staff:isStaffRec(user)?{until:user.staff.until||0}:null});
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
      if(isBanActive(user)){await fbAuth.signOut();clearSession();renderHeader();return;}
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
