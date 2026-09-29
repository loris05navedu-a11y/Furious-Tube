/* Furious Maker — timeline, déplacement & rognage */
/* ─── TIMELINE ────────── */
const PPS=90;
function t2x(t){return t*PPS*S.zoom;}
function x2t(x){return x/(PPS*S.zoom);}

function renderTL(){
  // Ruler
  const cnv=document.getElementById('tl-ruler');
  const rw=cnv.parentElement.clientWidth||600;
  cnv.width=rw;cnv.height=20;
  const c=cnv.getContext('2d');c.clearRect(0,0,rw,20);
  const dur=Math.max(S.dur,30);
  const step=S.zoom>=2?1:S.zoom>=.5?5:10;
  for(let t=0;t<=dur;t+=step){
    const x=t2x(t)+65;if(x>rw)break;
    c.strokeStyle='#333640';c.lineWidth=1;c.beginPath();c.moveTo(x,14);c.lineTo(x,20);c.stroke();
    if(t%(step*2)===0){c.fillStyle='#4e5668';c.font='9px Space Mono,monospace';c.textAlign='center';c.fillText(fmFmt(t),x,10);}
  }
  // Tracks
  const tv=document.getElementById('tr-vid'),ta=document.getElementById('tr-aud'),tt2=document.getElementById('tr-txt');
  const W=Math.max(t2x(S.dur+10),700)+'px';
  [tv,ta,tt2].forEach(t=>{t.style.width=W;});
  [...tv.children].forEach(c=>{if(c.id!=='ph')c.remove();});
  [...ta.children].forEach(c=>c.remove());
  [...tt2.children].forEach(c=>c.remove());

  for(const cl of S.clips){
    const track=cl.type==='video'?tv:ta;
    const el=document.createElement('div');
    el.className='tclip '+(cl.type==='video'?'vc':cl.type==='audio'?'ac':'vc')+(S.selClip===cl.id?' on':'');
    el.style.left=t2x(cl.ts)+'px';
    el.style.width=Math.max(t2x(cl.dur),24)+'px';
    el.textContent=cl.name.replace(/\.[^.]+$/,'');
    el.dataset.id=cl.id;
    el.onclick=()=>{S.selClip=cl.id;renderTL();};
    el.oncontextmenu=e=>{e.preventDefault();showCtx(e,cl.id);};
    const lh=document.createElement('div');lh.className='chandle l';
    const rh=document.createElement('div');rh.className='chandle r';
    el.appendChild(lh);el.appendChild(rh);
    makeDrag(el,cl);makeTrim(lh,cl,'l');makeTrim(rh,cl,'r');
    track.appendChild(el);
  }
  for(const ov of S.ovs){
    const el=document.createElement('div');
    el.className='tclip tc'+(S.selTov===ov.id?' on':'');
    el.style.left=t2x(ov.st)+'px';
    el.style.width=Math.max(t2x(ov.et-ov.st),24)+'px';
    el.textContent=ov.text;el.dataset.ov=ov.id;
    el.onclick=()=>selTovClip(ov.id);
    tt2.appendChild(el);
  }
  updPH();
}

function updPH(){
  const ph=document.getElementById('ph');
  if(ph)ph.style.left=t2x(S.ct)+'px';
}

function makeDrag(el,cl){
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('chandle'))return;
    if(S.tool==='cut'){splitAt(cl);return;}
    e.preventDefault();
    const sx=e.clientX,st=cl.ts;
    const mm=e2=>{cl.ts=Math.max(0,st+x2t(e2.clientX-sx));renderTL();};
    const mu=()=>{pushHistory();window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);};
    window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu);
  });
}
function makeTrim(h,cl,side){
  h.addEventListener('mousedown',e=>{
    e.preventDefault();e.stopPropagation();
    const sx=e.clientX,sd=cl.dur,st=cl.ts;
    const mm=e2=>{
      const dx=x2t(e2.clientX-sx);
      if(side==='r')cl.dur=Math.max(.3,sd+dx);
      else{const nd=sd-dx;if(nd>.3&&st+dx>=0){cl.ts=st+dx;cl.dur=nd;}}
      S.dur=Math.max(...S.clips.map(c=>c.ts+c.dur),1);
      renderTL();
    };
    const mu2=()=>{pushHistory();window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu2);};
    window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu2);
  });
}

// Click track area to seek
document.querySelectorAll('#fm-overlay .trarea').forEach(a=>{
  a.addEventListener('click',e=>{
    if(!e.target.classList.contains('trarea')&&e.target.id!=='ph')return;
    const r=a.getBoundingClientRect();
    const t=x2t(e.clientX-r.left);
    vid.currentTime=Math.max(0,Math.min(vid.duration||0,t));
  });
});
