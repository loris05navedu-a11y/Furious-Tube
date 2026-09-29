/* FuriousTubes — musique de fond YouTube */
// ── YouTube Music ──
let ytPlayer=null,musicPaused=false,currentVolume=30;

function onYouTubeIframeAPIReady(){
  ytPlayer=new YT.Player('ytPlayer',{
    videoId:CONFIG.DEFAULT_MUSIC_ID,
    playerVars:{autoplay:0,loop:1,playlist:CONFIG.DEFAULT_MUSIC_ID,controls:0,modestbranding:1},
    events:{
      onReady:e=>{e.target.setVolume(currentVolume);document.getElementById('musicTitle').textContent='Musique de fond';},
      onStateChange:e=>{
        if(e.data===YT.PlayerState.ENDED) ytPlayer.playVideo();
        document.getElementById('musicToggle').textContent=e.data===YT.PlayerState.PLAYING?'⏸':'▶';
      }
    }
  });
}

function startMusicManually(){
  if(ytPlayer&&ytPlayer.playVideo){
    ytPlayer.playVideo();
    ytPlayer.setVolume(currentVolume);
    musicPaused=false;
    document.getElementById('musicToggle').textContent='⏸';
    const banner=document.getElementById('musicStartBanner');if(banner)banner.style.display='none';
    toast('🎵 Musique lancée !','ok');
  }
}

function setVolume(v){currentVolume=v;if(ytPlayer&&ytPlayer.setVolume)ytPlayer.setVolume(v);}
function toggleMusic(){
  if(!ytPlayer) return;
  const s=ytPlayer.getPlayerState();
  if(s===YT.PlayerState.PLAYING){ytPlayer.pauseVideo();musicPaused=true;document.getElementById('musicToggle').textContent='▶';}
  else{ytPlayer.playVideo();musicPaused=false;document.getElementById('musicToggle').textContent='⏸';}
}
function pauseMusic(){if(ytPlayer&&!musicPaused){ytPlayer.pauseVideo();}}
function resumeMusic(){if(ytPlayer&&!musicPaused){ytPlayer.playVideo();}}

function changeMusic(){
  const url=document.getElementById('customYtUrl').value.trim();
  if(!url) return;
  const match=url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if(!match){toast('URL YouTube invalide','er');return;}
  const vid=match[1];
  if(ytPlayer){ytPlayer.loadVideoById(vid);ytPlayer.setVolume(currentVolume);document.getElementById('musicTitle').textContent='Musique personnalisée';}
  document.getElementById('customYtUrl').value='';
  toast('Musique changée 🎵','ok');
}
