export function createScene(canvas,state) {
const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};
const CONFIG={"id": 8, "slug": "flower-choir", "title": "合唱的花", "en": "A garden in tune", "bg": "#e9edda", "palette": ["#d66753", "#e4b337", "#7a84bb", "#dd9fba"], "bpm": 96, "osc": "sine", "mode": "choir", "recommended": "canon", "directInteraction": true};
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

const bloom=Array(5).fill(.5);let solo=-1,soloBeats=0,hovered=-1;
function flowerCenter(i){return[215+i*140+Math.sin(state.time*1.7+i)*12+(state.x-.5)*26,310+(i%2)*65];}
function flowerAt(){const x=state.x*1000,y=state.y*700;let hit=-1,best=Infinity;for(let i=0;i<5;i++){const [fx,fy]=flowerCenter(i),d=Math.hypot(x-fx,y-fy);if(d<85&&d<best){hit=i;best=d;}}return hit;}
function ensemble(){interactionSynth?.releaseAll();solo=-1;soloBeats=0;setBackingScale(1);document.querySelector('#all-flowers').disabled=true;feedback('全員合奏 · 點花可邀它獨唱八拍');requestDraw();}
const scene={init(){document.querySelector('#all-flowers').addEventListener('click',ensemble);},reset(){bloom.fill(.2);ensemble();},audioBeat(time){if(solo>=0&&soloBeats<8&&soloBeats>0&&Number.isInteger(soloBeats)){const k=8-soloBeats,midi=scaleNotes()[([0,2,4,3,2,1,4,0][k]+solo)%8]+(solo===4?12:0);scheduledNote(midi,time,Tone.Ticks(Tone.Transport.PPQ*.7).toSeconds(),.8);}},audioStop(){ensemble();},clock(){if(solo<0)return;soloBeats=Math.max(0,soloBeats-.5);if(soloBeats===0)ensemble();else feedback(`第 ${solo+1} 朵獨唱 · 還有 ${Math.ceil(soloBeats)} 拍`);},beat(i){bloom[solo>=0?solo:[0,1,2,3,4,3,2,1][i%8]]=1;},tap(){hovered=flowerAt();if(hovered<0){feedback('點花瓣邀它獨唱，或按「全員合奏」讓大家回來');return;}interactionSynth?.releaseAll();solo=hovered;soloBeats=8;setBackingScale(.18);bloom[solo]=1;document.querySelector('#all-flowers').disabled=false;const midi=scaleNotes()[[0,1,2,4,5][solo]]+(solo===4?12:0);userNote(midi,.8,.4);feedback(`第 ${solo+1} 朵 · ${noteName(midi)} · 獨唱八拍，之後回全員合奏`);},move(){hovered=flowerAt();},leave(){hovered=-1;},update(dt){for(let i=0;i<5;i++)bloom[i]=mix(bloom[i],.2,1-Math.exp(-dt*2));},inspect(){return{solo,soloBeats,hovered,centers:bloom.map((_,i)=>flowerCenter(i)),notes:[0,1,2,4,5].map((i,k)=>scaleNotes()[i]+(k===4?12:0))};},draw(){dashed([[110,565],[890,565]],C[0]+'40');for(let i=0;i<5;i++){const [fx,y]=flowerCenter(i),x=215+i*140,p=bloom[i],r=45+p*22;line([[x,560],[x-9,470],[fx,y]],'#647e55',5);ellipse(x+18,480,30,11,'#8a9c67',-.6);ellipse(x-20,438,27,11,'#647e55',.6);if(i===hovered||i===solo){ctx.lineWidth=i===solo?3:1.5;circle(fx,y,81,null,C[i%4]);}ctx.save();ctx.translate(fx,y);ctx.rotate(Math.sin(state.time*1.4+i)*.12);for(let a=0;a<8;a++){let ang=a/8*TAU;ellipse(Math.cos(ang)*r*.68,Math.sin(ang)*r*.68,r*.6,r*.3,C[i%4],ang);}circle(0,0,21+p*6,i%2?C[0]:'#e4b337');for(let k=0;k<7;k++)circle(Math.cos(k)*13,Math.sin(k)*13,2,INK+'55');ctx.restore();text(noteName(scaleNotes()[[0,1,2,4,5][i]]+(i===4?12:0)),x,603,15,INK+'90');}}};

scene.react=(f,dt)=>{bloom.forEach((v,i)=>{bloom[i]=Math.max(v,f.bands[i]*.9);});};
return {scene,config:CONFIG};
}
