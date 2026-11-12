import { describe,it,expect } from 'vitest';
import { Simulation,makeConfig } from '../src/sim';
import { makeRecord,openRecord } from '../src/app/world-record';
import { soundState } from '../src/app/sound';

describe('durable observation records',()=>{
  it('preserves scientific continuation and names while excluding session commentary',()=>{
    const sim=new Simulation(makeConfig({seed:42,founders:{count:12}}));sim.step(120);
    const before=sim.stateHash(),o=sim.orgs[0];
    const record=makeRecord(sim,'午後的水域',[{id:o.id,name:'小杏',type:o.type,birthTick:o.birthTick}]);
    expect(sim.stateHash()).toBe(before);expect(record).not.toHaveProperty('journal');
    const restored=openRecord(JSON.parse(JSON.stringify(record)));
    expect(restored.name).toBe('午後的水域');expect(restored.favourites[0].name).toBe('小杏');
    expect(restored.sim.stateHash()).toBe(before);
    sim.step(300);restored.sim.step(300);expect(restored.sim.stateHash()).toBe(sim.stateHash());
  });
  it('opens older plain snapshots and rejects corrupt records before touching a live world',()=>{
    const sim=new Simulation(makeConfig({seed:7,founders:{count:3}}));const before=sim.stateHash();
    expect(openRecord(sim.snapshot()).sim.stateHash()).toBe(before);
    const corrupt=JSON.parse(JSON.stringify(makeRecord(sim,'水域',[])));corrupt.hash^=1;
    expect(()=>openRecord(corrupt)).toThrow(/校驗/);
    const malformed=makeRecord(sim,'水域',[{id:1,name:'<b>小杏</b>',type:0,birthTick:0}]);
    malformed.favourites.push({...malformed.favourites[0]});
    expect(()=>openRecord(malformed)).toThrow(/收藏/);expect(sim.stateHash()).toBe(before);
  });
});
describe('read-only ambient mapping',()=>{
  it('maps actual type counts, motion and stocks without consuming scientific randomness',()=>{
    const sim=new Simulation(makeConfig({founders:{count:12,mix:[1,2,1]}})),before=sim.stateHash();
    const s=soundState(sim);
    expect(s.mix).toEqual([.25,.5,.25]);expect(s.movement).toBe(0);
    expect(s.food).toBeGreaterThan(0);expect(s.food).toBeLessThanOrEqual(1);expect(s.density).toBeCloseTo(12/1800);
    expect(sim.stateHash()).toBe(before);
    const empty=new Simulation(makeConfig({founders:{count:0},env:{cellCapacity:0},resourceB:{cellCapacity:0}}));
    expect(soundState(empty)).toEqual({density:0,movement:0,food:0,mix:[0,0,0]});
  });
});
