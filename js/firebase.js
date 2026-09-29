/* FuriousTubes — initialisation Firebase (Auth + Firestore) */
let fbAuth=null,fbDb=null;
try{
  firebase.initializeApp(FIREBASE_CONFIG);
  fbAuth=firebase.auth();
  fbAuth.languageCode='fr';
  fbDb=firebase.firestore();
}catch(e){console.error('Firebase indisponible :',e);}
