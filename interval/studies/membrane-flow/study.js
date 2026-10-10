import {MuseumWorld} from '../../js/world.js?v=membrane-oil-1';
import {oilMaterial} from './oil-material.js?v=3';

const $=id=>document.getElementById(id),media=matchMedia('(prefers-reduced-motion: reduce)');
let world,variant='b',paused=media.matches,failed=false;
function failure(message){failed=true;world?.shutdown();$('fallback').hidden=false;$('status').textContent=message+' 已提供目前展間的真實截圖。';for(const b of document.querySelectorAll('button'))b.disabled=true;}
function updatePause(){if(!world)return;world.reduced=paused;$('pause').textContent=paused?'播放動態':'暫停動態';$('pause').setAttribute('aria-pressed',String(paused));$('status').textContent=paused?'動態已暫停；可主動播放。':'即時程序材質・建議停留 15～20 秒，再切換 A／B 比較。';world.membrane.last=0;world.invalidate();}
try{
  const response=await fetch('../../exhibition.json');if(!response.ok)throw Error('展覽資料未能載入');
  const exhibition=await response.json(),museumURL=new URL('../../',location.href);
  for(const work of exhibition.works)work.preview=new URL(work.preview,museumURL).href;
  world=new MuseumWorld($('world'),exhibition,{onWork:()=>{},onStation:()=>{},onPortal:()=>{},onReady:()=>{},onFailure:failure,reduced:paused});
  world.membraneStyle='relief';world.build(4);const station=world.stations.at(-1);world.position.fromArray(station.pos);world.lookAt(station.look);
  const originalMaterial=world.membrane.mesh.material,originalDisturb=world.disturbMembrane.bind(world),oil=oilMaterial();world.resources.push(oil);
  world.disturbMembrane=time=>{if(variant==='a')originalDisturb(time);else oil.uniforms.uTime.value=time;};
  function choose(next){variant=next;const m=world.membrane;m.elapsed=0;m.last=0;m.mesh.material=next==='a'?originalMaterial:oil;
    if(next==='b'){const points=m.mesh.geometry.attributes.position;for(let i=0;i<points.count;i++)points.setZ(i,0);points.needsUpdate=true;m.mesh.geometry.computeVertexNormals();}
    world.disturbMembrane(0);world.invalidate();
    $('variant-a').setAttribute('aria-pressed',String(next==='a'));$('variant-b').setAttribute('aria-pressed',String(next==='b'));
    $('description').textContent=next==='a'?'原先展間版本：幾何表面起伏，光照形成移動的亮斑。':'表面接近平整，低彩度色澤在局部翻捲、滲合；四周保持安靜。';
  }
  $('variant-a').onclick=()=>choose('a');$('variant-b').onclick=()=>choose('b');$('pause').onclick=()=>{paused=!paused;updatePause();};$('restart').onclick=()=>choose(variant);
  choose('b');updatePause();$('status').textContent=paused?'已尊重減少動態設定；可主動播放。':'即時程序材質・建議停留 15～20 秒，再切換 A／B 比較。';
  media.addEventListener('change',e=>{paused=e.matches;updatePause();});document.addEventListener('visibilitychange',()=>world?.pause(document.hidden));
  window.addEventListener('pagehide',()=>world?.shutdown(),{once:true});
  Object.defineProperty(window,'membraneStudyState',{get:()=>({variant,paused,failed,time:world?.membrane?.elapsed,pending:world?.pendingTextures,camera:world?.snapshot(),resources:world?{...world.renderer.info.memory,programs:world.renderer.info.programs?.length}:null,scheduled:!!world?.raf,flat:world?.membrane?.mesh.geometry.attributes.position.array.every((v,i)=>i%3!==2||v===0)})});
}catch(error){failure(error.message||'無法啟動即時對照。');}
