/* Furious Maker — export WebM */
/* ─── EXPORT ────────── */
function doExport(){
  if(!vid.src){fmToast('Aucune vidéo à exporter');return;}
  fmToast('Export en cours…');
  const cvs=document.createElement('canvas');
  cvs.width=vid.videoWidth||640;cvs.height=vid.videoHeight||360;
  const ctx=cvs.getContext('2d');
  const stream=cvs.captureStream(30);
  let mr;
  try{
    const ac=new AudioContext();
    const src=ac.createMediaElementSource(vid);
    const dst=ac.createMediaStreamDestination();
    src.connect(dst);src.connect(ac.destination);
    mr=new MediaRecorder(new MediaStream([...stream.getTracks(),...dst.stream.getTracks()]),{mimeType:'video/webm;codecs=vp9'});
  }catch(e){mr=new MediaRecorder(stream,{mimeType:'video/webm'});}
  const chunks=[];
  mr.ondataavailable=e=>chunks.push(e.data);
  mr.onstop=()=>{
    const blob=new Blob(chunks,{type:'video/webm'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ClipForge_export.webm';a.click();
    fmToast('Export terminé !');
  };
  vid.currentTime=0;
  const draw=()=>{
    ctx.drawImage(vid,0,0,cvs.width,cvs.height);
    const t=vid.currentTime;
    for(const ov of S.ovs){
      if(t>=ov.st&&t<=ov.et){
        ctx.save();ctx.font=`bold ${ov.size}px Sora,sans-serif`;
        ctx.fillStyle=ov.color;ctx.textAlign='center';
        ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=8;
        ctx.fillText(ov.text,cvs.width*ov.x/100,cvs.height*ov.y/100);ctx.restore();
      }
    }
    if(!vid.ended&&!vid.paused)requestAnimationFrame(draw);else mr.stop();
  };
  mr.start();vid.play().then(draw);
  setTimeout(()=>{if(mr.state==='recording')mr.stop();},(vid.duration+1)*1000);
}
