import {Player} from './audio/player.js';
import {tracks} from './audio/tracks.js';
import {presets} from './presets/registry.js';
import {PresetHost} from './runtime/preset-host.js';
const $=id=>document.getElementById(id),settings={sensitivity:1,smoothing:.45,tempo:0,auto:false};
const player=new Player();let selected=18,busy=false,lastAuto=0,raf=0,lastUI=0,features=null,uploads=[];
const host=new PresetHost($('canvas-host'),player,(preset,work,fallback)=>{
  selected=presets.findIndex(p=>p.id===preset.id);$('preset-name').textContent=preset.name;$('preset-en').textContent=preset.en;
  $('series-label').textContent='SOUND / '+String(preset.series).padStart(2,'0')+' · '+String(preset.index+1).padStart(2,'0');
  $('mapping').textContent=fallback||preset.mapping;$('stage').style.background=work.bg;
  $('stage').style.setProperty('--stage-fg',work.fg);$('stage-notice').hidden=true;status(player.playing?'歌曲繼續播放。已換成「'+preset.name+'」。':'選擇音樂後按播放。切換視覺，歌曲會繼續。');
  document.querySelectorAll('[data-preset]').forEach(el=>{el.classList.toggle('selected',el.dataset.preset===preset.id);el.setAttribute('aria-pressed',String(el.dataset.preset===preset.id));});
  const u=new URL(location);u.searchParams.set('preset',preset.id);history.replaceState(null,'',u);
});
const format=s=>Number.isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'—:—';
function status(s){$('status').textContent=s;}
async function select(index){index=(index+presets.length)%presets.length;busy=true;$('stage-notice').textContent='正在換一種形狀…';$('stage-notice').hidden=false;try{await host.select(presets[index]);lastAuto=player.audio.currentTime;}catch(e){$('stage-notice').textContent='這個視覺暫時無法啟動。可切換其他作品，音樂會繼續。';status(String(e.message||e));}finally{busy=false;}}
function card(p){const b=document.createElement('button');b.className='preset-card';b.dataset.preset=p.id;b.setAttribute('aria-pressed',String(p.id===presets[selected].id));b.setAttribute('aria-label',p.name+'，SOUND '+p.series);const image=document.createElement('span');image.className='preset-image';if(p.preview){const img=document.createElement('img');img.src=p.preview;img.alt=p.name+'的靜態預覽';img.loading='lazy';image.append(img);}const no=document.createElement('span');no.className='card-no';no.textContent='SOUND / '+p.series+' · '+String(p.index+1).padStart(2,'0');image.append(no);const en=document.createElement('span');en.className='tiny-label';en.textContent=p.en;const h=document.createElement('h3');h.textContent=p.name;const meta=document.createElement('span');meta.className='card-renderer';meta.textContent=p.mapping;b.append(image,en,h,meta);b.onclick=()=>{void select(presets.indexOf(p));$('library').close();};return b;}
for(const p of presets)$('preset-grid').append(card(p));
for(const id of ['s1-jelly-wave','s2-03-elastic-ensemble','s4-tides','s4-fossil']){const p=presets.find(p=>p.id===id);if(p)$('featured').append(card(p));}
function open(id){$(id).showModal();}
for(const id of ['library-open','all-open'])$(id).onclick=()=>open('library');
for(const id of ['tracks-open','song-title'])$(id).onclick=()=>open('tracks');
$('settings-open').onclick=()=>open('settings');
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-series]');if(!b)return;const series=Number(b.dataset.series);document.querySelectorAll('[data-series]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));document.querySelectorAll('#preset-grid [data-preset]').forEach(el=>el.hidden=!!series&&presets.find(p=>p.id===el.dataset.preset).series!==series);});
function updateUI(){
  $('song-title').textContent=player.title;
  $('play').textContent=player.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',player.playing?'暫停音樂':'播放音樂');
  $('live-state').textContent=player.audio.ended?'歌曲結束':player.playing?'音樂正在形成畫面':player.audio.currentTime>0?'已暫停':'靜態預展';$('live-state').classList.toggle('live',player.playing);
  const duration=player.audio.duration;$('current').textContent=format(player.audio.currentTime);$('duration').textContent=format(duration);
  $('seek').disabled=!Number.isFinite(duration)||duration<=0;$('seek').max=Number.isFinite(duration)?duration:100;
  if(document.activeElement!==$('seek'))$('seek').value=player.audio.currentTime;
}
async function toggle(){try{if(player.playing)player.pause();else{if(player.audio.ended){player.audio.currentTime=0;host.reset();}await player.play();status('歌曲原樣播放。畫面依頻段能量與起音變化。');}}catch(e){status('音樂無法播放：'+(e.message||e));}updateUI();}
$('play').onclick=()=>void toggle();$('previous').onclick=()=>void select(selected-1);$('next').onclick=()=>void select(selected+1);
$('volume').oninput=e=>player.setVolume(Number(e.target.value)/100);
$('mute').onclick=()=>{player.setMuted(!player.muted);$('mute').textContent=player.muted?'⊘':'♪';$('mute').setAttribute('aria-label',player.muted?'取消靜音':'靜音');$('mute').setAttribute('aria-pressed',String(player.muted));};
$('seek').oninput=e=>{$('current').textContent=format(Number(e.target.value));};
$('seek').onchange=e=>{player.audio.currentTime=Number(e.target.value);host.reset();status('已跳到 '+format(player.audio.currentTime)+'。材料從此處重新形成。');};
for(const name of ['play','pause','ended','loadedmetadata','durationchange','seeked','playing'])player.addEventListener(name,updateUI);
player.addEventListener('trackchange',()=>{host.reset();lastAuto=0;updateUI();});
player.addEventListener('error',()=>{status('音檔無法讀取或解碼。請開啟另一個 MP3；本機測試清單需要從 repository 根目錄啟動伺服器。');updateUI();});
player.addEventListener('waiting',()=>{$('live-state').textContent='等待音訊';});
function playlist(){const list=$('track-list');list.replaceChildren();[...uploads,...tracks].forEach((track,i)=>{const b=document.createElement('button');b.className='track-row';const n=document.createElement('span');n.className='track-number';n.textContent=String(i+1).padStart(2,'0');const title=document.createElement('span');title.className='track-name';title.textContent=track.title;const icon=document.createElement('span');icon.className='track-icon';icon.textContent='↗';b.append(n,title,icon);b.onclick=async()=>{player.load(track.file?URL.createObjectURL(track.file):encodeURI(track.src),track.title,!!track.file);$('tracks').close();await toggle();};list.append(b);});}
playlist();
function files(list){const valid=[...list].filter(f=>f.type.startsWith('audio/')||/\.(mp3|wav|m4a|ogg|flac)$/i.test(f.name));if(!valid.length){status('請選擇 MP3 或瀏覽器支援的音檔。');return;}uploads=valid.map(file=>({title:file.name.replace(/\.[^.]+$/,''),file}));playlist();player.load(URL.createObjectURL(valid[0]),uploads[0].title,true);if($('tracks').open)$('tracks').close();void toggle();}
for(const id of ['file-open','tracks-file'])$(id).onclick=()=>$('file').click();$('file').onchange=e=>{files(e.target.files);e.target.value='';};
let dragDepth=0;window.addEventListener('dragenter',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();dragDepth++;document.body.classList.add('drop-over');}});window.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});window.addEventListener('dragleave',e=>{e.preventDefault();dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)document.body.classList.remove('drop-over');});window.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;document.body.classList.remove('drop-over');files(e.dataTransfer.files);});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('player').requestFullscreen();}catch{status('此瀏覽器無法使用全螢幕。');}};
$('save').onclick=()=>{if(!host.canvas)return;try{const a=document.createElement('a');a.download=host.preset.id+'-'+Math.floor(player.audio.currentTime)+'s.png';a.href=host.canvas.toDataURL('image/png');a.click();status('已保存目前畫面。');}catch{status('目前無法保存畫面。');}};
$('sensitivity').oninput=e=>{settings.sensitivity=Number(e.target.value);$('sensitivity-value').value=settings.sensitivity.toFixed(1);};$('smoothing').oninput=e=>{settings.smoothing=Number(e.target.value);$('smoothing-value').value=Math.round(settings.smoothing*100)+'%';};$('tempo').onchange=e=>settings.tempo=Number(e.target.value);$('auto').onchange=e=>{settings.auto=e.target.checked;lastAuto=player.audio.currentTime;};
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,button')||document.querySelector('dialog[open]'))return;if(e.code==='Space'){e.preventDefault();void toggle();}if(e.key==='ArrowRight')void select(selected+1);if(e.key==='ArrowLeft')void select(selected-1);if(e.key.toLowerCase()==='m')$('mute').click();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&player.playing){player.pause();status('已暫停。回來後按播放繼續。');}});
const meter=$('meter').getContext('2d');
function frame(now){raf=requestAnimationFrame(frame);if(document.hidden)return;try{features=host.tick(now,settings);}catch(e){host.errors.push({id:host.preset?.id,error:String(e)});player.pause();console.error(e);status('這個視覺發生問題，請切換其他作品。');}
  if(now-lastUI>120){lastUI=now;updateUI();meter.clearRect(0,0,200,24);for(let i=0;i<8;i++){const v=features?.bands[i]||0;meter.fillStyle=i<2?'#e77760':i<5?'#7b9b76':'#a297bd';meter.fillRect(i*23,24-v*23,12,Math.max(1,v*23));}if(player.playing&&features?.confidence>.55)$('song-detail').textContent='節奏估測 '+Math.round(features.tempo)+' BPM · 本機分析';else $('song-detail').textContent='依能量與起音反應 · 本機分析';}
  if(settings.auto&&player.playing&&!busy&&player.audio.currentTime-lastAuto>=30)void select(selected+1);
}
const defaultTrack=tracks.find(t=>t.title.includes('Blank'))||tracks[0];if(defaultTrack)player.load(encodeURI(defaultTrack.src),defaultTrack.title);
const initialId=new URLSearchParams(location.search).get('preset');const initial=presets.findIndex(p=>p.id===initialId);await select(initial<0?18:initial);updateUI();raf=requestAnimationFrame(frame);
window.Visualizer={player,host,presets,select:id=>select(typeof id==='number'?id:presets.findIndex(p=>p.id===id)),snapshot:()=>({preset:host.preset?.id,time:player.audio.currentTime,playing:player.playing,energy:features?.energy,bands:features?.bands,onsetId:player.features?.serial,frames:host.frames,materials:host.current?.inspect?.(),errors:host.errors})};
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);host.dispose();player.dispose();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
