import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {EnergyModel} from '../sources/sound4/models/energy.js';
import {BeatClock} from '../audio/beat-clock.js';
import {makeMaze,neighbors} from '../sources/sound4/models/echo.js';
import {forwardRoute} from '../runtime/maze-route.js';
const releaseTimes=[];
for(const meter of [3,4]){const e=new EnergyModel('balanced',{beatGated:true}),clock=new BeatClock();e.inject(100);e.advance(.37);assert.equal(e.phase,'charging');assert(e.ready);for(let k=1;k<=meter*3;k++){const t=k*.5;e.advance(t);if(clock.update(t,{quiet:false,onset:true,tempo:120,confidence:1}))e.releaseOnBeat(t);}assert.equal(e.releases,1);assert.equal(e.lastReleaseBeat,.5);releaseTimes.push({meter,time:e.lastReleaseBeat});}
for(let seed=0;seed<100;seed++){const maze=makeMaze(seed),route=forwardRoute(maze,[4,3]);assert(route.length>1);assert.equal(new Set(route.map(String)).size,route.length);for(let i=1;i<route.length;i++)assert(neighbors(maze,route[i-1]).some(c=>String(c)===String(route[i])));}
writeFileSync(new URL('../_qa/beat-route.json',import.meta.url),JSON.stringify({releaseTimes,mazes:100,legalPaths:true,noRevisits:true},null,2));console.log('PASS 3/4 and 4/4 beat-gated release; 100 maze routes use legal corridors and never revisit cells');
