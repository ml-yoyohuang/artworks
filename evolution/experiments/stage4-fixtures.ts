/** Controlled visual QA worlds, not evidence of evolved coexistence. Run after `npm run build`. */
import { mkdirSync,writeFileSync } from 'node:fs';
import { Simulation,makeConfig } from '../src/sim';

mkdirSync('dist/qa',{recursive:true});
for(const [name,count] of [['empty',0],['sparse',9],['crowded',2400]] as const) {
  const sim=new Simulation(makeConfig({seed:17,founders:{count}}));
  writeFileSync(`dist/qa/${name}.json`,JSON.stringify(sim.snapshot()));
  process.stdout.write(`${name}: ${count} founders, tick 0\n`);
}
writeFileSync('dist/qa/corrupt.json','{"format":"evolution-world","version":1,"snapshot":{}}');
