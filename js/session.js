/* FuriousTubes — session & suivi du temps */
// ── Session ──
let currentUser = null;
function loadSession(){try{currentUser=JSON.parse(localStorage.getItem('ft_user'))||null;}catch{currentUser=null;}}
function saveSession(u){currentUser=u;localStorage.setItem('ft_user',JSON.stringify(u));}
function clearSession(){currentUser=null;localStorage.removeItem('ft_user');}

// ── Time tracking ──
function startTimeTracking(){
  if(!currentUser) return;
  setInterval(async()=>{
    try{
      const users=await getBin(CONFIG.USERS_BIN_ID);
      const idx=users.findIndex(u=>u.id===currentUser.id);
      if(idx===-1) return;
      users[idx].timeOnSite=(users[idx].timeOnSite||0)+1;
      await setBin(CONFIG.USERS_BIN_ID,users);
    }catch(e){}
  },60000);
}
