/* FuriousTubes — configuration & listes de modération */
const CONFIG = {
  CLOUD_NAME:    "dol7ga850",
  UPLOAD_PRESET: "p7khovfu",
  VIDEOS_BIN_ID: "69e6190e36566621a8d19c30",
  USERS_BIN_ID:  "69e729d236566621a8d63ae2",
  JSONBIN_KEY:   "$2a$10$X9eJob5ggsHbGd5vF.HTTeofBE7wy7TXpZp.ccD0jR0YL0mvxZnZS",
  SIGHTENGINE_USER:   "1546443",
  SIGHTENGINE_SECRET: "Sk2XaY4fhrSqiZGtS3t6o53Tjwer7oKN",
  DEFAULT_MUSIC_ID: "SwpkPf63304", // YouTube video ID
};

const ADMIN_USERNAME = 'furious shorter'; // compte admin

const CATEGORIES = ['🏠 Accueil','✨ Pour toi','🎮 Jeux','😂 Divertissement','🎵 Musique','🏆 Sport','🎨 Art & Créativité','🍳 Cuisine','✈️ Voyage','🔬 Science & Tech','💃 Danse','🐾 Animaux','📚 Éducation','🎭 Autre'];

const BANNED_USERNAMES = [
  'admin','moderator','support','staff','official','furioustubes','system',
  'porno','porn','sex','nude','nazi','nigger','hitler','terrorist',
  'fuck','shit','bitch','asshole','cunt','dick','pussy','cock',
];

function checkUsername(name) {
  if(name.length < 3) return 'Pseudo trop court (min. 3 caractères)';
  if(name.length > 20) return 'Pseudo trop long (max. 20 caractères)';
  if(!/^[a-zA-Z0-9_. -]+$/.test(name)) return 'Pseudo invalide';
  if(BANNED_USERNAMES.some(w=>name.toLowerCase().includes(w))) return "Ce pseudo n'est pas autorisé ❌";
  return null;
}

const BANNED_WORDS = ['porno','porn','sex','sexe','nude','nue','naked','nu','xxx','hentai','violence','gore','meurtre','viol','snuff','torture','nsfw'];
