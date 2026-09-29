/* FuriousTubes — barre des catégories */
// ── Categories bar ──
let activeCategory = '🏠 Accueil';
function renderCats(){
  const bar = document.getElementById('catsBar');
  const special = ['🏠 Accueil','✨ Pour toi'];
  const normal = CATEGORIES.filter(c => !special.includes(c));

  const specialHTML = special.map(c => {
    const isActive = c === activeCategory;
    const icon = c === '🏠 Accueil' ? '🏠' : '✨';
    const label = c === '🏠 Accueil' ? 'Accueil' : 'Pour toi';
    return `<button class="cat-btn special-cat${isActive?' active':''}" onclick="filterCat('${c}')">${icon} ${label}</button>`;
  }).join('');

  const normalHTML = normal.map(c => {
    const isActive = c === activeCategory;
    return `<button class="cat-btn${isActive?' active':''}" onclick="filterCat('${c}')">${c}</button>`;
  }).join('');

  bar.innerHTML = `
    <div class="cats-special">
      ${specialHTML}
    </div>
    ${normalHTML}`;
}
function filterCat(cat){activeCategory=cat;renderCats();loadFeed(true);}
