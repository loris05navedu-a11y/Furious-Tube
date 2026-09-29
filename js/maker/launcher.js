/* Furious Maker — ouverture / fermeture de l'overlay */
function openFuriousMaker(){
  var ov=document.getElementById('fm-overlay');
  var btn=document.getElementById('fm-back-btn');
  if(!ov){alert('Furious Maker non trouvé – rechargez la page');return;}
  ov.classList.add('open');
  if(btn) btn.style.display='flex'; // visible sur le menu
  document.body.style.overflow='hidden';
  if(typeof renderRecent==='function') renderRecent();
}
function closeFuriousMaker(){
  var ov=document.getElementById('fm-overlay');
  var btn=document.getElementById('fm-back-btn');
  if(ov) ov.classList.remove('open');
  if(btn) btn.style.display='none';
  document.body.style.overflow='';
  var v=document.getElementById('fm-vid');
  if(v&&!v.paused) v.pause();
}
