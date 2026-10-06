/* FuriousTubes — initialisation Firebase (Auth + Firestore) */
let fbAuth=null,fbDb=null;
try{
  firebase.initializeApp(FIREBASE_CONFIG);
  fbAuth=firebase.auth();
  fbAuth.languageCode='fr';
  fbDb=firebase.firestore();
  if(window.__FT_EMULATORS__){fbDb.useEmulator('localhost',8080);fbAuth.useEmulator('http://localhost:9099',{disableWarnings:true});}   // tests uniquement
}catch(e){console.error('Firebase indisponible :',e);}
