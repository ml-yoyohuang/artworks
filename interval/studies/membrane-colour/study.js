import {MuseumWorld} from '../../js/world.js?v=membrane-iridescent-1';
import {colourMaterial} from './material.js?v=1';
const $=id=>document.getElementById(id),media=matchMedia('(prefers-reduced-motion: reduce)');
const descriptions={1:'冰青綠為主，霧紫在局部浮現；寬柔色帶，像未知物質緩慢翻捲。',2:'深灰藍保留大片暗部；青藍、青紫集中於窄光帶，少量洋紅與金色隨色帶浮現。',3:'沿用 02 的配色與光帶；拖曳畫面或用方向鍵時，虹彩會隨視角柔和偏移。可暫停流動，只比較視角。'};
let world,material,variant=1,paused=media.matches,failed=false,initial;
function failure(message){failed=true;world?.shutdown();$('fallback').hidden=false;$('status').textContent=message+' 已提供正式出口截圖。';for(const b of document.querySelectorAll('button'))b.disabled=true;}
function updatePause(){if(!world)return;world.reduced=paused;world.membrane.last=0;$('pause').textContent=paused?'播放動態':'暫停動態';$('pause').setAttribute('aria-pressed',String(paused));$('status').textContent=paused?'流動已暫停；仍可拖曳或用方向鍵比較視角。':'即時程序材質・每版建議停留 15～20 秒。';world.invalidate();}
try{
 const response=await fetch('../../exhibition.json');if(!response.ok)throw Error('展覽資料未能載入');const ex=await response.json();for(const w of ex.works)w.preview=new URL(w.preview,new URL('../../',location.href)).href;
 world=new MuseumWorld($('world'),ex,{onWork:()=>{},onStation:()=>{},onPortal:()=>{},onReady:()=>{},onFailure:failure,reduced:paused});world.build(4);const station=world.stations.at(-1);world.position.fromArray(station.pos);world.lookAt(station.look);initial=world.snapshot();
 material=colourMaterial();world.resources.push(material);world.membrane.mesh.material=material;
 $('world').tabIndex=0;
 const tick=world.tick;cancelAnimationFrame(world.raf);world.raf=null;
 world.tick=now=>{world.yaw=Math.max(initial.yaw-.24,Math.min(initial.yaw+.24,world.yaw));world.pitch=Math.max(initial.pitch-.15,Math.min(initial.pitch+.15,world.pitch));material.uniforms.uView.value.set((world.yaw-initial.yaw)/.24,(world.pitch-initial.pitch)/.15);tick(now);};
 // These controls are for viewing the material only; suppress museum movement keys.
 $('world').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){if(['w','s','a','d','W','S','A','D','Enter'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();}}},true);
 function choose(next){variant=next;material.uniforms.uVariant.value=next;world.membrane.elapsed=0;world.membrane.last=0;world.disturbMembrane(0);for(let i=1;i<=3;i++)$('variant-'+i).setAttribute('aria-pressed',String(next===i));$('description').textContent=descriptions[next];world.invalidate();}
 for(let i=1;i<=3;i++)$('variant-'+i).onclick=()=>choose(i);
 $('pause').onclick=()=>{paused=!paused;updatePause();};$('restart').onclick=()=>choose(variant);$('reset-view').onclick=()=>{world.position.fromArray(initial.position);world.yaw=initial.yaw;world.pitch=initial.pitch;world.invalidate();};
 media.addEventListener('change',e=>{paused=e.matches;updatePause();});document.addEventListener('visibilitychange',()=>world.pause(document.hidden));window.addEventListener('pagehide',()=>world.shutdown(),{once:true});
 Object.defineProperty(window,'colourStudyState',{get:()=>({variant,paused,failed,time:world.membrane?.elapsed,pending:world.pendingTextures,scheduled:!!world.raf,view:material.uniforms.uView.value.toArray(),camera:world.snapshot(),resources:{...world.renderer.info.memory,programs:world.renderer.info.programs?.length}})});
 choose(1);updatePause();
}catch(e){failure(e.message||'無法啟動色光研究。');}
