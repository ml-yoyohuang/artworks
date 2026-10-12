export function createScene(canvas,state) {
const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};
const CONFIG={"id": 4, "slug": "beat-candy", "title": "節拍糖果", "en": "Sweet accumulation", "bg": "#f0e1df", "palette": ["#d85d4f", "#e5b637", "#688aa9", "#9880af"], "bpm": 72, "osc": "triangle", "mode": "drum", "recommended": "bolero", "directInteraction": true};
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

const candies=[];let candyId=0,pouring=false,pourTimer=0,ownCount=0,dropX=500;
function drop(x,y,own=false){const i=candyId++;candies.push({id:i,x:clamp(x,200,800),y,vx:(rnd(i+123)-.5)*60,vy:20,r:20+rnd(i+124)*9,a:rnd(i)*TAU,va:(rnd(i+10)-.5)*3,c:i%4,kind:i%3,own});if(candies.length>72)candies.shift();}
function pour(){dropX=clamp(state.x*1000,210,790);drop(dropX,state.reduced||state.paused?430+rnd(candyId)*95:105,true);ownCount++;const midi=scaleNotes()[scaleIndex((dropX-210)/580)];userNote(midi,.75,.14);feedback(`你撒了 ${ownCount} 顆 · ${noteName(midi)} · 按住連撒，左右移動換落點`);requestDraw();}
function stopPour(){clearInterval(pourTimer);pourTimer=0;pouring=false;}
const scene={init(){for(let i=0;i<38;i++)drop(320+i%9*43+(rnd(i+16)-.5)*20,540-Math.floor(i/9)*42);document.querySelector('#clear-candy').addEventListener('click',()=>{stopPour();candies.length=0;ownCount=0;feedback('盤面清空了 · 自動糖果從下一拍再開始，或按住自己撒');requestDraw();});},reset(){stopPour();},audioStop(){stopPour();},tap(){pouring=true;pour();clearInterval(pourTimer);pourTimer=setInterval(()=>{if(pouring&&state.held&&!document.hidden)pour();else stopPour();},150);},move(){if(pouring)dropX=clamp(state.x*1000,210,790);},release(){stopPour();feedback(`共撒了 ${ownCount} 顆自己的糖果 · 白邊標記，放開就停`);},cancel(){stopPour();},beat(){drop(350+state.x*300,100);if(state.playing&&state.trackId==='bolero'&&state.strong)for(let i=0;i<Math.floor(state.energy*4);i++)drop(280+i*110,100-i*20);},inspect(){return{pouring,ownCount,dropX,candies:candies.map(b=>({...b}))};},update(dt){for(const b of candies){b.vy+=dt*420;b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.va*dt;if(b.y>565-b.r){b.y=565-b.r;b.vy=-Math.abs(b.vy)*.22;b.vx*=.94;b.va*=.85;}if(b.x<170+b.r||b.x>830-b.r){b.x=clamp(b.x,170+b.r,830-b.r);b.vx*=-.7;}}for(let n=0;n<2;n++)for(let i=0;i<candies.length;i++)for(let j=i+1;j<candies.length;j++){const a=candies[i],b=candies[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.1,m=a.r+b.r;if(d<m){const nx=dx/d,ny=dy/d,p=(m-d)*.5;a.x-=nx*p;a.y-=ny*p;b.x+=nx*p;b.y+=ny*p;const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(v<0){a.vx+=v*nx*.6;a.vy+=v*ny*.6;b.vx-=v*nx*.6;b.vy-=v*ny*.6;}}}},draw(){ellipse(500,580,332,21,INK+'10');line([[165,565],[835,565]],INK+'55',2);for(const b of candies){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);if(b.kind===0){rect(-b.r,-b.r,b.r*2,b.r*2,C[b.c],8);rect(-b.r+5,-b.r+5,b.r*2-10,5,'#fff7df65',3);}else if(b.kind===1){ellipse(0,0,b.r*1.12,b.r*.83,C[b.c]);line([[-b.r*.6,-4],[b.r*.6,-4]],'#fff7df80',4);}else{circle(0,0,b.r,C[b.c]);circle(0,0,b.r*.44,CONFIG.bg);}if(b.own){ctx.lineWidth=3;circle(0,0,b.r+5,null,'#fff9ef');}ctx.restore();}}};

return {scene,config:CONFIG};
}
