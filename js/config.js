/* FuriousTubes — configuration & listes de modération */
const CONFIG = {
  CLOUD_NAME:    "dol7ga850",
  UPLOAD_PRESET: "p7khovfu",
  // Collections Firestore (documents "bins/videos" et "bins/users")
  VIDEOS_BIN_ID: "videos",
  USERS_BIN_ID:  "users",
  SIGHTENGINE_USER:   "1546443",
  SIGHTENGINE_SECRET: "Sk2XaY4fhrSqiZGtS3t6o53Tjwer7oKN",
  DEFAULT_MUSIC_ID: "SwpkPf63304", // YouTube video ID
};

// Configuration web Firebase (publique par conception : la sécurité vient des règles Firebase, pas de cette clé)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCwx5B5bNhENGsUZfeIyXnlBQ8y2ii9Czk",
  authDomain: "furioustube-9d498.firebaseapp.com",
  projectId: "furioustube-9d498",
  storageBucket: "furioustube-9d498.firebasestorage.app",
  messagingSenderId: "639306506723",
  appId: "1:639306506723:web:e641526bf652cbc60700d6",
};

// Comptes administrateurs (reconnus par e-mail, une fois l'e-mail vérifié)
const ADMIN_EMAILS = [
  'thaodubois005@gmail.com',
  'loris05.nav@gmail.com',
  'loris05.nav-edu@gmail.com',
];
const ADMIN_USERNAME = 'furious shorter'; // pseudo réservé (interdit aux non-admins)

const CATEGORIES = ['🏠 Accueil','✨ Pour toi','🎮 Jeux','😂 Divertissement','🎵 Musique','🏆 Sport','🎨 Art & Créativité','🍳 Cuisine','✈️ Voyage','🔬 Science & Tech','💃 Danse','🐾 Animaux','📚 Éducation','🎭 Autre'];

// Mots réservés à l'équipe : autorisés pour les admins uniquement
const STAFF_USERNAMES = ['admin','moderator','support','staff','official','furioustubes','system'];
const BANNED_USERNAMES = [
  'porno','porn','sex','nude','nazi','nigger','hitler','terrorist',
  'fuck','shit','bitch','asshole','cunt','dick','pussy','cock',
];

function checkUsername(name, isAdmin=false) {
  if(name.length < 3) return 'Pseudo trop court (min. 3 caractères)';
  if(name.length > 20) return 'Pseudo trop long (max. 20 caractères)';
  if(!/^[a-zA-Z0-9_. -]+$/.test(name)) return 'Pseudo invalide';
  const low=name.toLowerCase();
  if(BANNED_USERNAMES.some(w=>low.includes(w))) return "Ce pseudo n'est pas autorisé ❌";
  if(!isAdmin&&STAFF_USERNAMES.some(w=>low.includes(w))) return 'Ce pseudo est réservé aux admins ❌';
  return null;
}

const BANNED_WORDS = ['porno','porn','sex','sexe','nude','nue','naked','nu','xxx','hentai','violence','gore','meurtre','viol','snuff','torture','nsfw'];
