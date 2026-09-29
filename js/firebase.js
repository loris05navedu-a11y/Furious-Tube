/* FuriousTubes — initialisation Firebase (Auth email / mot de passe) */
let fbAuth=null;
try{
  firebase.initializeApp(FIREBASE_CONFIG);
  fbAuth=firebase.auth();
  fbAuth.languageCode='fr';
}catch(e){console.error('Firebase indisponible :',e);}
