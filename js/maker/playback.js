/* Furious Maker — lecture, volume & vitesse */
/* ─── PLAYBACK ────────── */
function togglePlay(){
  if(!vid.src)return;
  if(vid.paused){vid.play();S.playing=true;document.getElementById('playbtn').textContent='⏸';startLoop();}
  else{vid.pause();S.playing=false;document.getElementById('playbtn').textContent='▶';}
}
function startLoop(){
  cancelAnimationFrame(raf);
  (function loop(){if(!vid.paused){S.ct=vid.currentTime;updTime();updPH();updOvVis();raf=requestAnimationFrame(loop);}})();
}
vid.addEventListener('ended',()=>{S.playing=false;document.getElementById('playbtn').textContent='▶';});
vid.addEventListener('timeupdate',()=>{if(vid.paused){S.ct=vid.currentTime;updTime();updPH();updOvVis();}});
function sk(s){vid.currentTime=Math.max(0,Math.min(vid.duration||0,vid.currentTime+s));}
function setVol(v){vid.volume=v/100;document.getElementById('av-in').value=v;document.getElementById('av-val').textContent=v+'%';}
function setVolR(v){vid.volume=v/100;document.getElementById('volslider').value=v;document.getElementById('av-val').textContent=v+'%';}
function cycleSp(){S.si=(S.si+1)%S.speeds.length;const s=S.speeds[S.si];vid.playbackRate=s;document.getElementById('spdlbl').textContent=s+'×';}
function setSp(s,el){
  vid.playbackRate=s;
  document.getElementById('spdlbl').textContent=s.toFixed(2).replace('.00','')+'×';
  document.getElementById('spc-in').value=s;
  document.getElementById('spc-val').textContent=s.toFixed(2)+'×';
  document.querySelectorAll('#fm-overlay .spopt').forEach(e=>e.classList.remove('on'));
  if(el)el.classList.add('on');
}
