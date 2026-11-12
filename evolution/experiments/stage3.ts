import { mkdirSync, writeFileSync, readFileSync, renameSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { Simulation, makeConfig, Rng, randomGenome, type ConfigPatch } from '../src/sim';
import { runExperiment, manifestFor, type ExperimentManifest, type ExperimentResult } from '../src/sim/research';

const args = process.argv.slice(2).filter(a => a !== '--'), command = args[0] ?? 'g';
const model = args.includes('--model3') ? 3 : 2;
const quick = args.includes('--quick'), seeds = quick ? [1, 2] : [1, 2, 3];
const ticks = quick ? 1000 : 6000, OUT = 'experiments/results/stage3';
mkdirSync(OUT, { recursive: true });
const abort = new AbortController(); process.on('SIGINT', () => { console.log('Cancelling after current chunk; partial results will be saved.'); abort.abort(); });
const schedule = () => new Promise<void>(resolve => setImmediate(resolve));
const results: any[] = [];
async function saveResults() {
  const path = `${OUT}/${command.replace(/[^a-z0-9-]/gi, '_')}${model === 3 ? '-model3' : ''}${quick ? '-quick' : ''}.json`;
  const data = JSON.stringify({ schema: 1, command, quick, node: process.version, criteria: 'All introduced types >=1 in every recorded sample in final 20% and at endpoint; finite-run persistence only.', results }, null, 1);
  for (let attempt = 0; ; attempt++) {
    try { writeFileSync(`${path}.next`, data); renameSync(`${path}.next`, path); return; }
    catch (err) { if (attempt >= 5) throw err; await new Promise(resolve => setTimeout(resolve, 100)); }
  }
}
function compact(r: ExperimentResult) {
  return { ...r, checkpoints: undefined, history: r.history.filter((s, i, h) => i === 0 || i === h.length - 1 || s.tick % 500 === 0).map(s => ({ tick: s.tick, population: s.population, typePop: s.typePop, resourceA: s.resourceFrac, resourceB: s.resourceFracB, traitMean: s.traitMean, traitGeneVar: s.traitGeneVar, cornerCounts: s.cornerCounts, lobeCounts: s.lobeCounts, totalBirths: s.totalBirths, capHits: s.capHits })), heapUsedMBAtEnd: process.memoryUsage().heapUsed / 1e6 };
}
async function run(m: ExperimentManifest) {
  if (abort.signal.aborted) return;
  const r = await runExperiment(m, { signal: abort.signal, schedule, chunk: 128 });
  results.push(compact(r));
  console.log(`${m.name} seed ${m.config.seed}: ${r.status} t=${r.tick} populations=${r.final.typePop.join('/')} counts C=${r.final.cornerCounts.join('/')} L=${r.final.lobeCounts.join('/')} error=${r.energyRelativeError.toExponential(1)} ${Math.round(r.performance.ticksPerSecond)} ticks/s`);
  if (results.length % 10 === 0 || abort.signal.aborted) await saveResults();
}
function base(seed: number, patch: ConfigPatch = {}) {
  const rng = new Rng(seed + 9000);
  // Ten matched genetic backgrounds, repeated across types; capacity and initial energy match.
  const genomes = Array.from({ length: 10 }, () => Array.from(randomGenome(rng, .5, 1)));
  const cfg = makeConfig({ seed, width: 240, height: 160, maxPopulation: 1000, metrics: { sampleInterval: 100, maxSamples: 256 }, lineageMaxNodes: 3000, founders: { count: 60, genomes }, ...patch, model });
  if (model === 2) delete cfg.minTurnRadius;
  return cfg;
}
const manifest = (name: string, seed: number, duration = ticks, patch: ConfigPatch = {}) => ({ ...manifestFor(name, seed, duration), config: base(seed, patch) });

async function ecology() {
  const mixes: [number, number, number][] = [[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],[1,1,1]];
  for (const [environment, capA, capB] of [['A-rich',16,4],['B-rich',4,16],['mixed',10,10]] as const)
    for (const mix of mixes) for (const seed of seeds) {
      const m = manifest(`G-${environment}-${mix.join('')}`, seed);
      m.config.founders.mix = mix; m.config.env.cellCapacity = capA; m.config.resourceB.cellCapacity = capB;
      await run(m);
    }
  for (const type of [1, 2]) for (const count of (type === 1 ? [3, 8] : [3, 6])) for (const seed of seeds) {
    const m = manifest(`morph-type${type}-count${count}-fixed`, seed);
    m.config.founders.kinds = [{ type, corners: type === 1 ? count : 0, lobes: type === 2 ? count : 0 }];
    m.config.mutation.rate = 0; m.config.morph.corners.mutationRate = 0; m.config.morph.lobes.mutationRate = 0;
    await run(m);
  }
  for (const type of [1, 2]) for (const mutate of [false, true]) for (const seed of seeds) {
    const m = manifest(`morph-type${type}-${mutate ? 'mutable' : 'control'}`, seed);
    m.config.founders.kinds = [{ type, corners: type === 1 ? 5 : 0, lobes: type === 2 ? 4 : 0 }];
    m.config.mutation.rate = 0; m.config.morph.corners.mutationRate = mutate ? .02 : 0; m.config.morph.lobes.mutationRate = mutate ? .02 : 0;
    await run(m);
  }
}
async function controls() {
  for (const seed of seeds) {
    for (const capacity of [5, 15]) { const m = manifest(`A-abundance-${capacity}`, seed); m.config.env.cellCapacity = capacity; m.config.resourceB.cellCapacity = capacity; await run(m); }
    for (const patchiness of [0, .8]) {
      const m = manifest(`B-spatial-${patchiness}`, seed);
      if (patchiness === 0) {
        const reference = new Simulation(m.config);
        const average = (a: Float64Array) => a.reduce((sum, v) => sum + v, 0) / a.length;
        m.config.env.cellCapacity *= average(reference.fertility);
        m.config.resourceB.cellCapacity *= average(reference.fertilityB);
      }
      m.config.patchiness = patchiness; m.config.resourceB.patchiness = patchiness; await run(m);
    }
    for (const intervention of [false, true]) { const m = manifest(`C-change-${intervention}`, seed); if (intervention) m.interventions = [{ tick: Math.floor(ticks / 2), resource: 'A', patch: { regrowthRate: .003, influx: .001 } }, { tick: Math.floor(ticks / 2), resource: 'B', patch: { regrowthRate: .003, influx: .001 } }]; await run(m); }
    for (const flip of [false, true]) { const m = manifest(`D-neutral-${flip}`, seed); if (flip) m.config.founders.genomes = m.config.founders.genomes!.map(g => g.map((v,i) => i === 5 ? v + 3 : i === 6 ? v - 2 : v)); await run(m); }
    for (const rate of [0, .05, .15]) { const m = manifest(`E-mutation-${rate}`, seed); m.config.mutation.rate = rate; m.config.morph.corners.mutationRate = rate === 0 ? 0 : .02; m.config.morph.lobes.mutationRate = rate === 0 ? 0 : .02; await run(m); }
    await run(manifest('F-identical-control', seed));
    await run(manifest('F-identical-control-repeat', seed));
  }
}
async function benchmark() {
  for (const count of [60, 240, 700, 1500]) {
    const cfg = makeConfig({ seed: 123, founders: { count }, model });
    if (model === 2) delete cfg.minTurnRadius;
    const sim = new Simulation(cfg); sim.step(100);
    const startPop = sim.orgs.length, heap0 = process.memoryUsage().heapUsed, start = performance.now(); let updates = 0;
    for (let i = 0; i < 1000; i++) { updates += sim.orgs.length; sim.step(); }
    const ms = performance.now() - start;
    const row = { count, config: sim.cfg, measuredTicks: 1000, ms, ticksPerSecond: 1e6 / ms, organismUpdatesPerSecond: updates * 1000 / ms, startPop, endPop: sim.orgs.length, history: sim.history.length, lineage: sim.lineage.nodes.size, heapGrowthMB: (process.memoryUsage().heapUsed - heap0) / 1e6 };
    results.push(row); console.log(JSON.stringify({ count, ms, startPop, endPop: row.endPop }));
  }
  writeFileSync(`${OUT}/benchmark${model === 3 ? '-model3' : ''}.json`, JSON.stringify({ node: process.version, results }, null, 1));
}
if (command === 'g') await ecology();
else if (command === 'controls') await controls();
else if (command === 'long') for (const seed of seeds) await run(manifest('long-term', seed, quick ? 5000 : 100000));
else if (command === 'benchmark') await benchmark();
else if (command.endsWith('.json')) await run(JSON.parse(readFileSync(command, 'utf8')));
else throw new Error('Use g, controls, long, benchmark, or a manifest .json path');
if (command !== 'benchmark') await saveResults();
console.log(`Saved ${results.length} results (${abort.signal.aborted ? 'cancelled' : 'complete'}) under ${OUT}`);
