import assert from 'node:assert/strict';
import {classical,classicalScore,themeNotes} from '../assets/js/classical.js';
import {createModel} from '../assets/js/model.js';
import {excavate} from '../assets/js/interaction-model.js';
let checks=0;
for(const c of classical){const events=classicalScore(c.id);assert(events.some(e=>e.part==='melody'));assert(events.some(e=>e.part==='bass'));assert(events.every(e=>e.t>=0&&e.d>0&&e.t+e.d<=32));assert(new Set(themeNotes(c.id)).size>=5);checks+=4;for(let index=0;index<8;index++){const p={soundtrack:c.id,fossilDuration:16,voices:[true,true,true]},m=createModel(index,4172,p),duration=[32,32,24,16,240,14,32,32][index];assert(m.data.events.some(e=>e.notes.length&&e.v>0));assert(m.data.events.every(e=>Number.isFinite(e.t)&&e.d>0&&e.notes.every(Number.isFinite)));for(let t=1/60;t<=Math.min(duration,32)+1e-8;t+=1/60)m.step(1/60,t,duration,index!==3&&index!==5);assert(m.state.material.every(Number.isFinite));if(index===3){assert(m.state.complete);assert(m.state.layers.length>10);assert(excavate(m,0,.5).t<=8)}checks+=index===3?6:3}}
const fast=createModel(3,4172,{fossilDuration:16}),slow=createModel(3,4172,{});for(let t=1/60;t<=32+1e-7;t+=1/60){slow.step(1/60,t,32,false);if(t<=16+1e-7)fast.step(1/60,t,16,false)}assert.deepEqual(fast.state.material,slow.state.material);assert.equal(fast.state.layers.length,slow.state.layers.length);assert.deepEqual(themeNotes('elise').slice(0,9),[76,75,76,75,76,71,74,72,69]);checks+=3;
console.log(JSON.stringify({pass:true,checks,arrangements:8,artworkCombinations:64,fullFossilMaterialPreserved:true}));
