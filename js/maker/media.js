/* Furious Maker — import des médias & ajout de clips */
/* ─── IMPORT ─────────── */
function importFiles(files){
  for(const f of files){
    const url=URL.createObjectURL(f);
    const it={id:Date.now()+Math.random(),name:f.name,src:url,type:f.type.split('/')[0]};
    S.media.push(it);
    renderMedia();
    if(it.type==='video'&&S.clips.filter(c=>c.type==='video').length===0)addClip(it);
  }
}

function renderMedia(){
  const g=document.getElementById('mgrid');g.innerHTML='';
  for(const it of S.media){
    const d=document.createElement('div');d.className='mitem';d.title=it.name+' — double-clic pour ajouter';
    if(it.type==='video'){
      const v=document.createElement('video');v.src=it.src;v.muted=true;d.appendChild(v);
      v.addEventListener('loadedmetadata',()=>{
        const b=document.createElement('div');b.className='mbadge';b.textContent=fmFmt(v.duration);d.appendChild(b);
      });
    }else if(it.type==='image'){const i=document.createElement('img');i.src=it.src;d.appendChild(i);}
    else d.textContent='🎵';
    d.ondblclick=()=>addClip(it);
    g.appendChild(d);
  }
}

function addClip(it){
  // Calculer la position de départ = fin du dernier clip sur cette piste
  const sameTrack = S.clips.filter(c=>c.type===it.type);
  const startAt = sameTrack.reduce((m,c)=>Math.max(m, c.ts+c.dur), 0);

  // Charger la vidéo dans le player si c'est la première
  if(it.type==='video'&&!vid.src){
    vid.src=it.src;vid.load();
    vid.addEventListener('loadedmetadata',()=>{
      S.dur=vid.duration;
      document.getElementById('tt').textContent=fmFmt(S.dur);
      document.getElementById('novid').style.display='none';
      document.getElementById('vwrap').style.display='block';
      vid.currentTime=0.01; // force affichage de la première frame
      renderTL();
    },{once:true});
  }

  const cl={id:Date.now(),type:it.type,name:it.name,src:it.src,ts:startAt,dur:0,item:it};
  if(it.type==='video'){
    const tmp=document.createElement('video');tmp.src=it.src;
    tmp.addEventListener('loadedmetadata',()=>{
      cl.dur=tmp.duration;
      S.dur=Math.max(S.dur, cl.ts+cl.dur);
      S.clips.push(cl);
      renderTL();
    },{once:true});
  }else{
    cl.dur=5;
    S.dur=Math.max(S.dur, cl.ts+cl.dur);
    S.clips.push(cl);
    renderTL();
  }
  fmToast(it.name+' ajouté');
  pushHistory();
}
