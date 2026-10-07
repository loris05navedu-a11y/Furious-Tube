/* FuriousTubes — barre latérale : navigation & catégories */
let activeCategory = '🏠 Accueil';

const ico = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const DOTS = pts => pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.1" fill="currentColor"/>`).join('');
const ICONS = {
  '🏠 Accueil': ico('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  '✨ Pour toi': ico('<path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  '🧭 Explorer': ico('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
  '🔥 Tendances': ico('<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 .8 3 2 3 0-3-1-5.5 1-8.5z"/>'),
  '📁 Mes vidéos': ico('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9l5 3-5 3z"/>'),
  '❤️ Favoris': ico('<path d="M12 20s-7.5-4.6-9.3-9.2A5 5 0 0 1 12 7.6a5 5 0 0 1 9.3 3.2C19.5 15.4 12 20 12 20z"/>'),
  '⏱️ Continuer': ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-width="2" fill="none"/><path d="M1 12a11 11 0 0 1 22 0 11 11 0 0 1-22 0" fill="none" stroke-width="1.5"/>'),
  '🎲 Surprise': ico('<rect x="4" y="4" width="16" height="16" rx="3.5"/>'+DOTS([[9,9],[15,9],[9,15],[15,15]])),
  '🎮 Jeux': ico('<path d="M7 8h10a4 4 0 0 1 4 4v1.5a2.8 2.8 0 0 1-5 1.7L14.5 14h-5l-1.5 1.2A2.8 2.8 0 0 1 3 13.500V12a4 4 0 0 1 4-4z"/><path d="M8 10.500v3M6.5 12h3"/>'+DOTS([[16,11],[18,13]])),
  '😂 Divertissement': ico('<circle cx="12" cy="12" r="9"/><path d="M8 14c1 2.2 7 2.2 8 0"/>'+DOTS([[9,9.5],[15,9.5]])),
  '🎵 Musique': ico('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  '🏆 Sport': ico('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 21h8M10 17h4"/>'),
  '🎨 Art & Créativité': ico('<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a3 3 0 0 0 3-3c0-5-4-11-8-11z"/>'+DOTS([[8,10],[12,7],[16,9]])),
  '🍳 Cuisine': ico('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10"/>'),
  '✈️ Voyage': ico('<path d="M21 3L3 11l7 3 3 7z"/><path d="M10 14l11-11"/>'),
  '🔬 Science & Tech': ico('<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
  '💃 Danse': ico('<circle cx="12" cy="5" r="2"/><path d="M12 8v6l-3 7M12 14l4 2M7.5 11L12 8l4.5 3"/>'),
  '🐾 Animaux': ico('<circle cx="6" cy="11" r="1.8"/><circle cx="10" cy="6.5" r="1.8"/><circle cx="14" cy="6.5" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M12 12c3 0 5 3 5 5.500a2.5 2.5 0 0 1-3 2.300c-1-.3-1.5-.3-2-.3s-1 0-2 .3a2.5 2.5 0 0 1-3-2.300C7 15 9 12 12 12z"/>'),
  '📚 Éducation': ico('<path d="M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>'),
  '🎭 Autre': ico('<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>')
};
const NAV_ITEMS = [
  ['🏠 Accueil','Accueil'],
  ['✨ Pour toi','Pour toi'],
  ['🧭 Explorer','Explorer'],
  ['🔥 Tendances','Tendances'],
  ['📁 Mes vidéos','Mes vidéos'],
  ['⏱️ Continuer','Continuer'],
  ['❤️ Favoris','Favoris']
];

function navBtn(key,label,extra){
  const on = key===activeCategory?' active':'';
  const act = extra || `filterCat('${key}')`;
  return `<button class="si-btn${on}" onclick="${act}" title="${label}"><span class="si-ico">${ICONS[key]||key.split(' ')[0]}</span><span class="si-lbl">${label}</span></button>`;
}

function renderCats(){
  const special = ['🏠 Accueil','✨ Pour toi'];
  const cats = CATEGORIES.filter(c => !special.includes(c));
  document.getElementById('sideNav').innerHTML =
    NAV_ITEMS.map(([k,l]) => navBtn(k,l)).join('') + navBtn('🎲 Surprise','Surprise me','surpriseMe()');
  document.getElementById('catsBar').innerHTML =
    cats.map(c => navBtn(c,c.split(' ').slice(1).join(' '))).join('');
}

function filterCat(cat){
  if((cat==='📁 Mes vidéos'||cat==='⏱️ Continuer'||cat==='❤️ Favoris') && !requireLogin('Connectez-vous pour accéder à cette section')) return;
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
