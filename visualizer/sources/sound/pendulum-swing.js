export function createScene(canvas,state) {
const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};
const CONFIG={"id": 1, "slug": "pendulum-swing", "title": "彩虹鞦韆", "en": "A chorus of arcs", "bg": "#e7eddf", "palette": ["#dd6148", "#e0af3d", "#6388b0", "#9d75a0"], "bpm": 96, "osc": "triangle", "mode": "soft", "recommended": "canon", "directInteraction": true};
const ctx=canvas.getContext("2d"),C=CONFIG.palette,INK="#303d36",TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mix=(a,b,p)=>a+(b-a)*p,ease=p=>1-Math.pow(1-clamp(p,0,1),3);
const rnd=i=>{const n=Math.sin(i*127.1+CONFIG.id*311.7)*43758.5453;return n-Math.floor(n);};
const interactionSynth=null,musicBus=null;
const setBackingScale=()=>{};
const feedback=()=>{},userNote=()=>{},userPop=()=>{},userDrum=()=>{},requestDraw=()=>{},cancelPhrase=()=>{},playPhrase=()=>{},scaleNotes=()=>[48,50,52,55,57,60,62,64],scaleIndex=v=>Math.round(clamp(v,0,1)*7),noteName=m=>String(m),sceneRef=null;
function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function line(points,color,width=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
function rect(x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function ellipse(x,y,rx,ry,color,rotation=0){ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,0,TAU);ctx.fillStyle=color;ctx.fill();}
function text(str,x,y,size=12,color=INK,align='center'){ctx.fillStyle=color;ctx.font=`400 ${size}px DM, "Avenir Next", sans-serif`;ctx.textAlign=align;ctx.fillText(str,x,y);}
function dashed(points,color=INK+'35'){ctx.setLineDash([4,8]);line(points,color,1);ctx.setLineDash([]);}
function seedTexture(){ctx.fillStyle=INK+'09';for(let i=0;i<440;i++)ctx.fillRect(rnd(i+77)*1000,rnd(i+547)*700,1.5,1.5);}

const swings=Array.from({length:12},(_,i)=>({a:Math.sin(i*.22)*.25,v:0,own:0}));let wind=0,windHeld=false,hover=-1,lastWindNote=-1;
function bob(i){const len=220+i*13,a=swings[i].a;return[170+i*55+Math.sin(a)*len,125+Math.cos(a)*len];}
function swingAt(){let hit=-1,best=40;swings.forEach((s,i)=>{const [x,y]=bob(i),d=Math.hypot(x-state.x*1000,y-state.y*700);if(d<best){hit=i;best=d;}});return hit;}
function setWind(){wind=clamp((state.x*1000-500)/280,-1,1);const idx=scaleIndex((wind+1)/2),midi=scaleNotes()[idx];if(idx!==lastWindNote){userNote(midi,.45+Math.abs(wind)*.4,.2);lastWindNote=idx;}feedback(`風向：${Math.abs(wind)<.08?'無風':wind<0?'向左':'向右'} · 力道 ${Math.round(Math.abs(wind)*100)}% · ${noteName(midi)}`);}
const scene={init(){document.querySelector('#calm-wind').addEventListener('click',()=>{wind=0;lastWindNote=-1;feedback('風停了 · 鞦韆帶著慣性慢慢回到隊形');requestDraw();});},reset(){windHeld=false;},tap(){const y=state.y*700;if(y>570&&y<643){windHeld=true;setWind();return;}const i=swingAt();if(i<0){feedback('點彩色擺錘推一下；下方白圈可左右拖曳送風');return;}const direction=state.x<.5?-1:1;for(let j=Math.max(0,i-1);j<=Math.min(11,i+1);j++){swings[j].v+=direction*(j===i?2:1);swings[j].own=j===i?1:.5;if(state.reduced||state.paused)swings[j].a=clamp(swings[j].a+direction*(j===i?.3:.15),-.65,.65);}const midi=scaleNotes()[i%8];userNote(midi,.85,.22);feedback(`推了第 ${i+1} 座 · ${noteName(midi)} · 鄰座也接到一點風`);},move(){hover=swingAt();if(state.held&&windHeld)setWind();},release(){windHeld=false;},cancel(){windHeld=false;},leave(){hover=-1;},inspect(){return{wind,windHeld,bobs:swings.map((s,i)=>({x:bob(i)[0],y:bob(i)[1],...s})),hover};},update(dt){for(let i=0;i<12;i++){const s=swings[i],len=220+i*13,target=Math.sin(state.time*Math.sqrt(760/len)+i*.22)*.2+wind*.32;s.v+=(target-s.a)*dt*12;s.v*=Math.exp(-dt*1.6);s.a=clamp(s.a+s.v*dt,-.75,.75);s.own=Math.max(0,s.own-dt*.5);}},draw(){for(let r=180;r<420;r+=80){ctx.beginPath();ctx.arc(500,155,r,.15,Math.PI-.15);ctx.strokeStyle=INK+'0d';ctx.stroke();}line([[125,125],[875,125]],INK,3);const points=[];swings.forEach((s,i)=>{const ax=170+i*55,[x,y]=bob(i);line([[ax,125],[x,y]],INK+'70',2);circle(ax,125,4,INK);points.push([x,y]);ellipse(ax,530,22,4,INK+'0b');if(s.own>0||hover===i){ctx.lineWidth=3;circle(x,y,38,null,C[i%4]);}circle(x,y,26+i%3*4,C[i%4]);ctx.beginPath();ctx.arc(x-3,y-3,14,3.5,4.7);ctx.strokeStyle='#fff8e6b0';ctx.lineWidth=3;ctx.stroke();text(String(i+1).padStart(2,'0'),ax,555,11,INK+'80');});line(points,INK+'20',1.5);if(Math.abs(wind)>.08){for(let j=0;j<3;j++){const xx=410+j*70,dx=wind*45;line([[xx,65+j*10],[xx+dx,65+j*10]],C[2]+'80',3);line([[xx+dx-Math.sign(wind)*9,60+j*10],[xx+dx,65+j*10],[xx+dx-Math.sign(wind)*9,70+j*10]],C[2]+'80',2);}}}};

scene.react=(f,dt)=>{swings.forEach((s,i)=>{ s.v += (f.bands[i%8]-.3)*dt*.6; });};
return {scene,config:CONFIG};
}
