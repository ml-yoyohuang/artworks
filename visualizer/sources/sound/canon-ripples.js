export function createScene(canvas,state) {
const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};
const CONFIG={"id": 9, "slug": "canon-ripples", "title": "輪唱漣漪", "en": "After you, again", "bg": "#e2e9df", "palette": ["#427b79", "#e07951", "#a78ca6", "#ccac44"], "bpm": 96, "osc": "sine", "mode": "canon", "recommended": "canon", "directInteraction": true};
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

const origin=[[280,325],[525,270],[710,425]],sources=origin.map(p=>p.slice()),rings=[];let grabbed=-1,hovered=-1,lastDrop=0,lastPos=[0,0];
function sourceAt(){let hit=-1,best=52;const x=state.x*1000,y=state.y*700;sources.forEach(([sx,sy],i)=>{const d=Math.hypot(x-sx,y-sy);if(d<best){best=d;hit=i;}});return hit;}
function ring(x,y,v,manual=false){rings.push({x,y,v,age:0,manual});if(rings.length>40)rings.shift();}
function sourceNote(i){const midi=scaleNotes()[[0,2,4][i]];userNote(midi,.7,.22);feedback(`第 ${i+1} 聲部 · ${noteName(midi)} · 拖曳移動聲源`);ring(...sources[i],i,true);}
function moveSource(){if(grabbed<0)return;sources[grabbed]=[clamp(state.x*1000,60,940),clamp(state.y*700,100,570)];const p=sources[grabbed];if(Math.hypot(p[0]-lastPos[0],p[1]-lastPos[1])>65&&performance.now()-lastDrop>140){sourceNote(grabbed);lastDrop=performance.now();lastPos=p.slice();}}
const scene={init(){for(let v=0;v<3;v++)for(let k=0;k<4;k++)rings.push({x:sources[v][0],y:sources[v][1],v,age:k*.7+v*.25,manual:false});document.querySelector('#reset-water').addEventListener('click',()=>{sources.forEach((p,i)=>p.splice(0,2,...origin[i]));rings.length=0;grabbed=-1;feedback('三個聲源回到初始位置 · 音樂繼續');requestDraw();});},reset(){rings.length=0;grabbed=-1;},voice(v){ring(...sources[v],v);},beat(i){if(!state.playing)scene.voice(i%3);},tap(){hovered=sourceAt();grabbed=hovered;if(grabbed>=0){lastPos=sources[grabbed].slice();lastDrop=performance.now();moveSource();sourceNote(grabbed);}else{const x=state.x*1000,y=state.y*700,midi=scaleNotes()[scaleIndex((x-80)/840)];ring(x,y,3,true);userNote(midi,.8,.24);feedback(`水滴 · ${noteName(midi)} · 左低右高，點水面立即奏音`);}},move(){hovered=sourceAt();if(state.held)moveSource();},release(){if(grabbed>=0)feedback(`第 ${grabbed+1} 聲部已移到指尖位置 · 點水面另奏一滴水`);grabbed=-1;},cancel(){grabbed=-1;},leave(){hovered=-1;},inspect(){return{sources:sources.map(p=>p.slice()),grabbed,hovered,rings:rings.map(r=>({...r}))};},update(dt){for(const r of rings)r.age+=dt;for(let i=rings.length-1;i>=0;i--)if(rings[i].age>=3.8)rings.splice(i,1);},draw(){ctx.save();ctx.globalCompositeOperation='multiply';for(const r of rings){const radius=20+290*(1-Math.exp(-r.age*.7)),alpha=Math.max(0,1-r.age/3.8);ctx.lineWidth=(r.manual?9:12)*alpha+1;circle(r.x,r.y,radius,null,C[r.v]+Math.round(alpha*(r.manual?220:180)).toString(16).padStart(2,'0'));ctx.lineWidth=1;circle(r.x,r.y,radius+12,null,C[r.v]+'25');if(r.manual)circle(r.x,r.y,6,C[r.v]);}ctx.restore();sources.forEach(([x,y],v)=>{if(v===hovered||v===grabbed){ctx.lineWidth=3;circle(x,y,39,null,C[v]);}circle(x,y,26,C[v]);circle(x-7,y-7,5,'#fff8e6');text(String(v+1),x,y+5,14,'#fff8e6');text(['I · 聲部一','II · 聲部二','III · 聲部三'][v],x,y+48,14,C[v]);});}};

return {scene,config:CONFIG};
}
