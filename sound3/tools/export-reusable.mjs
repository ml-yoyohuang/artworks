import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {classical} from '../assets/js/classical.js';
import {works} from '../assets/js/catalog.js';
const base=new URL('../',import.meta.url),out=new URL('reusable/',base),read=n=>readFileSync(new URL(n,base),'utf8'),write=(n,s)=>writeFileSync(new URL(n,out),s);
mkdirSync(new URL('scores/',out),{recursive:true});
let classics=read('assets/js/classical.js');classics=classics.replace("import {traceEcho} from './echo-geometry.js';\n",'').split('// Retain each artwork')[0];write('classical-scores.js',classics);
let originals=read('assets/js/model.js').split('export function createModel')[0];originals=originals.slice(originals.indexOf('const CHORDS='));originals=originals.replace(/return adaptClassical\([^\n]+\);/, 'return {events:e.sort((a,b)=>a.t-b.t),walls,source};');write('original-scores.js',"import {noise} from './utils.js';\n// Exact exhibition composition functions; no artwork or DOM dependencies.\n"+originals);
write('utils.js',"export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));\nexport const noise=(n,seed=4172)=>{const x=Math.sin(n*127.1+seed*13.13)*43758.5453;return x-Math.floor(x)};\n");
write('sound-engine.js',read('assets/js/audio.js').replace("from './model.js'","from './utils.js'").split('// Microphone analysis')[0]);
const metadata=[...works.map((w,index)=>({id:'original-'+w.id,name:w.name+' · 原創音源',kind:'original',index,duration:w.duration,loop:w.loop,composer:'SOUND / 3 — Codex for ml-yoyohuang, 2026'})),...classical.map(c=>({id:c.id,name:c.name,kind:'classical-arrangement',duration:32,loop:false,composer:c.composer,section:c.section}))];
write('catalog.json',JSON.stringify(metadata,null,2)+'\n');write('catalog.js','export const tracks = '+JSON.stringify(metadata,null,2)+';\n');write('CREDITS.md',read('MUSIC_CREDITS.md'));
// The self-contained API module is maintained separately, alongside the exported sources.
const {getScore}=await import(new URL('library.js',out));
for(const track of metadata)write('scores/'+track.id+'.json',JSON.stringify(getScore(track.id),null,2)+'\n');
console.log('Exported 8 original scores + 8 historical-theme arrangements, with independent sources and JSON.');
