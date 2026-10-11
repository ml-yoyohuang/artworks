export function createScene(canvas,state) {
const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};
const CONFIG={"id": 5, "slug": "tap-floor", "title": "踢踏地板", "en": "A floor that listens", "bg": "#e9e7d3", "palette": ["#477864", "#eaa04b", "#d5685a", "#6379ae"], "bpm": 144, "osc": "square", "mode": "drum", "recommended": "cancan", "directInteraction": true};
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

const tilePulse=Array(30).fill(0),footprints=Array(30).fill(0);let selected=12,hovered=-1,lastFoot=-1;
function tileCenter(i){const row=Math.floor(i/6),col=i%6;return{x:500+(col-row-1)*67,y:213+(col+row)*36-tilePulse[i]*17};}
function tileAt(){const px=state.x*1000,py=state.y*700;for(let i=29;i>=0;i--){const p=tileCenter(i);if(Math.abs(px-p.x)/63+Math.abs(py-p.y)/33<=1)return i;}return -1;}
function stepOn(i){if(i<0)return;selected=i;lastFoot=i;tilePulse[i]=1;footprints[i]=1;userDrum(i%3);feedback(`第 ${Math.floor(i/6)+1} 排・第 ${i%6+1} 格 · ${['低鼓','小鼓','沙鈴'][i%3]}${state.playing?'':' · 開始聆聽即可敲響'}`);}
const scene={reset(){tilePulse.fill(0);footprints.fill(0);},tap(){hovered=tileAt();lastFoot=-1;if(hovered>=0)stepOn(hovered);else feedback('指向菱形格子，亮框後點一下；按住拖曳可連續踢踏');},move(){hovered=tileAt();if(state.held&&hovered>=0&&hovered!==lastFoot)stepOn(hovered);},release(){lastFoot=-1;},cancel(){lastFoot=-1;},leave(){hovered=-1;},beat(i){tilePulse[(i*7+selected)%30]=1;tilePulse[(i*7+selected+6)%30]=.6;if(state.strong&&state.playing)for(let j=0;j<30;j++)if(j%3===i%3)tilePulse[j]=.8;},update(dt){for(let i=0;i<30;i++){tilePulse[i]*=Math.exp(-dt*4);footprints[i]*=Math.exp(-dt*1.8);}},inspect(){return{selected,hovered,centers:tilePulse.map((_,i)=>tileCenter(i)),footprints:footprints.slice()};},draw(){ellipse(500,550,320,45,INK+'0c');for(let i=0;i<30;i++){const row=Math.floor(i/6),col=i%6,p=tilePulse[i],center=tileCenter(i),x=center.x,y=center.y-33,lift=p*17,c=(row+col)%2?C[0]:'#f5edd8';ctx.beginPath();ctx.moveTo(x-63,y+33);ctx.lineTo(x,y+66);ctx.lineTo(x+63,y+33);ctx.lineTo(x+63,y+47+lift);ctx.lineTo(x,y+80+lift);ctx.lineTo(x-63,y+47+lift);ctx.closePath();ctx.fillStyle=C[0]+'80';ctx.fill();const pts=[[x,y],[x+63,y+33],[x,y+66],[x-63,y+33]];ctx.beginPath();pts.forEach(([a,b],j)=>j?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.closePath();ctx.fillStyle=p>.08?C[(i%3)+1]:c;ctx.fill();ctx.strokeStyle=i===hovered?'#fff9e8':CONFIG.bg;ctx.lineWidth=i===hovered?5:3;ctx.stroke();if(footprints[i]>.08){ctx.lineWidth=3;circle(x,y+33,15,null,'#fff9e8');text(['低','敲','沙'][i%3],x,y+38,13,'#fff9e8');}else circle(x,y+33,p>.1?12*p:2,p>.1?'#fff8e6c0':(row+col)%2?'#f5edd8':C[0]+'55');}}};

return {scene,config:CONFIG};
}
