import type { Simulation } from '../sim';
import { expressTrait, T_SIZE, T_SPEED, T_SENSE } from '../sim/genome';
import type { BirthFeature, ObservedState } from './observer';

/** Read-only session sampling. Retained newborn records only; never reconstruct missing parents. */
export function observe(sim: Simulation, afterTick = sim.tick): ObservedState {
  const types = sim.typeCounts(); let corners = 0, lobes = 0;
  const forms: [Set<number>, Set<number>] = [new Set(),new Set()];
  for (const o of sim.orgs) {
    corners += o.corners; lobes += o.lobes;
    if(o.type===1) forms[0].add(o.corners);
    if(o.type===2) forms[1].add(o.lobes);
  }
  const features: BirthFeature[] = [];
  for (const child of sim.lineage.nodes.values()) {
    if (child.birthTick<=afterTick || child.birthTick>sim.tick || child.gap!==0 || child.type<0) continue;
    const parent = sim.lineage.nodes.get(child.parent);
    if (!parent || parent.type!==child.type) continue;
    const base = {id:child.id,parent:parent.id,tick:child.birthTick,type:child.type};
    if(child.type===1 && child.corners!==parent.corners) features.push({...base,feature:'corners',before:parent.corners,after:child.corners});
    else if(child.type===2 && child.lobes!==parent.lobes) features.push({...base,feature:'lobes',before:parent.lobes,after:child.lobes});
    else if(child.genome && parent.genome) {
      for(const [feature,index] of [['size',T_SIZE],['speed',T_SPEED],['sense',T_SENSE]] as const) {
        const before=expressTrait(index,parent.genome[index]),after=expressTrait(index,child.genome[index]);
        if(Math.abs(after/before-1)>=.15) {features.push({...base,feature,before,after});break;}
      }
    }
  }
  const resource = (r: Float64Array, f: Float64Array, capacity: number) => capacity > 0 ? r.reduce((s,v)=>s+v,0)/(capacity*f.reduce((s,v)=>s+v,0)||1) : null;
  return {seed:sim.cfg.seed,tick:sim.tick,population:sim.orgs.length,types,
    resources:[resource(sim.resource,sim.fertility,sim.env.cellCapacity),resource(sim.resourceB,sim.fertilityB,sim.envB.cellCapacity)],
    births:sim.totalBirths,corners:types[1]?corners/types[1]:null,lobes:types[2]?lobes/types[2]:null,
    features,forms:forms.map(s=>[...s].sort((a,b)=>a-b)) as [number[],number[]]};
}
