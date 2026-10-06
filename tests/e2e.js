const {chromium}=require('playwright');
const PROJ='demo-ft';
async function verify(email){
  const q=await (await fetch(`http://localhost:9099/emulator/v1/projects/${PROJ}/accounts`)).json().catch(()=>null);
  const list=await (await fetch(`http://localhost:9099/identitytoolkit.googleapis.com/v1/projects/${PROJ}/accounts:query`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({returnUserInfo:true})})).json();
  const u=(list.userInfo||[]).find(x=>x.email===email);
  await fetch(`http://localhost:9099/identitytoolkit.googleapis.com/v1/projects/${PROJ}/accounts:update`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({localId:u.localId,emailVerified:true})});
}
let fails=0;const check=(n,c)=>{console.log(c?'ok  ':'FAIL',n);if(!c)fails++;};
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
async function page(){
  const ctx=await b.newContext({viewport:{width:1200,height:800}});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.text().includes('Migration')||m.text().startsWith('SET'))console.log('PAGE',m.text().slice(0,400))});p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{window.__FT_EMULATORS__=true;});
  await p.route('**/*',r=>{const u=r.request().url();
    const m=u.match(/gstatic\.com\/firebasejs\/[^/]+\/(firebase-[a-z]+-compat\.js)/);
    if(m) return r.fulfill({path:require('path').join(__dirname,'node_modules/firebase/'+m[1]),contentType:'application/javascript'});
    u.startsWith('http://localhost')?r.continue():r.abort();});
  p.errs=errs;return p;
}
const reg=async(p,name,email)=>{
  await p.evaluate(async([n,e])=>{
    authBusy=true;
    const cred=await fbAuth.createUserWithEmailAndPassword(e,'secret12');await cred.user.updateProfile({displayName:n});
  },[name,email]);
};
// ── v1 : un admin, deux membres, une vidéo ──
const A=await page();await A.goto('http://localhost:8123/index.html');await A.waitForTimeout(1500);
check('start in v1',await A.evaluate(()=>DATA_V2===false));
await reg(A,'Boss','loris05.nav@gmail.com');await verify('loris05.nav@gmail.com');
await A.evaluate(async()=>{await fbAuth.currentUser.reload();await fbAuth.currentUser.getIdToken(true);const u=await ensureProfile(fbAuth.currentUser,'Boss');finishLogin(u,fbAuth.currentUser);});
await A.evaluate(async()=>{await fbAuth.currentUser.getIdTokenResult(true);});
check('admin recognized',await A.evaluate(()=>currentUser.isAdmin===true));
const B=await page();await B.goto('http://localhost:8123/index.html');await B.waitForTimeout(1200);
await reg(B,'Bobby','bob@example.com');
await B.evaluate(async()=>{const u=await ensureProfile(fbAuth.currentUser,'Bobby');finishLogin(u,fbAuth.currentUser);
  const vids=await getBin(CONFIG.VIDEOS_BIN_ID);vids.push({id:'vid1',title:'Hello',category:'🎮 Jeux',uploader:'Bobby',uploaderId:currentUser.id,url:'u',thumb:'t',date:Date.now(),likes:[],dislikes:[],comments:[{id:'c_100',author:'Bobby',authorId:currentUser.id,text:'old comment',date:100}],reports:[]});
  await setBin(CONFIG.VIDEOS_BIN_ID,vids);});
// ── migration par l'admin (règles v2 déjà actives dans l'émulateur) ──
await A.evaluate(()=>migrateToV2());await A.waitForTimeout(2500);console.log('toast:',await A.textContent('#tmsg'));
check('migrated flag',await A.evaluate(()=>DATA_V2===true));
// ── recharge : v2 ──
const C=await page();await C.goto('http://localhost:8123/index.html');await C.waitForTimeout(2000);
check('reload in v2',await C.evaluate(()=>DATA_V2===true));
await C.evaluate(async()=>{await fbAuth.signInWithEmailAndPassword('bob@example.com','secret12');});
await C.waitForTimeout(1200);
const vids=await C.evaluate(async()=>{const v=await getBin(CONFIG.VIDEOS_BIN_ID);return v.map(x=>({id:x.id,c:x.comments.map(y=>y.id)}));});
console.log('vids',JSON.stringify(vids));check('video migrated + comment id upgraded',vids.length===1&&/^c_.+_100$/.test(vids[0].c[0]));
// Bob : like, vue, commentaire, suppression de son commentaire, renommage
const r=await C.evaluate(async()=>{
  const out={};
  const run=async(n,f)=>{try{await f();out[n]=true;}catch(e){out[n]=false;}};
  await run('like',async()=>{const v=await getBin(CONFIG.VIDEOS_BIN_ID);v[0].likes.push(currentUser.id);await setBin(CONFIG.VIDEOS_BIN_ID,v);});
  await run('view',async()=>{const v=await getBin(CONFIG.VIDEOS_BIN_ID);v[0].views=(v[0].views||0)+1;await setBin(CONFIG.VIDEOS_BIN_ID,v);});
  await run('comment',async()=>{const v=await getBin(CONFIG.VIDEOS_BIN_ID);v[0].comments.push({id:'c_'+currentUser.id+'_'+Date.now(),author:currentUser.username,authorId:currentUser.id,text:'new',date:Date.now()});await setBin(CONFIG.VIDEOS_BIN_ID,v);});
  await run('delete-own-comment',async()=>{const v=await getBin(CONFIG.VIDEOS_BIN_ID);v[0].comments=v[0].comments.filter(c=>!c.text.startsWith('new'));await setBin(CONFIG.VIDEOS_BIN_ID,v);});
  await run('hack-title',async()=>{const v=await getBin(CONFIG.VIDEOS_BIN_ID);v[0].title='HACK';await setBin(CONFIG.VIDEOS_BIN_ID,v);});
  await run('self-admin',async()=>{const u=await getBin(CONFIG.USERS_BIN_ID);const me=u.find(x=>x.id===currentUser.id);me.admin=true;await setBin(CONFIG.USERS_BIN_ID,u);});
  await run('self-staff',async()=>{const u=await getBin(CONFIG.USERS_BIN_ID);const me=u.find(x=>x.id===currentUser.id);me.staff={until:null};await setBin(CONFIG.USERS_BIN_ID,u);});
  return out;
});
check('like allowed',r.like);check('view allowed',r.view);check('comment allowed',r.comment);check('delete own comment allowed',r['delete-own-comment']);
check('title hack denied',!r['hack-title']);check('self-admin denied',!r['self-admin']);check('self-staff denied',!r['self-staff']);
// renommage via l'UI
await C.evaluate(()=>openProfileById(currentUser.id,currentUser.username));await C.waitForTimeout(600);
await C.click('#nameEditBtn');await C.fill('#nameInput','Robert');await C.press('#nameInput','Enter');await C.waitForTimeout(1200);
check('rename ok',(await C.textContent('#profName')).trim()==='Robert');
await C.click('#nameEditBtn');await C.fill('#nameInput','Robert2');await C.press('#nameInput','Enter');await C.waitForTimeout(800);
check('rename cooldown',/Prochain changement/.test(await C.textContent('#tmsg')));
const vname=await C.evaluate(async()=>(await getBin(CONFIG.VIDEOS_BIN_ID))[0].uploader);
check('video uploader name synced',vname==='Robert');
// Admin nomme Bob staff, le staff bannit un membre
console.log('first',await A.evaluate(async()=>{try{const u=await getBin(CONFIG.USERS_BIN_ID);u.find(x=>x.username==='Robert').staff={since:Date.now(),until:null,by:currentUser.id};await setBin(CONFIG.USERS_BIN_ID,u);return 'ok'}catch(e){const t=await fbAuth.currentUser.getIdTokenResult();return 'ERR '+e.message.slice(0,60)+' claims '+JSON.stringify([t.claims.email,t.claims.email_verified,t.expirationTime])}}));
const D=await page();await D.goto('http://localhost:8123/index.html');await D.waitForTimeout(1500);
await reg(D,'Carl','carl@example.com');
console.log('carl',await D.evaluate(async()=>{try{const u=await ensureProfile(fbAuth.currentUser,'Carl');finishLogin(u,fbAuth.currentUser);authBusy=false;return 'ok '+JSON.stringify(u)}catch(e){return 'ERR '+e.message.slice(0,100)}}));
const carlId=await D.evaluate(()=>currentUser.id);
await C.evaluate(()=>{saveSession({...currentUser,staff:{until:0}});});
const ban=await C.evaluate(async(id)=>{window.confirm=()=>true;try{const r=await toggleBan(id);return r&&r.banned;}catch(e){return 'err '+e.message;}},carlId);
check('staff bans carl 2h',ban===true);
const until=await A.evaluate(async(id)=>{const u=await getBin(CONFIG.USERS_BIN_ID);return u.find(x=>x.id===id).bannedUntil-Date.now();},carlId);
check('ban ~2h',until>7000000&&until<=7200000);
console.log('errors',[A,B,C,D].map(p=>p.errs));
await b.close();process.exit(fails?1:0);
})();
