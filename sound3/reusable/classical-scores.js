import {notation} from './classical-notation.js';
// Historical theme excerpts corrected from user-supplied note data.
// Existing duration-to-beat timing, voices, levels and artwork adapters are retained.
export const classical = [
 {id:'canon',name:'卡農',composer:'Johann Pachelbel',section:'D 大調卡農 · 旋律與固定低音',meter:4},
 {id:'prayer',name:'少女的祈禱',composer:'Tekla Bądarzewska-Baranowska',section:'Op.4 · 開頭選段',meter:4},
 {id:'elise',name:'給愛麗絲',composer:'Ludwig van Beethoven',section:'WoO 59 · 開頭迴旋主題',meter:3},
 {id:'bolero',name:'波萊羅舞曲',composer:'Maurice Ravel',section:'M.81 · 第一主題與三拍節奏',meter:3},
 {id:'can-can',name:'天堂與地獄序曲',composer:'Jacques Offenbach',section:'《地獄中的奧菲歐》· 地獄加洛普',meter:4},
 {id:'turkish',name:'莫札特—土耳其進行曲',composer:'Wolfgang Amadeus Mozart',section:'K.331 · 第三樂章 Alla turca',meter:2},
 {id:'tell',name:'威廉泰爾序曲',composer:'Gioachino Rossini',section:'《Guillaume Tell》序曲 · 終曲快板',meter:2},
 {id:'hungarian',name:'匈牙利舞曲第 5 號',composer:'Johannes Brahms',section:'WoO 1, No.5 · 開頭主題',meter:2}
];
export function theme(id){return classical.find(c=>c.id===id)}
export function themeNotes(id){return notation[id]?.events.filter(e=>e[3]==='melody').flatMap(e=>e[2])||[]}
export function classicalScore(id,duration=32){
 const c=theme(id),score=notation[id];if(!c||!score)return null;
 const total=score.beats,unit=(duration-.45)/total,events=[];let row=0;
 for(const [tick,length,notes,part] of score.events){const beat=tick/score.ppq,t=.12+beat*unit;events.push({t,d:Math.min(Math.max(.05,length/score.ppq*unit),duration-t-.1),notes:[...notes],v:part==='melody'?.34:.16,voice:'piano',part,...(part==='melody'?{row:row++}:{}),beat})}
 // Explicit rests come from gaps in the combined melodic notation, not staccato articulation.
 const spans=score.events.filter(e=>e[3]==='melody').map(e=>[e[0]/score.ppq,(e[0]+e[1])/score.ppq]).sort((a,b)=>a[0]-b[0]);let end=0;
 for(const [start,finish] of [...spans,[total,total]]){if(start-end>=.5)events.push({t:.12+end*unit,d:(start-end)*unit,notes:[],v:0,part:'rest',beat:end});end=Math.max(end,finish)}
 if(id==='bolero')for(let b=0;b<total;b+=3){for(const [offset,length] of [[0,.5],[.5,1/6],[2/3,1/6],[5/6,1/6],[1,.5],[1.5,1/6],[5/3,1/6],[11/6,1/6],[2,.5],[2.5,.5]]){const t=.12+(b+offset)*unit;if(t+.06<duration)events.push({t,d:Math.min(.12,length*unit*.6),notes:[84],v:.09,voice:'drum',part:'rhythm',beat:b+offset})}}
 return events.sort((a,b)=>a.t-b.t);
}
