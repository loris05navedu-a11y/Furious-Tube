/* Furious Maker — menu, thèmes & sauvegarde des projets */
/* ─── MENU & PROJETS ──────────────────────────────────── */
let currentTheme='dark';
let currentProjectId=null;

function genId(){return 'proj_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);}
const IDX_KEY='fm_projects_index';
function projKey(id){return 'fm_proj_'+id;}
function getIndex(){try{return JSON.parse(localStorage.getItem(IDX_KEY)||'[]');}catch(e){return[];}}
function setIndex(arr){try{localStorage.setItem(IDX_KEY,JSON.stringify(arr));}catch(e){}}

/* ── Bridge FuriousTubes ─────────────────────────────── */
function ftUser(){
  try{return(typeof currentUser!=='undefined'&&currentUser)?currentUser:null;}catch(e){return null;}
}
function hasFT(){
  try{return typeof CONFIG!=='undefined'&&typeof getBin==='function';}catch(e){return false;}
}

/* ── Sauvegarde ──────────────────────────────────────── */
async function saveCurrentProject(){
  const u=ftUser();
  const name=document.querySelector('#fm-overlay .proj-name')?.textContent?.trim()||'Sans titre';
  if(!currentProjectId) currentProjectId=genId();
  const proj={
    id:currentProjectId,name,
    date:new Date().toLocaleDateString('fr-FR'),ts:Date.now(),
    ovs:S.ovs,dur:S.dur,zoom:S.zoom,
    clips:S.clips.map(c=>({id:c.id,type:c.type,name:c.name,ts:c.ts,dur:c.dur})),
    filters:{
      br:document.getElementById('f-br').value,
      co:document.getElementById('f-co').value,
      sa:document.getElementById('f-sa').value,
      hu:document.getElementById('f-hu').value,
      bl:document.getElementById('f-bl').value
    }
  };
  if(u&&hasFT()){
    try{
      const users=await getBin(CONFIG.USERS_BIN_ID);
      const idx=users.findIndex(x=>x.id===u.id);
      if(idx>=0){
        if(!users[idx].fmProjects) users[idx].fmProjects=[];
        const pi=users[idx].fmProjects.findIndex(p=>p.id===currentProjectId);
        if(pi>=0) users[idx].fmProjects[pi]=proj;
        else users[idx].fmProjects.unshift(proj);
        await setBin(CONFIG.USERS_BIN_ID,users);
        currentUser=users[idx];
        localStorage.setItem('ft_user',JSON.stringify(currentUser));
        fmToast('Sauvegardé sur votre compte ☁');
        return;
      }
    }catch(e){fmToast('Erreur cloud, sauvegarde locale…');}
  }
  // Fallback localStorage
  try{
    localStorage.setItem(projKey(currentProjectId),JSON.stringify(proj));
    let idx=getIndex();
    idx=idx.filter(p=>p.id!==currentProjectId);
    idx.unshift({id:currentProjectId,name:proj.name,date:proj.date,ts:proj.ts});
    setIndex(idx);
    fmToast(u?'Connectez-vous pour sauvegarder sur votre compte':'Sauvegardé localement');
  }catch(e){}
}

/* ── Charger les projets ─────────────────────────────── */
async function loadFMProjects(){
  const u=ftUser();
  if(u&&u.fmProjects&&u.fmProjects.length>0)
    return u.fmProjects.slice().sort((a,b)=>b.ts-a.ts);
  // Fallback localStorage
  return getIndex().map(m=>{
    try{return JSON.parse(localStorage.getItem(projKey(m.id)));}
    catch(e){return m;}
  }).filter(Boolean);
}

/* ── Charger un projet ───────────────────────────────── */
function loadProjectById(id){
  const u=ftUser();
  let proj=null;
  if(u&&u.fmProjects) proj=u.fmProjects.find(p=>p.id===id);
  if(!proj){try{proj=JSON.parse(localStorage.getItem(projKey(id)));}catch(e){}}
  if(!proj){fmToast('Projet introuvable');return;}
  currentProjectId=id;
  S.ovs=proj.ovs||[];S.dur=proj.dur||0;S.zoom=proj.zoom||1;S.clips=[];
  document.querySelector('#fm-overlay .proj-name').textContent=proj.name||'Sans titre';
  if(proj.filters){
    document.getElementById('f-br').value=proj.filters.br;
    document.getElementById('f-co').value=proj.filters.co;
    document.getElementById('f-sa').value=proj.filters.sa;
    document.getElementById('f-hu').value=proj.filters.hu;
    document.getElementById('f-bl').value=proj.filters.bl;
    applyF();
  }
  document.getElementById('zlbl').textContent=(S.zoom||1).toFixed(2)+'×';
  HIST.length=0;HIST_IDX=-1;pushHistory();
  renderOvs();renderTL();
  fmToast('Projet "'+proj.name+'" chargé — réimportez vos vidéos si besoin');
}

/* ── Supprimer un projet ─────────────────────────────── */
async function deleteProject(id,e){
  e&&e.stopPropagation();
  const card=document.querySelector(`#fm-overlay .rproj[data-id="${id}"]`);
  if(!card)return;
  let conf=card.querySelector('.rproj-confirm');
  if(conf){conf.remove();return;}
  conf=document.createElement('div');
  conf.className='rproj-confirm';
  conf.innerHTML=`<p>Supprimer ce projet ?</p><div class="rproj-confirm-btns"><button class="rproj-yes" onclick="confirmDelete('${id}',event)">Oui</button><button class="rproj-no" onclick="cancelDelete('${id}',event)">Annuler</button></div>`;
  card.appendChild(conf);
}

async function confirmDelete(id,e){
  e&&e.stopPropagation();
  const u=ftUser();
  if(u&&hasFT()){
    try{
      const users=await getBin(CONFIG.USERS_BIN_ID);
      const idx=users.findIndex(x=>x.id===u.id);
      if(idx>=0){
        users[idx].fmProjects=(users[idx].fmProjects||[]).filter(p=>p.id!==id);
        await setBin(CONFIG.USERS_BIN_ID,users);
        currentUser=users[idx];
        localStorage.setItem('ft_user',JSON.stringify(currentUser));
      }
    }catch(err){}
  }
  try{localStorage.removeItem(projKey(id));}catch(ex){}
  let idx=getIndex();idx=idx.filter(p=>p.id!==id);setIndex(idx);
  if(currentProjectId===id) currentProjectId=null;
  renderRecent();
  fmToast('Projet supprimé');
}

function cancelDelete(id,e){
  e&&e.stopPropagation();
  const card=document.querySelector(`.rproj[data-id="${id}"]`);
  const conf=card&&card.querySelector('.rproj-confirm');
  if(conf)conf.remove();
}

function setTheme(t,el){
  currentTheme=t;
  document.querySelectorAll('#fm-overlay .thopt').forEach(e=>e.classList.remove('on'));
  el.classList.add('on');
  if(t==='light'){document.getElementById('fm-overlay').classList.add('fm-light');}
  else{document.getElementById('fm-overlay').classList.remove('fm-light');}
  document.getElementById('menu-screen').style.background=t==='light'?'#f0eeea':'#060607';
}

function resetProject(){
  cancelAnimationFrame(raf);
  if(!vid.paused){vid.pause();}
  vid.removeAttribute('src');vid.load();
  S.media=[];S.clips=[];S.ovs=[];
  S.ct=0;S.dur=0;S.playing=false;
  S.selClip=null;S.selTov=null;S.placingText=null;
  S.zoom=1;S.si=3;
  document.getElementById('novid').style.display='flex';
  document.getElementById('vwrap').style.display='none';
  document.getElementById('playbtn').textContent='▶';
  document.getElementById('ct').textContent='0:00.0';
  document.getElementById('tt').textContent='0:00.0';
  document.querySelector('#fm-overlay .proj-name').textContent='Sans titre';
  document.getElementById('mgrid').innerHTML='';
  document.getElementById('vwrap').style.cursor='default';
  document.getElementById('spdlbl').textContent='1×';
  document.getElementById('f-br').value=100;document.getElementById('f-co').value=100;
  document.getElementById('f-sa').value=100;document.getElementById('f-hu').value=0;document.getElementById('f-bl').value=0;
  vid.style.filter='';
  document.querySelectorAll('#fm-overlay .fpre').forEach(e=>e.classList.remove('on'));
  document.querySelector('#fm-overlay .fpre[data-p="none"]').classList.add('on');
  currentProjectId=genId(); // nouveau ID pour ce nouveau projet
  HIST.length=0;HIST_IDX=-1;pushHistory();
  renderOvs();renderTL();
}

function enterEditor(isNew,files){
  if(isNew) resetProject();
  const menu=document.getElementById('menu-screen');
  menu.classList.add('hide');
  const app=document.getElementById('fm-app');
  app.classList.add('visible');
  const fmbtn=document.getElementById('fm-back-btn');if(fmbtn)fmbtn.style.display='none';
  setTimeout(()=>menu.style.display='none',480);
  if(files) importFiles(files);
}
function enterEditorWithFiles(files){enterEditor(false,files);}

function goBack(){
  const menu=document.getElementById('menu-screen');
  const app=document.getElementById('fm-app');
  if(vid&&!vid.paused){vid.pause();S.playing=false;document.getElementById('playbtn').textContent='▶';}
  saveCurrentProject();
  menu.style.display='flex';menu.style.opacity='0';menu.style.transform='scale(.97)';
  requestAnimationFrame(()=>{
    menu.style.transition='opacity .4s, transform .4s';
    menu.style.opacity='1';menu.style.transform='scale(1)';
    menu.classList.remove('hide');
  });
  app.classList.remove('visible');
  // Réafficher le bouton ← FuriousTubes sur le menu
  const fmbtn=document.getElementById('fm-back-btn');
  if(fmbtn) fmbtn.style.display='flex';
  renderRecent();
}

async function renderRecent(){
  const g=document.getElementById('recent-grid');
  if(!g)return;
  const u=ftUser();

  // Afficher indicateur de compte
  const titleEl=document.querySelector('#fm-overlay .recent-title');
  if(titleEl){
    if(u) titleEl.setAttribute('data-user','☁ Projets de '+u.username);
    else titleEl.setAttribute('data-user','');
  }

  const projects=await loadFMProjects();
  if(projects.length===0){
    g.className='';
    g.innerHTML=`<div class="recent-empty">${u?'Aucun projet sur votre compte':'Aucun projet — connectez-vous pour synchroniser vos projets'}</div>`;
    return;
  }
  g.className='recent-grid';
  g.innerHTML='';
  projects.forEach(p=>{
    if(!p||!p.id)return;
    const d=document.createElement('div');
    d.className='rproj'+(p.id===currentProjectId?' rproj-active':'');
    d.dataset.id=p.id;
    d.innerHTML=`<div class="rproj-thumb">🎬</div><div class="rproj-info"><div class="rproj-name">${p.name||'Sans titre'}</div><div class="rproj-date">${p.date||''}</div></div><button class="rproj-del" onclick="deleteProject('${p.id}',event)" title="Supprimer">✕</button>`;
    d.onclick=()=>{loadProjectById(p.id);enterEditor(false);};
    g.appendChild(d);
  });
}
