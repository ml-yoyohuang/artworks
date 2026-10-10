import {MuseumWorld} from '../../js/world.js?v=entry-random-2';
import {neutralMaterial} from './neutral-material.js?v=1';
import {tintDisc,DISC_PALETTES} from './palette.js?v=4';
const variants=['a','b','c','d','e','f','g','h'],isIridescent=v=>!!DISC_PALETTES[v];
const $=id=>document.getElementById(id),media=matchMedia('(prefers-reduced-motion: reduce)');
let world,variant='b',paused=media.matches,failed=false,initial,view=0;
function failure(message){failed=true;world?.shutdown();$('fallback').hidden=false;$('status').textContent=message+' 已提供入口實際截圖。';for(const b of document.querySelectorAll('button'))b.disabled=true;}
function updatePause(){if(!world)return;world.reduced=paused;world.entryFilm.last=0;$('pause').textContent=paused?'播放動態':'暫停動態';$('pause').setAttribute('aria-pressed',String(paused));$('status').textContent=paused?'動態已暫停；虹彩版仍可拖曳比較輕微視角偏色。':'即時螺旋與形變・每版建議停留 15～20 秒。';world.invalidate();}
try{
 const response=await fetch('../../exhibition.json');if(!response.ok)throw Error('展覽資料載入失敗');const ex=await response.json();for(const w of ex.works)w.preview=new URL(w.preview,new URL('../../',location.href)).href;
 world=new MuseumWorld($('world'),ex,{onWork:()=>{},onStation:()=>{},onPortal:()=>{},onReady:()=>{},onFailure:failure,reduced:paused,entryVariant:'a'});initial=world.snapshot();$('world').tabIndex=0;
 const originalMaterial=world.entryFilm.mesh.material,solid=neutralMaterial();world.resources.push(solid);
 const original=world.disturbEntryFilm.bind(world);world.disturbEntryFilm=time=>{world.entryFilm.mesh.material=originalMaterial;original(time);if(isIridescent(variant))tintDisc(world.entryFilm,time,view,variant);if(variant==='c')world.entryFilm.mesh.material=solid;};
 const tick=world.tick;cancelAnimationFrame(world.raf);world.raf=null;world.tick=now=>{world.yaw=Math.max(initial.yaw-.2,Math.min(initial.yaw+.2,world.yaw));world.pitch=Math.max(initial.pitch-.12,Math.min(initial.pitch+.12,world.pitch));const next=(world.yaw-initial.yaw)/.2+(world.pitch-initial.pitch)/.12*.3;if(next!==view){view=next;if(isIridescent(variant))tintDisc(world.entryFilm,world.entryFilm.elapsed,view,variant);}tick(now);};
 // Museum entrance normally has no keyboard movement; allow only bounded looking in this study.
 $('world').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')world.yaw+=.035;if(e.key==='ArrowRight')world.yaw-=.035;if(e.key==='ArrowUp')world.pitch+=.025;if(e.key==='ArrowDown')world.pitch-=.025;world.invalidate();}});
 function choose(next){variant=next;world.entryFilm.elapsed=0;world.entryFilm.last=0;world.disturbEntryFilm(0);for(const v of variants)$('variant-'+v).setAttribute('aria-pressed',String(next===v));$('description').textContent=next==='c'?'純色膜面：中性霧白 #e1e6e8，暗部偏冷灰；保留形變，減少黃感，移除彩色螺旋與虹彩。':next==='a'?'原始入口配色；所有版本共用相同孔洞、螺旋、形變與觀看位置。':DISC_PALETTES[next].text+' 虹彩隨視角輕微偏移。';world.invalidate();}
 for(const v of variants)$('variant-'+v).onclick=()=>choose(v);$('pause').onclick=()=>{paused=!paused;updatePause();};$('restart').onclick=()=>choose(variant);$('reset-view').onclick=()=>{world.position.fromArray(initial.position);world.yaw=initial.yaw;world.pitch=initial.pitch;world.invalidate();};
 media.addEventListener('change',e=>{paused=e.matches;updatePause();});document.addEventListener('visibilitychange',()=>world.pause(document.hidden));window.addEventListener('pagehide',()=>world.shutdown(),{once:true});
 Object.defineProperty(window,'discColourState',{get:()=>({variant,paused,failed,solidColor:solid.color.getHexString(),solidActive:world.entryFilm?.mesh.material===solid,time:world.entryFilm?.elapsed,pending:world.pendingTextures,scheduled:!!world.raf,view,camera:world.snapshot(),resources:{...world.renderer.info.memory,programs:world.renderer.info.programs?.length}})});
 choose('b');updatePause();
}catch(e){failure(e.message||'無法啟動碟片配色研究。');}
