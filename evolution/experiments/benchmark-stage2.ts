/** CPU-only benchmark; run: npx vite-node experiments/benchmark-stage2.ts */
import { performance } from 'node:perf_hooks';
import { Simulation, makeConfig } from '../src/sim';

const results = [200, 700, 1500, 3000].map(count => {
  const runs = Array.from({ length: 3 }, () => {
    const sim = new Simulation(makeConfig({ seed: 123, founders: { count } }));
    sim.step(30);
    const startPopulation = sim.orgs.length;
    const start = performance.now();
    sim.step(200);
    return { msPerTick: (performance.now() - start) / 200, startPopulation, endPopulation: sim.orgs.length };
  });
  const sorted = runs.map(r => r.msPerTick).sort((a, b) => a - b);
  return { founders: count, medianMsPerTick: sorted[1], runs };
});
console.log(JSON.stringify({ node: process.version, platform: process.platform, seed: 123, warmupTicks: 30, measuredTicks: 200, results }, null, 2));
