/* FuriousTubes — base de données (Firestore) : profils et vidéos

   Deux modes, choisis au démarrage par le document config/app :
   • v1 (par défaut) : chaque "bin" est un document bins/<id> contenant { items: [...] }.
   • v2 (après migration par un admin) : une collection par bin (users/<uid>, videos/<id>),
     protégée par les règles de firestore.rules (droits admin / staff / propriétaire vérifiés côté serveur).
   Le reste du code appelle toujours getBin() / setBin() : en v2, setBin() n'écrit que les documents modifiés. */
function binRef(id){
  if(!fbDb) throw new Error('Firestore indisponible');
  return fbDb.collection('bins').doc(id);
}

let DATA_V2=false;
const V2_COLLECTION={};
function v2Collection(id){
  if(!V2_COLLECTION[CONFIG.VIDEOS_BIN_ID]){V2_COLLECTION[CONFIG.VIDEOS_BIN_ID]='videos';V2_COLLECTION[CONFIG.USERS_BIN_ID]='users';}
  return V2_COLLECTION[id];
}
let usersById={};   // derniers profils lus (noms et photos à jour pour l'affichage des commentaires)

let dataInit=null;
function initDataLayer(){
  return dataInit||(dataInit=(async()=>{
    try{
      if(!fbDb) return;
      const s=await fbDb.collection('config').doc('app').get();
      DATA_V2=!!(s.exists&&s.data().dataV2===true);
    }catch(e){DATA_V2=false;}   // règles v2 pas encore publiées : on reste en v1
  })());
}

// ── v2 : lecture / écriture par document ──
let readGen=0;
const readSets=new Map();   // génération de lecture -> ids présents (pour détecter les suppressions)
const lastGen={};
const tag=(o,k,v)=>Object.defineProperty(o,k,{value:v,writable:true,enumerable:false,configurable:true});
const commentMap=list=>Object.fromEntries((list||[]).map(c=>[c.id,JSON.stringify(c)]));

async function getCollection(id){
  const col=v2Collection(id);
  const snap=await fbDb.collection(col).get();
  const gen=++readGen;
  const ids=new Set();
  const arr=snap.docs.map(d=>{
    const data=d.data();
    const item={...data,id:d.id};
    if(col==='videos'){
      const c=data.comments;
      item.comments=Array.isArray(c)?c:Object.values(c||{}).sort((a,b)=>(a.date||0)-(b.date||0));
    }
    tag(item,'__s',JSON.stringify(item));
    tag(item,'__g',gen);
    tag(item,'__c',commentMap(item.comments));
    ids.add(d.id);
    return item;
  });
  readSets.set(gen,ids);lastGen[id]=gen;
  if(readSets.size>40) readSets.delete(readSets.keys().next().value);
  return arr;
}

function toDoc(col,item){
  const doc=JSON.parse(JSON.stringify(item));
  if(col==='videos'){
    const old=item.__c||{},cur=commentMap(item.comments);
    doc.comments=Object.fromEntries((item.comments||[]).map(c=>[c.id,JSON.parse(JSON.stringify(c))]));
    const changed=[...new Set([...Object.keys(old),...Object.keys(cur)])].filter(k=>old[k]!==cur[k]);
    if(changed.length===1) doc.lastComment=changed[0];   // indice vérifié par les règles (auteur du commentaire)
  }
  return doc;
}

async function setCollection(id,arr){
  const col=v2Collection(id);
  const ops=[],keep=new Set(),gens=new Set();
  for(const item of arr){
    if(!item||!item.id) continue;
    keep.add(item.id);
    if(item.__g!==undefined) gens.add(item.__g);
    if(item.__s===undefined||JSON.stringify(item)!==item.__s) ops.push({item,run:()=>fbDb.collection(col).doc(item.id).set(toDoc(col,item))});
  }
  if(!gens.size&&lastGen[id]!==undefined) gens.add(lastGen[id]);
  for(const g of gens){
    for(const docId of (readSets.get(g)||[])){
      if(!keep.has(docId)) ops.push({run:()=>fbDb.collection(col).doc(docId).delete()});
    }
  }
  const res=await Promise.allSettled(ops.map(o=>o.run()));
  res.forEach((r,i)=>{if(r.status==='fulfilled'&&ops[i].item){const it=ops[i].item;tag(it,'__s',JSON.stringify(it));tag(it,'__c',commentMap(it.comments));}});
  const bad=res.find(r=>r.status==='rejected');
  if(bad) throw bad.reason;
}

// ── API commune ──
async function getBin(id){
  await initDataLayer();
  let items;
  if(DATA_V2&&v2Collection(id)) items=await getCollection(id);
  else{
    const snap=await binRef(id).get();
    items=snap.exists?snap.data().items:[];
    if(!Array.isArray(items)) items=[];
  }
  if(id===CONFIG.USERS_BIN_ID) usersById=Object.fromEntries(items.filter(u=>u&&u.id).map(u=>[u.id,u]));
  return items;
}
async function setBin(id,data){
  await initDataLayer();
  if(DATA_V2&&v2Collection(id)) return setCollection(id,data);
  await binRef(id).set({items:data});
}

// Lecture / écriture directes des bins v1 (utilisées par la migration)
async function getBinV1(id){const s=await binRef(id).get();const a=s.exists?s.data().items:[];return Array.isArray(a)?a:[];}
