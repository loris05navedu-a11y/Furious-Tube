/* FuriousTubes — barre latérale : navigation & catégories */
let activeCategory = '🏠 Accueil';
const NAV_ITEMS = [
  ['🏠 Accueil','🏠','Accueil'],
  ['✨ Pour toi','✨','Pour toi'],
  ['🧭 Explorer','🧭','Explorer'],
  ['🔥 Tendances','🔥','Tendances'],
  ['📁 Mes vidéos','🎬','Mes vidéos'],
  ['❤️ Favoris','❤️','Favoris']
];

function navBtn(key,icon,label){
  return `<button class="si-btn${key===activeCategory?' active':''}" onclick="filterCat('${key}')" title="${label}"><span class="si-ico">${icon}</span><span class="si-lbl">${label}</span></button>`;
}

function renderCats(){
  const special = ['🏠 Accueil','✨ Pour toi'];
  const cats = CATEGORIES.filter(c => !special.includes(c));
  document.getElementById('sideNav').innerHTML =
    NAV_ITEMS.map(([k,i,l]) => navBtn(k,i,l)).join('') +
    `<button class="si-btn" onclick="surpriseMe()" title="Surprise me"><span class="si-ico">🎲</span><span class="si-lbl">Surprise me</span></button>`;
  document.getElementById('catsBar').innerHTML =
    cats.map(c => { const [ic,...r] = c.split(' '); return navBtn(c,ic,r.join(' ')); }).join('');
}

function filterCat(cat){
  if((cat==='📁 Mes vidéos'||cat==='❤️ Favoris') && !requireLogin('Connectez-vous pour accéder à cette section')) return;
  activeCategory = cat;
  searchQuery = '';
  const si = document.getElementById('searchInput');
  if(si) si.value = '';
  renderCats();
  loadFeed(true);
  window.scrollTo({top:0,behavior:'smooth'});
}

function goHome(){
  if(document.body.classList.contains('watching')) closePlayer();
  filterCat('🏠 Accueil');
}
