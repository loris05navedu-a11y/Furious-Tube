/* FuriousTubes — import de vidéos (Cloudinary + Sightengine) */
// ── Upload ──
let selFile=null;
function openUpload(){if(!currentUser){document.getElementById('authOv').classList.add('open');return;}document.getElementById('upOv').classList.add('open');}
function closeUp(){document.getElementById('upOv').classList.remove('open');resetForm();}
document.getElementById('upOv').addEventListener('click',e=>{if(e.target.id==='upOv')closeUp();});

const drop=document.getElementById('drop'),fi=document.getElementById('fi');
drop.addEventListener('click',()=>fi.click());
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('on');});
drop.addEventListener('dragleave',()=>drop.classList.remove('on'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('on');const f=e.dataTransfer.files[0];if(f?.type.startsWith('video/'))setFile(f);else toast('Choisissez une vidéo','er');});
fi.addEventListener('change',e=>{if(e.target.files[0])setFile(e.target.files[0]);});

function setFile(f){
  if(f.size>100*1024*1024){toast('Max 100 MB','er');return;}
  selFile=f;
  const p=document.getElementById('fprev');
  p.textContent=`📎 ${f.name} (${(f.size/1024/1024).toFixed(1)} MB)`;
  p.style.display='block';
  drop.style.borderColor='var(--fire)';
}

async function moderateVideo(url){
  try{
    const params=new URLSearchParams({stream_url:url,models:'nudity-2.0,violence',api_user:CONFIG.SIGHTENGINE_USER,api_secret:CONFIG.SIGHTENGINE_SECRET});
    const r=await fetch('https://api.sightengine.com/1.0/video/check-sync.json?'+params);
    const d=await r.json();
    if(d.status==='failure') return{safe:true};
    if(d.nudity?.sexual_activity>0.5||d.nudity?.sexual_display>0.5) return{safe:false,reason:'🔞 Contenu adulte détecté.'};
    if(d.violence?.prob>0.7) return{safe:false,reason:'⚠️ Contenu violent détecté.'};
    return{safe:true};
  }catch(e){return{safe:true};}
}

async function doUpload(){
  const title=document.getElementById('vtitle').value.trim();
  const cat=document.getElementById('vcat').value;
  if(!selFile) return showErr('Choisissez une vidéo');
  if(!title) return showErr('Donnez un titre');
  if(!cat) return showErr('Choisissez une catégorie');
  if(containsBanned(title)) return showErr('❌ Titre contient des mots non autorisés');
  if(!currentUser) return;

  const btn=document.getElementById('subBtn');
  btn.disabled=true;btn.innerHTML=`<div class="spin"></div> Upload...`;
  document.getElementById('pw').style.display='block';
  document.getElementById('uerr').style.display='none';

  try{
    const fd=new FormData();
    fd.append('file',selFile);
    fd.append('upload_preset',CONFIG.UPLOAD_PRESET);
    const xhr=new XMLHttpRequest();
    xhr.upload.onprogress=e=>{
      if(e.lengthComputable){const p=Math.round(e.loaded/e.total*100);document.getElementById('pb').style.width=p+'%';document.getElementById('ptext').textContent=`Envoi... ${p}%`;}
    };
    const cr=await new Promise((res,rej)=>{xhr.onload=()=>{try{res(JSON.parse(xhr.responseText));}catch(e){rej(e);}};xhr.onerror=rej;xhr.open('POST',`https://api.cloudinary.com/v1_1/${CONFIG.CLOUD_NAME}/video/upload`);xhr.send(fd);});
    if(cr.error) throw new Error('Cloudinary : '+cr.error.message);

    document.getElementById('ptext').textContent='🔍 Analyse du contenu...';
    const mod=await moderateVideo(cr.secure_url);
    if(!mod.safe) throw new Error(mod.reason);

    document.getElementById('ptext').textContent='Sauvegarde...';
    const thumb=cr.secure_url.replace('/upload/','/upload/so_1,w_480,c_fill,f_jpg/').replace(/\.\w+$/,'.jpg');
    const newVid={
      id:cr.public_id,title,category:cat,
      uploader:currentUser.username,uploaderId:currentUser.id,
      uploaderAvatar:currentUser.avatar||null,
      url:cr.secure_url,thumb,duration:cr.duration||null,
      date:Date.now(),likes:[],dislikes:[],comments:[],reports:[],
    };
    const videos=await getBin(CONFIG.VIDEOS_BIN_ID);
    videos.push(newVid);
    await setBin(CONFIG.VIDEOS_BIN_ID,videos);
    closeUp();loadFeed();
    toast(`"${title}" publié ! 🔥`,'ok');
  }catch(e){
    showErr('Erreur : '+e.message);
    btn.disabled=false;btn.innerHTML='⬆ Publier la vidéo';
  }
}

function resetForm(){
  selFile=null;fi.value='';
  document.getElementById('vtitle').value='';
  document.getElementById('vcat').value='';
  document.getElementById('fprev').style.display='none';
  drop.style.borderColor='';
  document.getElementById('pw').style.display='none';
  document.getElementById('pb').style.width='0%';
  document.getElementById('ptext').textContent='';
  document.getElementById('uerr').style.display='none';
  const btn=document.getElementById('subBtn');btn.disabled=false;btn.innerHTML='⬆ Publier la vidéo';
}
function showErr(msg){const e=document.getElementById('uerr');e.textContent=msg;e.style.display='block';}
