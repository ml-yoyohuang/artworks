import {tracks} from './catalog.js';
import {classicalScore} from './classical-scores.js';
import {score} from './original-scores.js';
export {tracks};
export function getScore(id,{duration,transpose=0,seed=4172,params={}}={}){
 const track=tracks.find(t=>t.id===id);
 if(!track)throw new RangeError('Unknown track: '+id);
 if(!Number.isFinite(seed))throw new RangeError('seed must be finite');
 if(!Number.isInteger(transpose)||Math.abs(transpose)>36)throw new RangeError('transpose must be an integer from -36 to 36');
 const nativeDuration=track.index===3?(params.fossilDuration??16):track.duration;
 const seconds=duration??nativeDuration;
 if(!Number.isFinite(seconds)||seconds<4||seconds>3600)throw new RangeError('duration must be 4–3600 seconds');
 const data=track.kind==='original'?score(track.index,seed,{...params,fossilDuration:nativeDuration}):{events:classicalScore(id,seconds),walls:null,source:null};
 const ratio=track.kind==='original'?seconds/nativeDuration:1;
 const events=data.events.map(e=>({...e,t:e.t*ratio,d:e.d*ratio,notes:e.notes.map(n=>n+transpose),...(Number.isFinite(e.pitch)?{pitch:e.pitch+transpose}:{})}));
 return {schemaVersion:1,id,name:track.name,kind:track.kind,composer:track.composer,section:track.section??null,duration:seconds,seed,transpose,events,walls:data.walls??null,source:data.source??null};
}
