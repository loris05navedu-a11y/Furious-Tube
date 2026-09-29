/* Furious Maker — découpe & menu contextuel */
/* ─── SPLIT ────────── */
function splitAtPlayhead(){if(S.selClip){const cl=S.clips.find(c=>c.id===S.selClip);if(cl)splitAt(cl);}else fmToast('Sélectionnez d\'abord un clip');}
function splitAt(cl){
  const at=S.ct;
  if(at<=cl.ts||at>=cl.ts+cl.dur){fmToast('Placez la tête de lecture sur le clip');return;}
  pushHistory();
  const second={...cl,id:Date.now(),ts:at,dur:cl.ts+cl.dur-at};
  cl.dur=at-cl.ts;S.clips.push(second);fmToast('Clip divisé');renderTL();
}

/* ─── CONTEXT ────────── */
function showCtx(e,id){ctxTarget=id;const m=document.getElementById('ctx');m.style.cssText=`display:block;left:${e.clientX}px;top:${e.clientY}px`;}
function ctxDo(a){
  const cl=S.clips.find(c=>c.id===ctxTarget);if(!cl)return hideCtx();
  pushHistory();
  if(a==='del'){S.clips=S.clips.filter(c=>c.id!==ctxTarget);fmToast('Clip supprimé');}
  else if(a==='dup'){const d={...cl,id:Date.now(),ts:cl.ts+cl.dur};S.clips.push(d);fmToast('Dupliqué');}
  else if(a==='split')splitAt(cl);
  hideCtx();renderTL();
}
function hideCtx(){document.getElementById('ctx').style.display='none';}
document.addEventListener('click',hideCtx);
