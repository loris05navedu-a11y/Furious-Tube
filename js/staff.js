/* FuriousTubes — rôles : admins (e-mails de config.js) et membres du staff (nommés par les admins) */
const STAFF_BAN_MS=2*3600e3;          // un membre du staff ne peut bannir que 2 h
const STAFF_NAME_COOLDOWN=4*3600e3;   // et ne peut changer de pseudo que toutes les 4 h
const USER_NAME_COOLDOWN=24*3600e3;

const BIB_SVG=(s=18)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="#22d3ee" stroke="#0891b2" stroke-width="1.2"/><circle cx="5.600" cy="7.600" r=".9" fill="#0e7490"/><circle cx="18.400" cy="7.600" r=".9" fill="#0e7490"/><circle cx="5.600" cy="16.400" r=".9" fill="#0e7490"/><circle cx="18.400" cy="16.400" r=".9" fill="#0e7490"/><text x="12" y="15" font-family="Sora,sans-serif" font-size="7.500" font-weight="800" text-anchor="middle" fill="#083344">07</text></svg>`.replace(/(\d)\.(\d)00/g,'$1.$2');

const isStaffRec=u=>!!(u&&u.staff&&(!u.staff.until||u.staff.until>Date.now()));
const isBanActive=u=>!!(u&&u.banned&&(!u.bannedUntil||u.bannedUntil>Date.now()));
function isStaff(){
  const s=currentUser&&currentUser.staff;
  return !!(s&&!currentUser.isAdmin&&(!s.until||s.until>Date.now()));
}
const canModerate=()=>!!(currentUser&&(currentUser.isAdmin||isStaff()));
const nameCooldown=()=>currentUser&&currentUser.isAdmin?0:isStaff()?STAFF_NAME_COOLDOWN:USER_NAME_COOLDOWN;

// Rôle réel, relu dans la base (un staff retiré ou expiré perd ses droits immédiatement)
async function actorRole(){
  if(!currentUser) return null;
  if(currentUser.isAdmin) return 'admin';
  let role=null;
  try{
    const rec=(await getBin(CONFIG.USERS_BIN_ID)).find(u=>u.id===currentUser.id);
    if(isStaffRec(rec)){
      role='staff';
      if(!currentUser.staff||currentUser.staff.until!==(rec.staff.until||0)){saveSession({...currentUser,staff:{until:rec.staff.until||0}});renderHeader();}
    }
  }catch(e){return isStaff()?'staff':null;}
  if(!role&&currentUser.staff){const u={...currentUser};delete u.staff;saveSession(u);renderHeader();}
  return role;
}

function banMessage(u){
  return u.bannedUntil
    ?`🚫 Compte banni temporairement (encore ${fmtWait(u.bannedUntil-Date.now())}).`
    :'🚫 Votre compte a été banni par un administrateur.';
}

// Bannit / débannit selon les droits : staff = 2 h max, ne touche ni aux admins ni aux autres staff
async function toggleBan(uid){
  const role=await actorRole();
  if(!role){toast('Action réservée à la modération','er');return null;}
  const users=await getBin(CONFIG.USERS_BIN_ID);
  const i=users.findIndex(u=>u.id===uid);
  if(i===-1||users[i].admin||uid===currentUser.id) return null;
  const t=users[i],unban=isBanActive(t);
  if(role==='staff'){
    if(isStaffRec(t)){toast('Seul un admin peut sanctionner un membre du staff','er');return null;}
    if(unban&&!t.bannedUntil){toast('Seul un admin peut lever ce bannissement','er');return null;}
  }
  const q=unban?'Débannir cet utilisateur ?':role==='staff'?'Bannir cet utilisateur pendant 2 h ?':'Bannir cet utilisateur ?';
  if(!confirm(q)) return null;
  if(unban){t.banned=false;delete t.bannedUntil;}
  else{t.banned=true;if(role==='staff')t.bannedUntil=Date.now()+STAFF_BAN_MS;else delete t.bannedUntil;}
  await setBin(CONFIG.USERS_BIN_ID,users);
  toast(unban?'Utilisateur débanni ✅':role==='staff'?'Utilisateur banni 2 h 🚫':'Utilisateur banni 🚫','ok');
  return {banned:!unban};
}

// ── Nomination du staff (admins uniquement) ──
let staffTarget=null;
function openStaffModal(uid,name,active){
  if(!currentUser?.isAdmin) return;
  staffTarget={uid,name};
  document.getElementById('staffWho').textContent=name;
  document.getElementById('staffRemove').style.display=active?'':'none';
  document.getElementById('staffSave').textContent=active?'Mettre à jour la durée':'Nommer membre du staff';
  document.getElementById('staffOv').classList.add('open');
}
function closeStaffModal(){document.getElementById('staffOv').classList.remove('open');staffTarget=null;}
async function applyStaff(on){
  if(!currentUser?.isAdmin||!staffTarget) return;
  try{
    const users=await getBin(CONFIG.USERS_BIN_ID);
    const i=users.findIndex(u=>u.id===staffTarget.uid);
    if(i===-1||users[i].admin||users[i].id===currentUser.id) return;
    if(on){
      const h=parseFloat(document.getElementById('staffDur').value);
      users[i].staff={since:Date.now(),until:h?Date.now()+h*3600e3:null,by:currentUser.id};
    }else delete users[i].staff;
    await setBin(CONFIG.USERS_BIN_ID,users);
    toast(on?'Membre du staff nommé 🦺':'Retiré du staff','ok');
    const {uid,name}=staffTarget;closeStaffModal();usersCache=null;
    if(document.getElementById('adminOv').classList.contains('open')) renderAdminList();
    if(viewingProfileId===uid) openProfileById(uid,name);
  }catch(e){toast('Erreur : '+e.message,'er');}
}
const saveStaff=()=>applyStaff(true), removeStaff=()=>applyStaff(false);
