/* Furious Maker — onglets, zoom & raccourcis clavier */
/* ─── MISC ───────────── */
function zoom(d){S.zoom=Math.max(.25,Math.min(4,S.zoom+d*.25));document.getElementById('zlbl').textContent=S.zoom.toFixed(2)+'×';renderTL();}
function lTab(el,n){document.querySelectorAll('#fm-overlay .ptab').forEach(t=>t.classList.remove('on'));el.classList.add('on');document.querySelectorAll('#fm-overlay .psec').forEach(p=>p.classList.remove('on'));document.getElementById('ps-'+n).classList.add('on');}
function rTab(el,n){document.querySelectorAll('#fm-overlay .rtab').forEach(t=>t.classList.remove('on'));el.classList.add('on');document.querySelectorAll('#fm-overlay .rsec').forEach(p=>p.classList.remove('on'));document.getElementById('rs-'+n).classList.add('on');}
function setTool(el,t){document.querySelectorAll('#fm-overlay .titem').forEach(e=>e.classList.remove('on'));el.classList.add('on');S.tool=t;fmToast('Outil : '+t);}
function updTime(){document.getElementById('ct').textContent=fmFmt(S.ct);}
function fmFmt(s){if(isNaN(s))return'0:00.0';const m=Math.floor(s/60);return`${m}:${((s%60).toFixed(1)).padStart(4,'0')}`;}
function fmToast(msg){const t=document.getElementById('fm-toast');t.textContent=msg;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),2400);}

// Keyboard shortcuts
document.addEventListener('keydown',e=>{
  if(!document.getElementById('fm-overlay').classList.contains('open'))return;
  if(['INPUT','TEXTAREA'].includes(e.target.tagName)||e.target.contentEditable==='true')return;
  if(e.code==='Space'){e.preventDefault();togglePlay();}
  else if((e.key==='z'||e.key==='Z')&&(e.ctrlKey||e.metaKey)){e.preventDefault();undoLast();}
  else if(e.code==='Escape'){S.placingText=null;document.getElementById('vwrap').style.cursor='default';fmToast('Placement annulé');}
  else if(e.code==='ArrowLeft')sk(e.shiftKey?-1:-1/30);
  else if(e.code==='ArrowRight')sk(e.shiftKey?1:1/30);
  else if((e.key==='Delete'||e.key==='Backspace')&&S.selClip){
    pushHistory();
    S.clips=S.clips.filter(c=>c.id!==S.selClip);S.selClip=null;renderTL();fmToast('Clip supprimé');
  }
});

// Init
vid.volume=.8;
renderTL();
