import {GrowthRhythm} from '../audio/growth-rhythm.js';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
function run(bpm,energy=.8){const clock=new GrowthRhythm();let distance=0,beat=-1;for(let t=0;t<40;t+=.02){const n=Math.floor(t*bpm/60+1e-6),onset=n!==beat;beat=n;distance+=clock.update({onset,energy,rms:.1,quiet:false},.02)*.02;}return {distance,rate:clock.rate,bpm:clock.bpm};}
const slow=run(60),normal=run(120),fast=run(180),loud=run(60,1),soft=run(60,.1);
assert(fast.distance>normal.distance&&normal.distance>slow.distance*1.8);assert(loud.distance/soft.distance<1.12);
const c=new GrowthRhythm();assert.equal(c.update({quiet:true,rms:0},.1),0);const state=JSON.stringify(c);assert.equal(c.update({rms:.1},0),0);assert.equal(JSON.stringify(c),state);
const report={slow,normal,fast,loud,soft};writeFileSync(new URL('../_qa/growth-rhythm.json',import.meta.url),JSON.stringify(report,null,2));console.log('PASS slow/normal/fast cadence, minor volume influence, silence and pause');
