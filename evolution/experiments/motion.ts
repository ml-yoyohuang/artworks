import { writeFileSync } from 'node:fs';
import { Simulation, makeConfig } from '../src/sim';
const results=[];
for(const seed of [1,2,3]) for(const model of [2,3] as const) {
  const cfg=makeConfig({model,seed,width:320,height:240,founders:{count:60}});if(model===2)delete cfg.minTurnRadius;
  const sim=new Simulation(cfg);let slowSpins=0, comparisons=0, minInteriorRadius:number|null=null;
  for(let t=0;t<3000;t++) {
    const before=new Map(sim.orgs.map(o=>[o.id,{x:o.x,y:o.y,h:o.heading}]));sim.step();
    for(const o of sim.orgs) {
      const b=before.get(o.id);if(!b)continue;
      const yaw=Math.abs(Math.atan2(Math.sin(o.heading-b.h),Math.cos(o.heading-b.h)));
      comparisons++;if(o.speed<.03&&yaw>.02)slowSpins++;
      const margin=Math.max(cfg.minTurnRadius??12,o.ph.radius*2)+5;
      if(yaw>1e-8&&o.x>margin&&o.x<cfg.width-margin&&o.y>margin&&o.y<cfg.height-margin&&b.x>margin&&b.x<cfg.width-margin&&b.y>margin&&b.y<cfg.height-margin) {
        const radius=Math.hypot(o.x-b.x,o.y-b.y)/(2*Math.sin(yaw/2));
        minInteriorRadius=minInteriorRadius===null?radius:Math.min(radius,minInteriorRadius);
      }
    }
  }
  const row={model,seed,config:cfg,ticks:sim.tick,finalTypes:sim.typeCounts(),slowSpins,comparisons,minInteriorRadius,energyRelativeError:Math.abs(sim.totalEnergy()-sim.expectedEnergy())/Math.max(1,sim.totalEnergy()),hash:sim.stateHash()};
  results.push(row);console.log(JSON.stringify({model,seed,slowSpins,minInteriorRadius,pop:row.finalTypes}));
}
writeFileSync('experiments/results/stage3/motion-comparison.json',JSON.stringify({definitions:{slowSpin:'requested speed <0.03 world units/tick and actual heading change >0.02 rad/tick',radius:'chord displacement / (2 sin(abs(yaw)/2)), away from clamped boundaries; no claim of stable coexistence'},results},null,1));
