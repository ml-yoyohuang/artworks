export function createScene(canvas,state) {
const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};
const CONFIG={"id": 3, "slug": "bubble-scale", "title": "泡泡音階", "en": "Notes in the air", "bg": "#F4F0DE", "palette": ["#397B9B", "#D97B45", "#9577B2", "#899545"], "bpm": 126, "osc": "sine", "mode": "soft", "recommended": "turkish", "directInteraction": true};
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

const bubbles=[];let lastBlow=0,activeKey=-1;
function addBubble(x,y,index,i,flash=0){const midi=scaleNotes()[index],r=70-index*6;bubbles.push({x,y,r,midi,vx:(rnd(i+20)-.5)*90,vy:-25-(rnd(i+30)*30),c:index%4,flash});if(bubbles.length>28)bubbles.shift();}
function blow(){const index=scaleIndex((state.x*1000-110)/780);activeKey=index;const midi=scaleNotes()[index];addBubble(clamp(state.x*1000,190,810),clamp(state.y*700,190,490),index,state.interaction+bubbles.length,1);lastBlow=performance.now();userNote(midi,.78,.22);feedback(`${noteName(midi)} · ${index===0?'低音，大泡泡':index===7?'高音，小泡泡':'第 '+(index+1)+' 個音'}${state.playing?'':' · 按「開始聆聽」可奏音'}`);}
const scene={init(){for(let i=0;i<14;i++)addBubble(165+rnd(i+1)*665,180+rnd(i+50)*310,i%8,i);},tap:blow,move(){activeKey=scaleIndex((state.x*1000-110)/780);if(state.held&&performance.now()-lastBlow>130)blow();},leave(){activeKey=-1;},release(){},reset(){bubbles.forEach(b=>b.midi=scaleNotes()[clamp(Math.round((70-b.r)/6),0,7)]);},note(midi,velocity){const b=bubbles.find(b=>b.midi%12===midi%12);if(b)b.vy-=velocity*20;},beat(i){if(i%3===0)for(const b of bubbles)b.vy-=8;},inspect(){return{bubbles:bubbles.map(b=>({x:b.x,y:b.y,r:b.r,midi:b.midi})),activeKey};},update(dt){if(state.held&&performance.now()-lastBlow>180)blow();for(const b of bubbles){b.flash*=Math.exp(-dt*3);b.vy-=dt*7;b.vx*=Math.exp(-dt*.12);b.vy*=Math.exp(-dt*.12);b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<95+b.r||b.x>905-b.r){b.x=clamp(b.x,95+b.r,905-b.r);b.vx*=-.9;}if(b.y<115+b.r||b.y>520-b.r){b.y=clamp(b.y,115+b.r,520-b.r);b.vy*=-.9;}}for(let i=0;i<bubbles.length;i++)for(let j=i+1;j<bubbles.length;j++){const a=bubbles[i],b=bubbles[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,m=a.r+b.r;if(d<m){const nx=dx/d,ny=dy/d,p=(m-d)*.5;a.x-=nx*p;a.y-=ny*p;b.x+=nx*p;b.y+=ny*p;const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(v<0){a.vx+=v*nx*.88;a.vy+=v*ny*.88;b.vx-=v*nx*.88;b.vy-=v*ny*.88;}}}},draw(){for(const b of bubbles){ctx.lineWidth=1.7;ctx.save();ctx.globalAlpha=.30;circle(b.x,b.y,b.r,C[b.c]);ctx.restore();circle(b.x,b.y,b.r,null,C[b.c]);ctx.beginPath();ctx.arc(b.x,b.y,b.r*.78,3.5,4.8);ctx.strokeStyle='#fffdf2';ctx.lineWidth=3;ctx.stroke();if(b.flash>.04){ctx.lineWidth=2;circle(b.x,b.y,b.r+7+b.flash*7,null,C[b.c]);}text(noteName(b.midi),b.x,b.y+4,14,C[b.c]);}text('低音 · 大泡泡',110,632,16,INK+'aa','left');text('高音 · 小泡泡',885,632,16,INK+'aa','right');}};

scene.react=(f,dt)=>{for(const e of f.events) addBubble(180+e.band*90,530,e.band,Math.floor(state.time*20),e.strength);};
return {scene,config:CONFIG};
}
