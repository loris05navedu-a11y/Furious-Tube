/* FuriousTubes — base de données (Firestore) : profils et vidéos
   Chaque "bin" est un document Firestore  bins/<id>  contenant { items: [...] }. */
function binRef(id){
  if(!fbDb) throw new Error('Firestore indisponible');
  return fbDb.collection('bins').doc(id);
}
async function getBin(id){
  const snap=await binRef(id).get();
  const items=snap.exists?snap.data().items:[];
  return Array.isArray(items)?items:[];
}
async function setBin(id,data){
  await binRef(id).set({items:data});
}
