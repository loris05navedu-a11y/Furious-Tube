/* Furious Maker — état global & historique (annuler) */
// ── FM initialisé ──
const vid=document.getElementById('fm-vid');
const S={
  media:[],clips:[],ovs:[],
  ct:0,dur:0,playing:false,
  selClip:null,selTov:null,
  tool:'select',zoom:1,
  speeds:[.25,.5,.75,1,1.25,1.5,2,4],si:3,
  placingText:null   // texte en attente de placement
};
let raf,ctxTarget=null,ovId=0;

/* ─── HISTORIQUE (UNDO) ─── */
const HIST=[];
let HIST_IDX=-1;
const MAX_HIST=50;

function snapshot(){
  return{
    clips:JSON.parse(JSON.stringify(S.clips)),
    ovs:JSON.parse(JSON.stringify(S.ovs)),
    dur:S.dur
  };
}
function pushHistory(){
  // Tronquer les états "futurs" si on a annulé
  HIST.splice(HIST_IDX+1);
  HIST.push(snapshot());
  if(HIST.length>MAX_HIST)HIST.shift();
  HIST_IDX=HIST.length-1;
}
function undoLast(){
  if(HIST_IDX<=0){fmToast('Rien à annuler');return;}
  HIST_IDX--;
  const h=HIST[HIST_IDX];
  S.clips=JSON.parse(JSON.stringify(h.clips));
  S.ovs=JSON.parse(JSON.stringify(h.ovs));
  S.dur=h.dur;
  S.selClip=null;S.selTov=null;
  renderOvs();renderTL();
  fmToast('Annulé ↩');
}
// Sauvegarder l'état initial
pushHistory();
