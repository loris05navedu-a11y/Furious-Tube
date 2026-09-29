/* Furious Maker — textes superposés */
/* ─── TEXT OVERLAYS ─── */
function addTov(def){
  if(!vid.src){fmToast('Importez d\'abord une vidéo !');return;}
  // Activer le mode "placement au clic"
  S.placingText=def;
  document.getElementById('vwrap').style.cursor='crosshair';
  fmToast('Cliquez sur la vidéo pour placer le texte');
  // Basculer vers l'onglet texte
  rTab(document.querySelectorAll('#fm-overlay .rtab')[1],'text');
  document.getElementById('tc-in').value=def;
}

// Placement au clic sur la vidéo
document.getElementById('vwrap').addEventListener('click',e=>{
  if(!S.placingText)return;
  // Ignorer les clics sur les overlays existants
  if(e.target.classList.contains('tov'))return;
  const r=document.getElementById('vwrap').getBoundingClientRect();
  const x=((e.clientX-r.left)/r.width*100);
  const y=((e.clientY-r.top)/r.height*100);
  pushHistory();
  const ov={id:++ovId,text:S.placingText,x,y,color:'#ffffff',size:28,st:S.ct,et:S.ct+3};
  S.ovs.push(ov);S.selTov=ov.id;
  S.placingText=null;
  document.getElementById('vwrap').style.cursor='default';
  document.getElementById('tc-in').value=ov.text;
  renderOvs();renderTL();
  fmToast('Texte placé — glissez-le pour le repositionner');
});

function renderOvs(){
  const c=document.getElementById('toverlays');c.innerHTML='';
  for(const ov of S.ovs){
    const el=document.createElement('div');
    el.className='tov'+(S.selTov===ov.id?' sel':'');
    el.textContent=ov.text;
    el.style.cssText=`left:${ov.x}%;top:${ov.y}%;color:${ov.color};font-size:${ov.size}px`;
    el.dataset.id=ov.id;
    el.addEventListener('mousedown',e=>{
      e.preventDefault();e.stopPropagation();
      S.selTov=ov.id;document.getElementById('tc-in').value=ov.text;
      renderOvs();
      const r=c.getBoundingClientRect();const sx=e.clientX,sy=e.clientY,ox=ov.x,oy=ov.y;
      let moved=false;
      const mm=e2=>{
        moved=true;
        ov.x=ox+(e2.clientX-sx)/r.width*100;
        ov.y=oy+(e2.clientY-sy)/r.height*100;
        el.style.left=ov.x+'%';el.style.top=ov.y+'%';
      };
      const mu=()=>{
        if(moved)pushHistory();
        window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);
      };
      window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu);
    });
    c.appendChild(el);
  }
}
function updOvVis(){
  const t=S.ct;
  document.querySelectorAll('#fm-overlay .tov').forEach(el=>{
    const id=parseInt(el.dataset.id);const ov=S.ovs.find(o=>o.id===id);
    if(ov)el.style.display=(t>=ov.st&&t<=ov.et)?'block':'none';
  });
}
function updSelTov(){
  const ov=S.ovs.find(o=>o.id===S.selTov);
  if(ov){ov.text=document.getElementById('tc-in').value;renderOvs();}
}
function updTovSize(v){
  document.getElementById('ts-val').textContent=v+'px';
  const ov=S.ovs.find(o=>o.id===S.selTov);if(ov){ov.size=+v;renderOvs();}
}
function swCol(el,c){
  document.querySelectorAll('.sw').forEach(e=>e.classList.remove('on'));el.classList.add('on');
  const ov=S.ovs.find(o=>o.id===S.selTov);if(ov){pushHistory();ov.color=c;renderOvs();}
}
function selTovClip(id){
  S.selTov=id;const ov=S.ovs.find(o=>o.id===id);
  if(ov){document.getElementById('tc-in').value=ov.text;rTab(document.querySelectorAll('#fm-overlay .rtab')[1],'text');}
  renderOvs();renderTL();
}
