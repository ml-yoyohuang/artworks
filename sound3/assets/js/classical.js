import {traceEcho} from './echo-geometry.js';
// Hand-entered historical themes, reduced registers and new sparse accompaniments.
// Durations are beats; R denotes a genuine rest. No recordings or sample libraries.
export const classical = [
 {id:'canon',name:'卡農',composer:'Johann Pachelbel',section:'D 大調卡農 · 旋律與固定低音',meter:4,bass:[50,45,47,42,43,38,43,45],melody:'F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:1 F#5:1 A5:1 G5:1 F#5:1 D5:1 F#5:1 E5:1 D5:1 B4:1 D5:1 A5:1 G5:1 B5:1 A5:1 G5:1'},
 {id:'prayer',name:'少女的祈禱',composer:'Tekla Bądarzewska-Baranowska',section:'Op.4 · 主題（省略裝飾音）',meter:4,bass:[44,39,48,39,44,41,46,39],melody:'R:1 Eb5:.333333 Ab5:.333333 C6:.333334 Eb6:.333333 Ab5:.333333 C6:.333334 Eb6:1.5 C6:.5 C6:.75 Bb5:.25 Bb5:.333333 Bb5:.333333 Ab5:.333334 G5:1 G5:1 R:1 R:1 C5:.333333 Eb5:.333333 Ab5:.333334 C6:.333333 Eb6:.333333 G5:.333334 Eb6:1.5 C6:.5 C6:.75 Bb5:.25 Bb5:.333333 Bb5:.333333 Ab5:.333334 G5:1 G5:1 R:1'},
 {id:'elise',name:'給愛麗絲',composer:'Ludwig van Beethoven',section:'WoO 59 · 開頭迴旋主題',meter:3,bass:[45,40,45,48,43,45,40,45],melody:'E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 R:.5 C4:.5 E4:.5 A4:.5 B4:1.5 R:.5 E4:.5 G#4:.5 B4:.5 C5:1.5 R:.5 E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 R:.5 C4:.5 E4:.5 A4:.5 B4:1.5 R:.5 E4:.5 C5:.5 B4:.5 A4:2'},
 {id:'bolero',name:'波萊羅舞曲',composer:'Maurice Ravel',section:'M.81 · 第一主題與三拍節奏',meter:3,bass:[48,43],melody:'C5:2.5 B4:.25 C5:.25 D5:.25 C5:.25 B4:.25 A4:.25 C5:.25 A4:.25 C5:1.5 B4:.25 C5:.25 A4:.25 G4:.25 E4:.25 F4:.25 G4:1.5 E4:.25 F4:.25 G4:.25 A4:.25 G4:.25 F4:.25 E4:.25 D4:.25 E4:.25 D4:.25 C4:1.5 C4:.25 D4:.25 E4:.25 F4:.25 D4:.25 E4:.25 F4:.25 G4:.25 A4:.25 B4:.25 C5:2'},
 {id:'can-can',name:'天堂與地獄序曲',composer:'Jacques Offenbach',section:'《地獄中的奧菲歐》· 地獄加洛普',meter:4,bass:[48,43,48,43,53,48,43,48],melody:'G5:.5 E5:.5 F5:.5 D5:.5 E5:.5 C5:.5 D5:.5 B4:.5 C5:.5 E5:.5 G5:.5 C6:.5 B5:.5 A5:.5 G5:.5 F5:.5 E5:.5 G5:.5 C6:.5 E6:.5 D6:.5 C6:.5 B5:.5 A5:.5 G5:.5 F5:.5 E5:.5 D5:.5 C5:2 R:1 C5:.5 D5:.5 E5:.5 F5:.5 G5:.5 A5:.5 B5:.5 C6:.5 D6:.5 E6:.5 C6:.5 D6:.5 B5:.5 C6:2'},
 {id:'turkish',name:'莫札特—土耳其進行曲',composer:'Wolfgang Amadeus Mozart',section:'K.331 · 第三樂章 Alla turca',meter:2,bass:[45,40,45,40,48,43,48,40],melody:'B4:.25 A4:.25 G#4:.25 A4:.25 C5:.5 R:.5 D5:.25 C5:.25 B4:.25 C5:.25 E5:.5 R:.5 F5:.25 E5:.25 D#5:.25 E5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 C6:1 A5:.5 C6:.5 G5:.5 C6:.5 F5:.5 C6:.5 E5:.5 C6:.5 D5:.5 C6:.5 C5:.5 B4:.25 C5:.25 D5:.5 C5:.5 B4:.5 A4:1'},
 {id:'tell',name:'威廉泰爾序曲',composer:'Gioachino Rossini',section:'《Guillaume Tell》序曲 · 終曲快板',meter:2,bass:[40,47,40,47,45,40,47,40],melody:'B4:.25 B4:.25 B4:.5 B4:.25 B4:.25 B4:.5 B4:.25 B4:.25 E5:.5 F#5:.25 G#5:.25 E5:.5 B4:.25 B4:.25 B4:.5 B4:.25 B4:.25 B4:.5 E5:.25 G#5:.25 B5:1 A5:.25 G#5:.25 F#5:.5 D#5:.25 B4:.25 F#5:.5 A5:.25 G#5:.25 F#5:.5 D#5:.25 B4:.25 E5:1 G#5:.25 F#5:.25 E5:.5 G#5:.25 F#5:.25 E5:.5 B4:.25 B4:.25 B4:.5 B4:.25 B4:.25 E5:1'},
 {id:'hungarian',name:'匈牙利舞曲第 5 號',composer:'Johannes Brahms',section:'WoO 1, No.5 · 開頭主題（移調至 G 小調）',meter:2,bass:[43,50,43,50,46,41,50,43],melody:'D5:.5 G5:1 Bb5:.5 A5:.5 G5:.5 F#5:.5 G5:.5 A5:1 D5:1 D5:.5 G5:1 Bb5:.5 A5:.5 G5:.5 F#5:.5 G5:.5 A5:1 D5:1 Bb5:.5 C6:.5 D6:1 C6:.5 Bb5:.5 A5:.5 Bb5:.5 C6:1 Bb5:.5 A5:.5 G5:1 F#5:.5 G5:.5 A5:1 D5:1 G5:2 R:1'}
];
const pitch=n=>{const m=/^([A-G])([#b]?)(\d)$/.exec(n);return (Number(m[3])+1)*12+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)};
export function theme(id){return classical.find(c=>c.id===id)}
export function themeNotes(id){return theme(id)?.melody.split(' ').filter(n=>!n.startsWith('R:')).map(n=>pitch(n.split(':')[0]))||[]}
export function classicalScore(id,duration=32){
 const c=theme(id);if(!c)return null;
 const items=c.melody.split(' ').map(n=>{const [name,beats]=n.split(':');return {pitch:name==='R'?null:pitch(name),beats:Number(beats)}}),total=items.reduce((s,n)=>s+n.beats,0),unit=(duration-.45)/total,events=[];let beat=0;
 for(const [i,n] of items.entries()){const t=.12+beat*unit,d=n.beats*unit;if(n.pitch!==null)events.push({t,d:Math.max(.05,d*.88),notes:[n.pitch],v:.34,voice:'piano',part:'melody',row:i,beat});else events.push({t,d,notes:[],v:0,part:'rest',beat});beat+=n.beats}
 for(let b=0;b<total;b+=c.meter){const n=c.bass[Math.floor(b/c.meter)%c.bass.length],t=.12+b*unit;events.push({t,d:Math.min(c.meter*unit*.85,duration-t-.1),notes:[n,n+7],v:.16,voice:'piano',part:'bass',beat:b})}
 if(id==='bolero')for(let b=0;b<total;b+=3){for(const [offset,length] of [[0,.5],[.5,1/6],[2/3,1/6],[5/6,1/6],[1,.5],[1.5,1/6],[5/3,1/6],[11/6,1/6],[2,.5],[2.5,.5]]){const t=.12+(b+offset)*unit;if(t+.06<duration)events.push({t,d:Math.min(.12,length*unit*.6),notes:[84],v:.09,voice:'drum',part:'rhythm',beat:b+offset})}}
 return events.sort((a,b)=>a.t-b.t);
}
// Retain each artwork's material rules, rather than adding unrelated background music.
export function adaptClassical(index,id,duration,data,params={}){
 const events=classicalScore(id,duration);if(!events)return data;
 let row=0,axis=0;const mapped=[];
 for(const e of events){const rest=e.part==='rest';if(rest&&index!==2)continue;
  if(index===0){if(rest)continue;mapped.push({...e,kind:e.part==='melody'?'chord':'support',chord:params.chord??Math.floor(e.notes[0]/3)%4,d:params.short?Math.max(.04,e.d*.45):e.d})}
  if(index===1){if(rest)continue;const r=e.part==='melody'?row++:Math.max(0,row-1);mapped.push({...e,kind:e.part==='melody'?'weft':e.part==='bass'?'warp':'knot',row:r,pos:e.notes[0]%16,phrase:Math.floor(e.beat/8)%4,voiceIndex:e.part==='melody'?1:e.part==='bass'?0:2});if(e.part==='melody'&&r%2===0)mapped.push({t:e.t+e.d*.5,d:.07,notes:[84],v:.065,voice:'drum',kind:'knot',row:r,voiceIndex:2})}
  if(index===2)mapped.push({...e,kind:rest?'rest':'tension',axis:axis++,prior:.34,depth:.6});
  if(index===3)mapped.push({...e,kind:e.part==='bass'?'sustain':row++%8===0?'ridge':'grain',sector:(e.notes[0]+row)%16,phrase:Math.floor(e.beat/8)});
  if(index===4&&e.part==='melody')mapped.push({...e,kind:'tide'});
  if(index===5&&e.part==='melody')mapped.push({...e,kind:'breath',pitch:e.notes[0],airy:.18});
  if(index===6&&e.part==='melody'){const pulse=row++,active=4+data.events.filter(n=>n.kind==='partition'&&n.t<=e.t).length;mapped.push({...e,kind:'emission',source:data.source,pulse});for(const echo of traceEcho(data.walls.slice(0,active),data.source,data.source[0]*.013+pulse*.91,e.t)){if(echo.t+echo.d<duration)mapped.push({...echo,notes:[e.notes[0]],pulse})}}
  if(index===7)mapped.push({...e,v:e.part==='melody'?.58:.24,kind:'injection'});
 }
 if(index===2){ // Phrase breaths remain genuinely silent, including accompaniment.
  const rests=events.filter(e=>e.part==='rest');for(const e of mapped)if(e.kind!=='rest'){if(rests.some(r=>e.t>=r.t&&e.t<r.t+r.d))e.v=0;const r=rests.find(r=>r.t>e.t&&r.t<e.t+e.d);if(r)e.d=Math.max(.01,r.t-e.t-.02)}
  if(!rests.length)for(let t=7.7;t<duration;t+=8){for(const e of mapped)if(e.t<t+.65&&e.t+e.d>t){if(e.t>=t)e.v=0;else e.d=Math.max(.01,t-e.t-.02)}mapped.push({t,d:.65,notes:[],v:0,kind:'rest',axis:axis++,prior:.34,depth:.6})}
 }
 if(index===6)mapped.push(...data.events.filter(e=>e.kind==='partition'));
 return {...data,events:mapped.sort((a,b)=>a.t-b.t)};
}
