export function createScene(canvas,state) {
const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};
const CONFIG={"id": 13, "slug": "saw-hills", "title": "鋸齒山丘", "en": "Downhill, uphill", "bg": "#f4e9ce", "palette": ["#e17a50", "#688d76", "#dcb94a", "#6f8cac"], "bpm": 144, "osc": "sawtooth", "mode": "soft", "recommended": "william", "directInteraction": true};
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

let hill={height:190,target:190,jump:0,velocity:0,lastSound:0,lastPitch:-1};
function hillControl(audition=true){const index=scaleIndex(1-state.y),midi=scaleNotes()[index];hill.target=110+(1-state.y)*170;if(state.reduced||state.paused)hill.height=hill.target;if(audition&&(index!==hill.lastPitch||performance.now()-hill.lastSound>150)){hill.lastPitch=index;hill.lastSound=performance.now();userNote(midi,.7,.18);}feedback(`${noteName(midi)} · 山高 ${Math.round((1-state.y)*100)}% · 上高下低${state.playing?'':' · 按「開始聆聽」可奏音'}`);}
const scene={tap(){hillControl(false);hill.jump=Math.max(hill.jump,8);hill.velocity=230;userNote(scaleNotes()[scaleIndex(1-state.y)],.88,.25);if(state.reduced||state.paused)hill.jump=40;},move(){hillControl(state.held);},release(){},inspect(){return{height:hill.height,target:hill.target,jump:hill.jump,pitch:scaleNotes()[scaleIndex(1-state.y)]};},update(dt){hill.height=mix(hill.height,hill.target,1-Math.exp(-dt*12));hill.velocity-=dt*620;hill.jump=Math.max(0,hill.jump+hill.velocity*dt);if(!hill.jump)hill.velocity=0;},draw(){const t=state.time,amp=hill.height;circle(795,158,48,C[2]);for(let layer=2;layer>=0;layer--){ctx.beginPath();ctx.moveTo(80,560);for(let i=0;i<5;i++){const x=80+i*190;ctx.lineTo(x,470-layer*75);ctx.lineTo(x+155,470-layer*75-amp*.55);ctx.lineTo(x+190,470-layer*75);}ctx.lineTo(1020,640);ctx.lineTo(80,640);ctx.closePath();ctx.fillStyle=[C[0],C[1]+'a0',C[2]+'70'][layer];ctx.fill();}const q=(t*.15)%1,section=q*4,seg=Math.floor(section),p=section-seg,x=90+seg*190+p*155,y=470-p*amp*.55-17-hill.jump;ctx.save();ctx.translate(x,y);ctx.rotate(-.43);line([[-22,4],[24,4]],INK,4);circle(0,-42,10,INK);line([[0,-30],[-4,-12],[13,0]],INK,4);line([[-4,-12],[-17,-2]],INK,4);line([[0,-26],[16,-19],[28,-27]],INK,3);line([[-5,-25],[-17,-18]],INK,3);ctx.restore();for(let i=0;i<4;i++)line([[x-30-i*13,y+18+i*4],[x-22-i*13,y+18+i*4]],'#f7eac8',2);}};

scene.react=(f,dt)=>{hill.target=110+f.low*170;};
return {scene,config:CONFIG};
}
