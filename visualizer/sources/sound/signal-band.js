export function createScene(canvas,state) {
const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};
const CONFIG={"id": 11, "slug": "signal-band", "title": "交通號誌樂團", "en": "The crossing sings", "bg": "#e4e9e6", "palette": ["#d6624c", "#e7b43d", "#4d896c", "#7589b1"], "bpm": 72, "osc": "triangle", "mode": "signal", "recommended": "bolero", "directInteraction": true};
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

const patterns=['接力','齊步','對話','倒走'],manualLights=Array(15).fill(0);let phrase=0,hovered=-1,lastLight=-1;
function lightCenter(i){const pole=Math.floor(i/3),level=i%3;return[220+pole*140,216+Math.sin(state.time*1.3+pole)*8+level*80];}
function lightAt(){let hit=-1,best=38;for(let i=0;i<15;i++){const [x,y]=lightCenter(i),d=Math.hypot(x-state.x*1000,y-state.y*700);if(d<best){hit=i;best=d;}}return hit;}
function pressLight(i){if(i<0)return;lastLight=i;manualLights[i]=1;const level=i%3,midi=scaleNotes()[[0,3,7][level]];userNote(midi,.8,.2);feedback(`第 ${Math.floor(i/3)+1} 組 · ${['紅燈低音','黃燈中音','綠燈高音'][level]} ${noteName(midi)} · ${patterns[phrase]}編排`);}
const scene={init(){document.querySelector('#pattern').addEventListener('click',()=>{phrase=(phrase+1)%4;document.querySelector('#pattern').textContent='燈光編排：'+patterns[phrase];feedback(`燈光編排 · ${patterns[phrase]} · 音樂繼續，仍可點燈奏音`);requestDraw();});},reset(){manualLights.fill(0);lastLight=-1;},tap(){hovered=lightAt();lastLight=-1;if(hovered>=0)pressLight(hovered);else feedback('直接點紅、黃、綠燈奏低、中、高音；編排用下方按鈕切換');},move(){hovered=lightAt();if(state.held&&hovered>=0&&hovered!==lastLight)pressLight(hovered);},release(){lastLight=-1;},cancel(){lastLight=-1;},leave(){hovered=-1;},inspect(){return{phrase,pattern:patterns[phrase],hovered,manualLights:manualLights.slice(),centers:manualLights.map((_,i)=>lightCenter(i)),notes:[0,3,7].map(i=>scaleNotes()[i])};},update(dt){for(let i=0;i<15;i++)manualLights[i]=Math.max(0,manualLights[i]-dt/1.2);},draw(){const t=state.time;for(let i=0;i<5;i++){const x=220+i*140,y=170+Math.sin(t*1.3+i)*8;line([[x,y+260],[x,555]],INK+'90',5);ellipse(x,558,36,7,INK+'13');rect(x-43,y,86,259,INK,38);for(let k=0;k<3;k++){const base=state.playing?state.musicalTick/192*2:t*state.tempo/60*2,phase=phrase===1?base:phrase===2?base+(i%2)*1.5:phrase===3?-base+i:base+i,delta=((phase-k)%3+3)%3,auto=Math.exp(-Math.pow((delta>1.5?delta-3:delta)*2.6,2))*(state.playing&&state.trackId==='bolero'?clamp(.45+state.energy*2-i*.16,.25,1):1),own=manualLights[i*3+k],glow=Math.max(auto,own>0?.85:0);circle(x,y+46+k*80,29,C[k]+Math.round(45+glow*210).toString(16).padStart(2,'0'));if(glow>.12)circle(x-7,y+40+k*80,7,'#fff7e9'+Math.round(glow*128).toString(16).padStart(2,'0'));if(own>0||hovered===i*3+k){ctx.lineWidth=own>0?4:2;circle(x,y+46+k*80,36,null,own>0?'#fff7e9':C[k]);}}rect(x-17,y+279,34,8,C[i%4],4);text(String(i+1).padStart(2,'0'),x,600,13,INK+'80');}dashed([[145,555],[855,555]]);text('紅：低音 · 黃：中音 · 綠：高音',500,650,17,INK+'a0');}};

scene.react=(f,dt)=>{manualLights.forEach((v,i)=>{manualLights[i]=Math.max(v,[f.low,f.mid,f.high][i%3]*.85);});};
return {scene,config:CONFIG};
}
