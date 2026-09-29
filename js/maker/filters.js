/* Furious Maker — filtres */
/* ─── FILTERS ────────── */
const PRES={
  none:{br:100,co:100,sa:100,hu:0,bl:0},
  vivid:{br:110,co:115,sa:160,hu:0,bl:0},
  cool:{br:95,co:105,sa:90,hu:-20,bl:0},
  warm:{br:105,co:100,sa:110,hu:15,bl:0},
  mono:{br:100,co:110,sa:0,hu:0,bl:0},
  fade:{br:110,co:80,sa:70,hu:5,bl:0}
};
function applyPre(el,p){
  document.querySelectorAll('#fm-overlay .fpre').forEach(e=>e.classList.remove('on'));el.classList.add('on');
  const v=PRES[p];
  document.getElementById('f-br').value=v.br;document.getElementById('f-co').value=v.co;
  document.getElementById('f-sa').value=v.sa;document.getElementById('f-hu').value=v.hu;
  document.getElementById('f-bl').value=v.bl;applyF();
}
function applyF(){
  const br=document.getElementById('f-br').value,co=document.getElementById('f-co').value;
  const sa=document.getElementById('f-sa').value,hu=document.getElementById('f-hu').value;
  const bl=document.getElementById('f-bl').value;
  document.getElementById('fv-br').textContent=br+'%';document.getElementById('fv-co').textContent=co+'%';
  document.getElementById('fv-sa').textContent=sa+'%';document.getElementById('fv-hu').textContent=hu+'°';
  document.getElementById('fv-bl').textContent=bl+'px';
  vid.style.filter=`brightness(${br}%) contrast(${co}%) saturate(${sa}%) hue-rotate(${hu}deg) blur(${bl}px)`;
}
