export function createScene(canvas,state) {
const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};
const CONFIG={"id": 10, "slug": "metronome-party", "title": "節拍器派對", "en": "Finding the together", "bg": "#f0e1d5", "palette": ["#c86448", "#daae3f", "#728cab", "#9c7da0"], "bpm": 72, "osc": "triangle", "mode": "metro", "recommended": "bolero", "directInteraction": true};
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

let syncAge=0,phase=0,round=0,hovered=-1,lastSelected=-1;const offsets=Array.from({length:6},(_,i)=>i*1.3),flashes=Array(6).fill(0);
function metroAt(){const x=state.x*1000,y=state.y*700;return y>=175&&y<=530?Array.from({length:6},(_,i)=>i).find(i=>Math.abs(x-(175+i*130))<55)??-1:-1;}
function scatter(selected=-1){round++;syncAge=0;lastSelected=selected;for(let i=0;i<6;i++){offsets[i]=(i+round)*1.3+(i===selected?1.8:0);flashes[i]=i===selected?1:0;}feedback(`${selected>=0?'第 '+(selected+1)+' 台先跳了一步 · ':''}重新散開 · 動態運行二十秒後同步，音樂繼續`);requestDraw();}
const scene={init(){document.querySelector('#scatter').addEventListener('click',()=>scatter());},tap(){hovered=metroAt();if(hovered<0){feedback('點一台節拍器，或按「全隊散開」；音樂會繼續演奏');return;}scatter(hovered);userNote(scaleNotes()[hovered],.6,.1);},move(){hovered=metroAt();},leave(){hovered=-1;},update(dt){syncAge=Math.min(20,syncAge+dt);phase+=dt*state.tempo/60*TAU;for(let i=0;i<6;i++)flashes[i]*=Math.exp(-dt*3);},inspect(){return{syncAge,coherence:ease(syncAge/20),phase,round,hovered,lastSelected,offsets:offsets.slice()};},draw(){const coherence=ease(syncAge/20);for(let i=0;i<6;i++){const x=175+i*130,y=510,ang=Math.sin(phase+(1-coherence)*offsets[i])*(.22+state.energy*.2),py=360;ellipse(x,y+28,53,9,INK+'10');ctx.beginPath();ctx.moveTo(x-53,y);ctx.lineTo(x-33,y-230);ctx.quadraticCurveTo(x,y-265,x+33,y-230);ctx.lineTo(x+53,y);ctx.closePath();ctx.fillStyle=C[i%4];ctx.fill();if(i===hovered||flashes[i]>.1){ctx.strokeStyle='#fff6e5';ctx.lineWidth=5;ctx.stroke();}line([[x,y-206],[x,y-30]],'#fff4e780',2);for(let k=0;k<6;k++)line([[x-9,y-40-k*26],[x+9,y-40-k*26]],'#fff4e790',1);const ex=x+Math.sin(ang)*155,ey=py-Math.cos(ang)*155;line([[x,py+80],[ex,ey]],INK,4);ctx.save();ctx.translate(mix(x,ex,.72),mix(py,ey,.72));ctx.rotate(-ang);rect(-10,-12,20,24,'#f3e8d1',3);ctx.restore();circle(x,py+80,13,'#f3e8d1');circle(ex,ey,10,C[i%4]);text(String(i+1).padStart(2,'0'),x,565,11,INK+'75');}}};

return {scene,config:CONFIG};
}
