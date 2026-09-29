/* FuriousTubes — fonctions utilitaires */
function fmt(s){if(!s||isNaN(s))return'';return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
function fmtDate(ts){if(!ts)return'';return new Date(ts).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});}
function escHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
function setBtn(id,dis,label){const b=document.getElementById(id);if(!b)return;b.disabled=dis;b.innerHTML=dis?`<div class="spin"></div> ${label}`:label;}
let tt;
function toast(msg,type='ok'){
  const t=document.getElementById('toast');t.className=`toast ${type}`;
  document.getElementById('tmsg').textContent=msg;t.classList.add('show');
  clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),3500);
}

function containsBanned(t){return BANNED_WORDS.some(w=>t.toLowerCase().includes(w));}

function getAvatarHtml(avatar,name,cls){
  if(avatar) return `<div class="${cls}"><img src="${avatar}"></div>`;
  return `<div class="${cls}">${(name||'?')[0].toUpperCase()}</div>`;
}
