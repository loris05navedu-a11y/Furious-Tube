/* FuriousTubes — lecteur vidéo personnalisé, adapté au format de la vidéo */
const FTPlayer=(()=>{
  const SPEEDS=[0.5,0.75,1,1.25,1.5,2];
  const ICON={
    play:'<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>',
    replay:'<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6.5 12 11V8a6 6 0 1 1-6 6H4a8 8 0 1 0 8-9z" fill="currentColor"/></svg>',
    vol:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    low:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mute:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    pip:'<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 12h7v5h-7z" fill="currentColor"/></svg>',
    fs:'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fsx:'<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  let stage,vp,video,ui={},ratio=16/9,hideT=null,clickT=null,dragging=false,ready=false;

  const fmt=t=>{
    if(!isFinite(t)||t<0)t=0;
    const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);
    return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0');
  };
  const store={
    get(k){try{return localStorage.getItem(k)}catch(e){return null}},
    set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  };
  const fsElement=()=>document.fullscreenElement||document.webkitFullscreenElement||null;

  function build(){
    vp.insertAdjacentHTML('beforeend',`
      <div class="vp-spin"></div>
      <button class="vp-big" type="button" aria-label="Lecture">${ICON.play}</button>
      <div class="vp-fx vp-fx-l">⏪ 10 s</div><div class="vp-fx vp-fx-r">10 s ⏩</div>
      <div class="vp-err">⚠ Impossible de lire cette vidéo</div>
      <div class="vp-ctrl">
        <div class="vp-bar" role="slider" aria-label="Progression" tabindex="0">
          <div class="vp-track"><div class="vp-buf"></div><div class="vp-fill"></div></div>
          <div class="vp-thumb"></div><div class="vp-tip">0:00</div>
        </div>
        <div class="vp-row">
          <button class="vp-btn vp-pp" type="button" aria-label="Lecture / pause">${ICON.play}</button>
          <div class="vp-volwrap">
            <button class="vp-btn vp-mute" type="button" aria-label="Muet">${ICON.vol}</button>
            <input class="vp-vol" type="range" min="0" max="1" step="0.02" value="1" aria-label="Volume">
          </div>
          <div class="vp-time"><span class="vp-cur">0:00</span> / <span class="vp-dur">0:00</span></div>
          <div class="vp-sp"></div>
          <div class="vp-speedwrap">
            <button class="vp-btn vp-speed" type="button" aria-label="Vitesse">1×</button>
            <div class="vp-menu">${SPEEDS.map(s=>`<button type="button" data-s="${s}">${s}×</button>`).join('')}</div>
          </div>
          <button class="vp-btn vp-pip" type="button" aria-label="Image dans l'image">${ICON.pip}</button>
          <button class="vp-btn vp-fs" type="button" aria-label="Plein écran">${ICON.fs}</button>
        </div>
      </div>`);
    const q=s=>vp.querySelector(s);
    ui={big:q('.vp-big'),pp:q('.vp-pp'),mute:q('.vp-mute'),vol:q('.vp-vol'),cur:q('.vp-cur'),dur:q('.vp-dur'),
      bar:q('.vp-bar'),buf:q('.vp-buf'),fill:q('.vp-fill'),thumb:q('.vp-thumb'),tip:q('.vp-tip'),
      speed:q('.vp-speed'),menu:q('.vp-menu'),pip:q('.vp-pip'),fs:q('.vp-fs'),
      fxl:q('.vp-fx-l'),fxr:q('.vp-fx-r'),ctrl:q('.vp-ctrl')};
  }

  // ── Taille : s'adapte au format (paysage, carré, portrait) ──
  function fit(){
    if(!vp||fsElement()===vp)return;
    const W=stage.clientWidth;if(!W)return;
    const phone=window.innerWidth<=640;
    const H=Math.max(200,Math.min(window.innerHeight*(phone?0.6:0.74),phone?9999:window.innerHeight-170,880));
    const w=Math.min(W,H*ratio);
    vp.style.width=Math.round(w)+'px';
    vp.style.height=Math.round(w/ratio)+'px';
  }
  function setRatio(w,h){
    ratio=(w&&h)?w/h:16/9;
    vp.classList.remove('vp-portrait','vp-square','vp-wide');
    vp.classList.add(ratio<0.9?'vp-portrait':ratio<1.15?'vp-square':'vp-wide');
    fit();
  }

  // ── Actions ──
  function toggle(){video.paused||video.ended?play():video.pause();}
  function play(){
    if(video.ended)video.currentTime=0;
    const p=video.play();if(p&&p.catch)p.catch(()=>{});
  }
  function seekBy(d){
    if(!isFinite(video.duration))return;
    video.currentTime=Math.min(video.duration,Math.max(0,video.currentTime+d));
    showControls();
  }
  function flashFx(el){el.classList.remove('on');void el.offsetWidth;el.classList.add('on');}
  function setVolume(v){
    video.volume=Math.min(1,Math.max(0,v));
    video.muted=video.volume===0;
  }
  function toggleFs(){
    if(fsElement()){
      (document.exitFullscreen||document.webkitExitFullscreen).call(document);
      return;
    }
    const req=vp.requestFullscreen||vp.webkitRequestFullscreen;
    if(req){
      Promise.resolve(req.call(vp)).then(()=>{
        if(ratio>1&&screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});
      }).catch(()=>{});
    }else if(video.webkitEnterFullscreen){
      video.webkitEnterFullscreen();
    }
  }
  function togglePip(){
    if(document.pictureInPictureElement)document.exitPictureInPicture().catch(()=>{});
    else if(video.requestPictureInPicture)video.requestPictureInPicture().catch(()=>{});
  }
  function setSpeed(s){
    video.playbackRate=s;
    ui.speed.textContent=s+'×';
    ui.menu.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.s===s));
    ui.menu.classList.remove('open');
  }

  // ── Affichage ──
  function showControls(){
    vp.classList.add('active');
    clearTimeout(hideT);
    if(!video.paused&&!dragging)hideT=setTimeout(()=>{
      if(!ui.menu.classList.contains('open'))vp.classList.remove('active');
    },2600);
  }
  function updateProgress(){
    const d=video.duration,t=video.currentTime;
    const p=isFinite(d)&&d>0?t/d*100:0;
    if(!dragging){
      ui.fill.style.width=p+'%';ui.thumb.style.left=p+'%';
      ui.cur.textContent=fmt(t);
    }
    ui.bar.setAttribute('aria-valuenow',Math.round(p));
  }
  function updateBuffer(){
    const d=video.duration;if(!isFinite(d)||!d)return;
    let end=0;
    for(let i=0;i<video.buffered.length;i++){
      if(video.buffered.start(i)<=video.currentTime+0.5)end=Math.max(end,video.buffered.end(i));
    }
    ui.buf.style.width=(end/d*100)+'%';
  }
  function updateVolumeUI(){
    const v=video.muted?0:video.volume;
    ui.vol.value=v;
    ui.vol.style.setProperty('--v',(v*100)+'%');
    ui.mute.innerHTML=v===0?ICON.mute:v<0.5?ICON.low:ICON.vol;
  }
  function updatePlayState(){
    const playing=!video.paused&&!video.ended;
    vp.classList.toggle('playing',playing);
    vp.classList.toggle('ended',video.ended);
    const ic=video.ended?ICON.replay:playing?ICON.pause:ICON.play;
    ui.pp.innerHTML=ic;
    ui.big.innerHTML=video.ended?ICON.replay:ICON.play;
    showControls();
  }

  // ── Barre de progression (souris + tactile) ──
  function posFromEvent(e){
    const r=ui.bar.getBoundingClientRect();
    return Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));
  }
  function previewAt(f){
    const t=f*(video.duration||0);
    ui.fill.style.width=(f*100)+'%';ui.thumb.style.left=(f*100)+'%';
    ui.tip.style.left=(f*100)+'%';ui.tip.textContent=fmt(t);
    return t;
  }

  function bind(){
    ['play','pause','ended'].forEach(ev=>video.addEventListener(ev,updatePlayState));
    video.addEventListener('timeupdate',updateProgress);
    video.addEventListener('progress',updateBuffer);
    video.addEventListener('loadedmetadata',()=>{
      setRatio(video.videoWidth,video.videoHeight);
      ui.dur.textContent=fmt(video.duration);
      vp.classList.remove('error');
    });
    video.addEventListener('durationchange',()=>{ui.dur.textContent=fmt(video.duration);});
    video.addEventListener('loadstart',()=>vp.classList.add('loading'));
    video.addEventListener('waiting',()=>vp.classList.add('loading'));
    ['canplay','playing','loadeddata'].forEach(ev=>video.addEventListener(ev,()=>vp.classList.remove('loading')));
    video.addEventListener('error',()=>{if(video.getAttribute('src')){vp.classList.remove('loading');vp.classList.add('error');}});
    video.addEventListener('volumechange',()=>{
      updateVolumeUI();
      store.set('ft_vol',video.volume);store.set('ft_muted',video.muted?'1':'0');
    });
    video.addEventListener('ratechange',()=>{});

    // clic simple = lecture/pause, double-clic = ±10 s sur les côtés, plein écran au centre
    video.addEventListener('click',()=>{
      showControls();
      clearTimeout(clickT);
      clickT=setTimeout(toggle,230);
    });
    video.addEventListener('dblclick',e=>{
      clearTimeout(clickT);
      const r=video.getBoundingClientRect(),x=(e.clientX-r.left)/r.width;
      if(x<0.33){seekBy(-10);flashFx(ui.fxl);}
      else if(x>0.67){seekBy(10);flashFx(ui.fxr);}
      else toggleFs();
    });
    ui.big.addEventListener('click',toggle);
    ui.pp.addEventListener('click',toggle);
    ui.mute.addEventListener('click',()=>{
      if(video.muted||video.volume===0){video.muted=false;if(video.volume===0)video.volume=0.5;}
      else video.muted=true;
    });
    ui.vol.addEventListener('input',()=>setVolume(+ui.vol.value));
    ui.fs.addEventListener('click',toggleFs);
    if(document.pictureInPictureEnabled&&video.requestPictureInPicture)ui.pip.addEventListener('click',togglePip);
    else ui.pip.style.display='none';
    ui.speed.addEventListener('click',e=>{e.stopPropagation();ui.menu.classList.toggle('open');});
    ui.menu.addEventListener('click',e=>{const b=e.target.closest('button');if(b)setSpeed(+b.dataset.s);});
    vp.addEventListener('click',e=>{if(!e.target.closest('.vp-speedwrap'))ui.menu.classList.remove('open');});

    ui.bar.addEventListener('pointerdown',e=>{
      if(!isFinite(video.duration))return;
      dragging=true;ui.bar.setPointerCapture(e.pointerId);
      vp.classList.add('seeking');
      const t=previewAt(posFromEvent(e));ui.cur.textContent=fmt(t);
    });
    ui.bar.addEventListener('pointermove',e=>{
      if(!isFinite(video.duration))return;
      const f=posFromEvent(e);
      ui.tip.style.left=(f*100)+'%';ui.tip.textContent=fmt(f*video.duration);
      if(dragging){const t=previewAt(f);ui.cur.textContent=fmt(t);}
    });
    const endDrag=e=>{
      if(!dragging)return;
      dragging=false;vp.classList.remove('seeking');
      video.currentTime=posFromEvent(e)*video.duration;
      showControls();
    };
    ui.bar.addEventListener('pointerup',endDrag);
    ui.bar.addEventListener('pointercancel',()=>{dragging=false;vp.classList.remove('seeking');updateProgress();});
    ui.bar.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'){seekBy(-5);e.preventDefault();e.stopPropagation();}
      if(e.key==='ArrowRight'){seekBy(5);e.preventDefault();e.stopPropagation();}
    });

    vp.addEventListener('pointermove',showControls);
    vp.addEventListener('pointerdown',showControls);
    vp.addEventListener('pointerleave',()=>{if(!video.paused&&!dragging)vp.classList.remove('active');});

    const onFs=()=>{
      const on=fsElement()===vp;
      vp.classList.toggle('fs',on);
      ui.fs.innerHTML=on?ICON.fsx:ICON.fs;
      if(!on){if(screen.orientation&&screen.orientation.unlock)try{screen.orientation.unlock()}catch(e){}fit();}
    };
    document.addEventListener('fullscreenchange',onFs);
    document.addEventListener('webkitfullscreenchange',onFs);

    if(window.ResizeObserver)new ResizeObserver(fit).observe(stage);
    window.addEventListener('resize',fit);

    document.addEventListener('keydown',e=>{
      if(!document.getElementById('pov').classList.contains('open'))return;
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const t=e.target;
      if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable)&&t!==ui.vol)return;
      const k=e.key;let used=true;
      if(k===' '||k==='k'||k==='K'){if(t&&t.tagName==='BUTTON'&&k===' ')return;toggle();}
      else if(k==='ArrowLeft'){seekBy(-5);flashFx(ui.fxl);}
      else if(k==='ArrowRight'){seekBy(5);flashFx(ui.fxr);}
      else if(k==='j'||k==='J'){seekBy(-10);flashFx(ui.fxl);}
      else if(k==='l'||k==='L'){seekBy(10);flashFx(ui.fxr);}
      else if(k==='ArrowUp'){setVolume((video.muted?0:video.volume)+0.1);}
      else if(k==='ArrowDown'){setVolume((video.muted?0:video.volume)-0.1);}
      else if(k==='m'||k==='M'){video.muted=!video.muted;}
      else if(k==='f'||k==='F'){toggleFs();}
      else if(/^[0-9]$/.test(k)&&isFinite(video.duration)){video.currentTime=video.duration*(+k/10);}
      else used=false;
      if(used){e.preventDefault();showControls();}
    });
  }

  function init(){
    if(ready)return;
    video=document.getElementById('pvid');
    vp=document.getElementById('vp');
    stage=document.getElementById('vpStage');
    video.controls=false;video.playsInline=true;
    video.disablePictureInPicture=false;
    build();bind();
    const sv=parseFloat(store.get('ft_vol'));
    video.volume=isNaN(sv)?1:Math.min(1,Math.max(0,sv));
    video.muted=store.get('ft_muted')==='1';
    updateVolumeUI();setSpeed(1);
    ready=true;
  }

  function load(url){
    init();
    vp.classList.remove('error','ended','playing');
    vp.classList.add('loading');
    ui.fill.style.width='0%';ui.thumb.style.left='0%';ui.buf.style.width='0%';
    ui.cur.textContent='0:00';ui.dur.textContent='0:00';
    setRatio(0,0);setSpeed(1);
    video.src=url;
    video.load();
    showControls();
    play();
  }

  function unload(){
    if(!ready)return;
    clearTimeout(clickT);
    video.pause();
    if(fsElement()===vp)(document.exitFullscreen||document.webkitExitFullscreen).call(document);
    if(document.pictureInPictureElement===video)document.exitPictureInPicture().catch(()=>{});
    video.removeAttribute('src');
    video.load();
    ui.menu.classList.remove('open');
  }

  return{load,unload,toggle};
})();
