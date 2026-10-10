export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const mix=(a,b,t)=>a+(b-a)*t;
export const noise=(n,seed=4172)=>{const x=Math.sin(n*127.1+seed*13.13)*43758.5453;return x-Math.floor(x)};
export const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
export function envelope(e,t){const a=t-e.t;if(a<0||a>e.d)return 0;return Math.min(clamp(a/.09),clamp((e.d-a)/Math.min(.35,e.d*.35)))*e.v}
const CHORDS=[[48,55,60,64],[45,52,59,64],[41,53,57,60],[43,50,57,62]];
function note(t,d,notes,v=.3,voice='soft',extra={}){return {t,d,notes:Array.isArray(notes)?notes:[notes],v,voice,...extra}}
export function echoScore(seed,origin=0){
 const walls=[{a:[-3,-3],b:[3,-3]},{a:[3,-3],b:[3,3]},{a:[3,3],b:[-3,3]},{a:[-3,3],b:[-3,-3]}];
 const events=[],source=origin?[1.8,-1.3]:[-1.7,1.2];let active=4;
 for(let k=0;k<8;k++){
  const t=k*4+.25;const angle=k*.91+seed*.013+(origin?1.5:0);let pos=source.slice(),dir=[Math.cos(angle),Math.sin(angle)],distance=0;
  events.push(note(t,.26,57+(k%3)*5,.42,'bell',{kind:'emission',source:source.slice(),pulse:k}));
  for(let bounce=0;bounce<3;bounce++){
   let best=null;
   for(let j=0;j<active;j++){
    const w=walls[j],vx=w.b[0]-w.a[0],vy=w.b[1]-w.a[1],den=dir[0]*vy-dir[1]*vx;if(Math.abs(den)<1e-6)continue;
    const dx=w.a[0]-pos[0],dy=w.a[1]-pos[1],u=(dx*vy-dy*vx)/den,s=(dx*dir[1]-dy*dir[0])/den;
    if(u>.015&&s>=0&&s<=1&&(!best||u<best.u))best={u,j,w};
   }
   if(!best)break;
   const hit=[pos[0]+dir[0]*best.u,pos[1]+dir[1]*best.u];distance+=best.u;
   const returningDistance=distance+Math.hypot(hit[0]-source[0],hit[1]-source[1]);
   events.push(note(t+returningDistance/8,.18,69+(k%3)*5,.32*Math.pow(.56,bounce+1)/(1+returningDistance*.07),'echo',{kind:'echo',wall:best.j,path:[pos.slice(),hit.slice()],distance:returningDistance,travelDistance:distance,bounce,pulse:k}));
   const wx=best.w.b[0]-best.w.a[0],wy=best.w.b[1]-best.w.a[1],wl=Math.hypot(wx,wy),nx=-wy/wl,ny=wx/wl,dot=dir[0]*nx+dir[1]*ny;
   dir=[dir[0]-2*dot*nx,dir[1]-2*dot*ny];pos=[hit[0]+dir[0]*.02,hit[1]+dir[1]*.02];
  }
  // A revealed return creates a partition before the next emission. The next ray
  // is intersected against this enlarged wall set, rather than a fixed delay list.
  if(k<6){const z=-2.2+k*.8;walls.push(k%2?{a:[-.8,z],b:[1.7,z]}:{a:[z,-1.8],b:[z,1.5]});
   const last=events[events.length-1];events.push({t:last.t+.18,d:.01,notes:[],v:0,kind:'partition',wall:active});active++;
  }
 }
 return {events:events.sort((a,b)=>a.t-b.t),walls,source};
}
export function score(index,seed,p={}){
 let e=[];let walls=null,source=null;
 if(index===0){for(let k=0;k<4;k++){const c=CHORDS[p.chord==null?k:Number(p.chord)];e.push(note(k*8+.15,p.short?1.1:6.8,c,.24,'organ',{kind:'chord',chord:p.chord==null?k:Number(p.chord)}));e.push(note(k*8+4.4,1.5,c[2]+12,.12,'bell'))}}
 if(index===1){const melody=[60,64,67,64,62,65,69,65];for(let k=0;k<64;k++){
  const phrase=Math.floor(k/16),pos=k%16,variant=phrase===2?2:0;
  e.push(note(k*.5,.3,melody[(k+variant)%8],.27,'fiber',{kind:'weft',row:k,phrase,pos,voiceIndex:1}));
  if(k%4===0)e.push(note(k*.5,1.75,[36,41,43,41][phrase],.34,'bass',{kind:'warp',row:k,voiceIndex:0}));
  if(k%2===0&&phrase!==3)e.push(note(k*.5+.25,.13,84,.23,'drum',{kind:'knot',row:k,voiceIndex:2}));
 }}
 if(index===2){for(let k=0;k<3;k++){const base=k*8,v=k===1?.6:.25;e.push(note(base+.1,2.8,[43,55,58],v,'dark',{kind:'tension'}));e.push({t:base+3,d:k===1?2.6:.65,notes:[],v:0,kind:'rest',prior:v,axis:k,depth:k===1?.95:.45});if(k!==1)e.push(note(base+4,3.3,[48,55,60],.34,'dark',{kind:'tension'}));else e.push(note(base+5.8,1.3,[41,53,60],.25,'dark',{kind:'tension'}));e.push({t:base+7.4,d:.6,notes:[],v:0,kind:'rest',prior:.34,axis:k+3,depth:.6});}}
 if(index===3){for(let k=0;k<64;k++){const pos=k%16,m=[48,55,60,62,60,55,52,55];e.push(note(k*.5,.36,m[k%8]+(k>=32?5:0),.2+noise(k,seed)*.2,'mineral',{kind:k%8===0?'ridge':'grain',sector:k%16,phrase:Math.floor(k/16)}));if(k%8===0)e.push(note(k*.5,2.9,[36,43],.19,'bass',{kind:'sustain',sector:pos,phrase:Math.floor(k/16)}));}}
 if(index===4){const delta=[1/120,1/80,1/60][Number(p.delta??1)],f=[.25,.25+delta];for(let layer=0;layer<2;layer++)for(let k=0;k<Math.ceil(240*f[layer]);k++)e.push(note((k+(layer?.06:0))/f[layer],1.2,[48,55,60,67][k%4]+layer*7,.22,layer?'tideB':'tideA',{kind:'tide',layer,phase:k}));}
 if(index===5){const demos=[[[.2,4.2,53,.25],[5,3.1,57,.36],[8.8,3.6,null,.3]],[[.2,1.8,62,.35],[2.3,1.4,65,.25],[4,2.5,null,.4],[7,1.8,60,.45],[9.3,2.8,57,.28]],[[.2,3,48,.4],[3.5,3.1,60,.24],[7,4.8,67,.36]]];for(const [t,d,n,v] of demos[Number(p.demo??0)])e.push(note(t,d,n==null?[]:[n],v,n==null?'breath':'voice',{kind:'breath',pitch:n,airy:n==null?.95:.22}));}
 if(index===6){const a=echoScore(seed,Number(p.origin??0));e=a.events;walls=a.walls;source=a.source;}
 if(index===7){for(let k=0;k<48;k++){const t=k*.65,sec=t%32,v=t<6?.2:t<16?.35+(t-6)*.035:t<20?.15:.28;e.push(note(t,.45,[40,47,52,59][k%4],v,'pluck',{kind:'injection'}));if(k%4===0)e.push(note(t,1.3,[40,52],v*.7,'bass',{kind:'injection'}));}}
 return {events:e.sort((a,b)=>a.t-b.t),walls,source};
}
export function createModel(index,seed=4172,params={}){
 const data=score(index,seed,params);
 const s={index,seed,params,time:0,eventCursor:0,eventsSeen:0,cycles:0,chord:0,arch:[0,0,0,0],stability:0,rows:[],knots:[],cuts:[],priorEnergy:0,priorDuration:0,material:Array(96).fill(0),layers:[],breath:[],gallery:[],reveal:Array(data.walls?.length||0).fill(0),paths:[],energy:0,releases:0,releaseTime:-100,locked:false,echoDistances:[],complete:false};
 function resetCycle(){s.eventCursor=0;s.cycles++;if(index===6){s.reveal.fill(0);s.paths=[];s.echoDistances=[]}}
 function onEvent(e,absolute){s.eventsSeen++;
  if(e.kind==='chord')s.chord=e.chord;
  if(index===1){if(e.kind==='weft'){s.rows.push({notes:e.notes,pos:e.pos,phrase:e.phrase,row:e.row,key:e.row+s.cycles*64,voices:(params.voices||[true,true,true]).map((v,i)=>i===2?false:v),variant:e.phrase===2});if(s.rows.length>96)s.rows.shift()}if(e.kind==='knot'&&params.voices?.[2]!==false){const key=e.row+s.cycles*64;s.knots.push(key);const row=s.rows.find(r=>r.key===key);if(row)row.voices[2]=true;if(s.knots.length>96)s.knots.shift()}}
  if(e.kind==='rest'){const prior=s.priorDuration>.01?s.priorEnergy/s.priorDuration:e.prior,depth=clamp(.3+prior+Math.min(.3,s.priorDuration*.075),.25,1.2);s.cuts.push({start:absolute,d:e.d,prior,axis:e.axis+prior*.3,depth});if(s.cuts.length>8)s.cuts.shift();s.priorEnergy=0;s.priorDuration=0}
  if(index===3){const center=(e.sector*6+Math.floor(noise(e.phrase,seed)*4))%96;for(let k=0;k<96;k++){const dist=Math.min((k-center+96)%96,(center-k+96)%96),width=e.kind==='sustain'?15:e.kind==='ridge'?8:3;const amount=Math.exp(-dist*dist/(width*width))*e.v*.11; // Read existing material; the same phrase deepens prior ridges.
    s.material[k]=clamp(s.material[k]+amount*(1+s.material[k]*.2),0,1.6)}s.layers.push({t:absolute,kind:e.kind,pitch:e.notes[0],v:e.v});if(s.layers.length>96)s.layers.shift()}
  if(e.kind==='echo'){s.reveal[e.wall]=Math.max(s.reveal[e.wall],.75);s.paths.push({start:absolute,path:e.path,pulse:e.pulse});if(s.paths.length>24)s.paths.shift();s.echoDistances.push(e.distance);if(s.echoDistances.length>24)s.echoDistances.shift()}
  if(e.kind==='partition')s.reveal[e.wall]=.65;
 }
 function step(dt,time,duration=32,loop=true){
  const cycle=Math.floor(Math.max(0,time-1e-8)/duration),local=loop?time-cycle*duration:time;
  if(loop&&cycle>s.cycles)resetCycle();
  while(s.eventCursor<data.events.length&&data.events[s.eventCursor].t<=local+1e-7){const e=data.events[s.eventCursor++];onEvent(e,e.t+(loop?cycle*duration:0))}
  let active=0;const live=[];for(const e of data.events){const amp=envelope(e,local);if(amp>0){active+=amp;live.push({e,amp})}}
  if(index===2&&active>.015){s.priorEnergy+=active*dt;s.priorDuration+=dt}
  if(index===0){s.stability=mix(s.stability,clamp(active*1.8),1-Math.exp(-dt*1.8));const c=CHORDS[s.chord];for(let k=0;k<4;k++)s.arch[k]=mix(s.arch[k],(c[k]-48)/12,1-Math.exp(-dt*.85));}
  if(index===5&&!s.complete&&local<12.8){if(Math.floor(time*10)>Math.floor(s.time*10)){const l=live.find(x=>x.e.kind==='breath');const prev=s.breath.at(-1);s.breath.push({y:local/12.8,r:l?.amp||.018,twist:l?.e.pitch==null?(prev?.twist||0):((l.e.pitch-48)/12),airy:l?.e.airy??.7});if(s.breath.length>140)s.breath.shift()}}
  if(index===7){const threshold=Number(params.mode??0)===0?.95:1.5;if(s.locked&&time-s.releaseTime>5){s.locked=false;s.energy=.12}if(!s.locked){s.energy=clamp(s.energy+dt*(clamp(active)*.46-.055),0,1.8);if(s.energy>=threshold){s.locked=true;s.releaseTime=time;s.releases++;s.energy=.2}}else s.energy=clamp(s.energy-dt*.025,0,1.8)}
  if(!loop&&time+1e-7>=duration){s.complete=true}
  s.time=time;s.local=local;s.active=active;
 }
 return {state:s,data,step,onEvent};
}
