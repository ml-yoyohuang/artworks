import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Simulation, makeConfig, GENOME_LEN, N_TRAITS, N_IN, N_HID } from '../src/sim';
import { boundedTurn } from '../src/sim/motion';
import { particleCounts } from '../src/app/anatomy';
import { ObservationJournal, type ObservedState } from '../src/app/observer';

describe('speed-coupled turning', () => {
  it('prevents rotation at rest and respects a minimum radius at low and high speed', () => {
    for (const speed of [0, .001, .1, 1, 4]) for (const turn of [-.5,.5]) {
      const yaw = boundedTurn(turn,speed,12);
      expect(Math.abs(yaw)).toBeLessThanOrEqual(speed/12);
      if (speed === 0) expect(yaw).toBe(0);
      else expect(speed/(2*Math.sin(Math.abs(yaw)/2))).toBeGreaterThanOrEqual(12-1e-10);
    }
  });
  it('applies the constraint in the actual step and preserves v3 JSON continuation', () => {
    const g = new Array(GENOME_LEN).fill(0), turnBias = N_TRAITS+(N_IN+1)*N_HID;
    g[turnBias]=3; g[turnBias+N_HID+1]=-6;
    const sim = new Simulation(makeConfig({ width: 200,height:200,founders:{count:1,mix:[1,0,0],genomes:[g]},life:{maturityAge:1e9} }));
    const o=sim.orgs[0]; o.x=100; o.y=100;
    const before=o.heading; sim.step();
    expect(Math.abs(o.heading-before)).toBeLessThanOrEqual(o.speed/12+1e-12);
    const restored=Simulation.restore(JSON.parse(JSON.stringify(sim.snapshot())));
    sim.step(200);restored.step(200);expect(restored.stateHash()).toBe(sim.stateHash());
  });
  it('still reproduces a published model-2 experiment exactly', () => {
    const data=JSON.parse(readFileSync('experiments/results/stage3/g.json','utf8'));
    const record=data.results.find((r:any)=>r.manifest.name==='G-mixed-111'&&r.manifest.config.seed===1);
    const sim=new Simulation(record.manifest.config);sim.step(record.tick);expect(sim.stateHash()).toBe(record.hash);
  });
});
describe('inherited internal particles', () => {
  it('is repeatable, supports empty and populated lobes, and does not consume scientific state', () => {
    const sim=new Simulation(makeConfig({founders:{count:9}})), before=sim.stateHash();
    const all:number[]=[];
    for(const o of sim.orgs.filter(o=>o.type===2)) {
      const counts=particleCounts(o); expect(counts).toHaveLength(o.lobes);
      expect(particleCounts({...o,id:999} as typeof o)).toEqual(counts);
      all.push(...counts);
    }
    expect(all.every(n=>Number.isInteger(n)&&n>=0&&n<=3)).toBe(true);
    expect(all).toContain(0);expect(all.some(n=>n>1)).toBe(true);expect(sim.stateHash()).toBe(before);
  });
});
const state=(patch:Partial<ObservedState>={}):ObservedState=>({seed:1,tick:9000,population:90,types:[30,30,30],resources:[.7,.6],births:12000,corners:5,lobes:4,...patch});
describe('current-browsing observation journal',()=>{
  it('starts from the current world, waits for cadence, and ignores paused ticks',()=>{
    const j=new ObservationJournal();j.begin(state(),0);
    expect(j.entries).toHaveLength(1);expect(j.entries[0].tick).toBe(9000);
    j.update(state({tick:9001}),59);expect(j.entries).toHaveLength(1);
    j.update(state({tick:9002}),60);expect(j.entries).toHaveLength(2);
    j.update(state({tick:9002}),120);expect(j.entries).toHaveLength(2);
  });
  it('records measured extinctions early without narrating inherited history',()=>{
    const j=new ObservationJournal();j.begin(state(),0);
    j.update(state({tick:9010,population:60,types:[30,30,0]}),10);
    expect(j.entries.at(-1)?.text).toContain('粉橘多瓣型');
    j.update(state({tick:9020,population:0,types:[0,0,0]}),11);
    expect(j.entries.at(-1)?.text).toContain('全滅');
    j.begin(state({tick:100}),12,'回復觀察時點');expect(j.entries.at(-1)?.kind).toBe('start');
    const fresh=new ObservationJournal();expect(fresh.entries).toHaveLength(0);
  });
  it('bounds session storage and skips disabled-world records',()=>{
    const j=new ObservationJournal();j.begin(state(),0,'start',false);expect(j.entries).toHaveLength(0);
    for(let i=0;i<220;i++) j.begin(state({seed:i,tick:i}),i,'new world');
    expect(j.entries).toHaveLength(200);
  });
});
