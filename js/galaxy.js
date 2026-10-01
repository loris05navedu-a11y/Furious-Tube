/* FuriousTubes — thème Galaxy : champ d'étoiles animé (3 couches, scintillement, étoiles filantes) */
(function(){
  const cv=document.createElement('canvas');cv.id='galaxy';document.body.prepend(cv);
  const ctx=cv.getContext('2d');
  const still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS=['255,255,255','196,181,253','165,243,252','240,171,252'];
  let W=0,H=0,dpr=1,stars=[],shoot=null,last=0,nextShoot=0,raf=0;

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=cv.width=Math.floor(innerWidth*dpr);H=cv.height=Math.floor(innerHeight*dpr);
    const n=Math.min(260,Math.floor(innerWidth*innerHeight/6500));
    stars=Array.from({length:n},()=>{
      const layer=Math.random();                       // 0 = lointaine, 1 = proche
      return{x:Math.random()*W,y:Math.random()*H,
        r:(0.4+layer*1.4)*dpr,v:(0.03+layer*0.12)*dpr, // vitesse de dérive
        c:COLORS[Math.floor(Math.random()*COLORS.length)],
        ph:Math.random()*6.28,sp:0.5+Math.random()*1.8,a:0.35+Math.random()*0.65};
    });
    draw(0);
  }

  function draw(t){
    ctx.clearRect(0,0,W,H);
    for(const s of stars){
      const tw=still?1:0.55+0.45*Math.sin(t/1000*s.sp+s.ph);
      ctx.globalAlpha=s.a*tw;
      ctx.fillStyle='rgb('+s.c+')';
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.283);ctx.fill();
      if(s.r>1.3*dpr){ctx.globalAlpha=s.a*tw*0.18;ctx.beginPath();ctx.arc(s.x,s.y,s.r*3.2,0,6.283);ctx.fill();}
    }
    if(shoot){
      const g=ctx.createLinearGradient(shoot.x,shoot.y,shoot.x-shoot.vx*14,shoot.y-shoot.vy*14);
      g.addColorStop(0,'rgba(255,255,255,'+shoot.life+')');g.addColorStop(1,'rgba(139,92,246,0)');
      ctx.globalAlpha=1;ctx.strokeStyle=g;ctx.lineWidth=1.6*dpr;
      ctx.beginPath();ctx.moveTo(shoot.x,shoot.y);ctx.lineTo(shoot.x-shoot.vx*14,shoot.y-shoot.vy*14);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  function frame(t){
    const dt=Math.min(50,t-last||16);last=t;
    for(const s of stars){
      s.y+=s.v*dt/16;s.x-=s.v*0.35*dt/16;
      if(s.y>H+4){s.y=-4;s.x=Math.random()*W;}
      if(s.x<-4)s.x=W+4;
    }
    if(!shoot&&t>nextShoot){
      shoot={x:Math.random()*W*0.8+W*0.2,y:Math.random()*H*0.4,vx:-(9+Math.random()*6)*dpr,vy:(4+Math.random()*3)*dpr,life:1};
      nextShoot=t+5000+Math.random()*9000;
    }
    if(shoot){shoot.x+=shoot.vx*dt/16;shoot.y+=shoot.vy*dt/16;shoot.life-=0.014*dt/16;
      if(shoot.life<=0||shoot.x<-50||shoot.y>H+50)shoot=null;}
    draw(t);
    raf=requestAnimationFrame(frame);
  }

  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{
    cancelAnimationFrame(raf);
    if(!document.hidden&&!still)raf=requestAnimationFrame(frame);
  });
  resize();
  if(!still)raf=requestAnimationFrame(frame);
})();
