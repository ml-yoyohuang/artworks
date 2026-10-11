import {noise} from './utils.js';
// Exact exhibition composition functions; no artwork or DOM dependencies.
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
 if(index===3){const ratio=(p.fossilDuration??32)/32;for(const event of e){event.t*=ratio;event.d*=ratio}}
 return {events:e.sort((a,b)=>a.t-b.t),walls,source};
}
