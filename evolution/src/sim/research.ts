/** Browser/Node headless experiments. Chunk size changes scheduling, never scientific ticks. */
import { Simulation, type Snapshot } from './sim';
import { makeConfig, type SimConfig, type ConfigPatch } from './config';
import { sampleNow, type Sample } from './metrics';

export type Intervention = { tick: number; resource: 'A' | 'B'; patch: Partial<SimConfig['env']> }
  | { tick: number; introduction: { genome: number[]; x: number; y: number; energyFrac?: number; type?: number; corners?: number; lobes?: number } };
export interface ExperimentManifest {
  version: 1;
  name: string;
  config: SimConfig;
  ticks: number;
  interventions: Intervention[];
  checkpointEvery?: number;
  maxCheckpoints?: number;
}
export interface Discovery {
  tick: number;
  rule: string;
  values: Record<string, number | number[]>;
  limitation: string;
}
export interface ExperimentResult {
  manifest: ExperimentManifest;
  status: 'complete' | 'cancelled';
  tick: number;
  hash: number;
  final: Sample;
  history: Sample[];
  discoveries: Discovery[];
  checkpoints: Snapshot[];
  performance: { ms: number; ticksPerSecond: number; organismUpdates: number; organismUpdatesPerSecond: number; maxPopulation: number; maxLineageNodes: number; historySamples: number };
  energyRelativeError: number;
  persistentTypes: boolean;
}

/** Rule-based observations only, with definitions and supporting numeric values. */
export function detectChanges(a: Sample, b: Sample): Discovery[] {
  const out: Discovery[] = [], limitation = 'Sample-to-sample observation; not evidence of causation, adaptation, or biological speciation.';
  const add = (rule: string, values: Discovery['values']) => out.push({ tick: b.tick, rule, values, limitation });
  if (a.population > 0 && b.population === 0) add('extinction: positive population becomes zero', { before: a.population, after: 0 });
  else if (a.population >= 10 && b.population < a.population * .5) add('population crash: >50% decline between recorded samples', { before: a.population, after: b.population });
  for (let t = 0; t < 3; t++) if (a.typePop?.[t] > 0 && b.typePop?.[t] === 0) add('ecological type extinction: type population becomes zero', { type: t, before: a.typePop[t], after: 0 });
  if (a.population > 1 && b.population > 1 && a.traitGeneVar > .001 && b.traitGeneVar < a.traitGeneVar * .5) add('trait diversity: raw gene variance falls >50% between samples', { before: a.traitGeneVar, after: b.traitGeneVar });
  if (a.founderLineages > 1 && b.founderLineages === 1) add('one founding lineage remains (not a new species)', { before: a.founderLineages, after: 1 });
  return out;
}

export async function runExperiment(manifest: ExperimentManifest, options: { signal?: AbortSignal; progress?: (tick: number, total: number) => void; chunk?: number; schedule?: () => Promise<void> } = {}): Promise<ExperimentResult> {
  if (!Number.isSafeInteger(manifest.ticks) || manifest.ticks < 1 || manifest.ticks > 1e8) throw new Error('Experiment ticks must be an integer in [1, 100000000]');
  if (manifest.version !== 1 || !manifest.name.trim()) throw new Error('Invalid experiment manifest');
  const interventions = manifest.interventions.slice().sort((a, b) => a.tick - b.tick);
  for (const e of interventions) if (!Number.isInteger(e.tick) || e.tick < 0 || e.tick >= manifest.ticks || (!('introduction' in e) && !['A', 'B'].includes(e.resource))) throw new Error('Intervention outside experiment');
  if (manifest.checkpointEvery !== undefined && (!Number.isInteger(manifest.checkpointEvery) || manifest.checkpointEvery < 1)) throw new Error('Invalid checkpoint interval');
  const sim = new Simulation(manifest.config), initial = sim.typeCounts(), discoveries: Discovery[] = [], checkpoints: Snapshot[] = [];
  let previous = sim.history[0], event = 0, updates = 0, maxPop = sim.orgs.length, maxNodes = sim.lineage.nodes.size;
  const started = performance.now(), chunk = Math.max(1, Math.min(256, Math.floor(options.chunk ?? 32)));
  const schedule = options.schedule ?? (() => new Promise<void>(resolve => setTimeout(resolve, 0)));
  const every = manifest.checkpointEvery ?? Infinity, keep = Math.max(0, Math.min(8, manifest.maxCheckpoints ?? 3));
  while (sim.tick < manifest.ticks && !options.signal?.aborted) {
    const until = Math.min(manifest.ticks, sim.tick + chunk);
    while (sim.tick < until) {
      while (event < interventions.length && interventions[event].tick === sim.tick) {
        const e = interventions[event++];
        if ('introduction' in e) { const o = e.introduction; sim.introduce(o.genome, o.x, o.y, o.energyFrac ?? sim.cfg.founders.energyFrac, o); }
        else sim.setEnvironment(e.patch, e.resource);
      }
      updates += sim.orgs.length; sim.step(); maxPop = Math.max(maxPop, sim.orgs.length); maxNodes = Math.max(maxNodes, sim.lineage.nodes.size);
      const last = sim.history[sim.history.length - 1];
      if (last.tick !== previous.tick) { discoveries.push(...detectChanges(previous, last)); previous = last; if (discoveries.length > 500) discoveries.splice(0, discoveries.length - 500); }
      if (keep && sim.tick % every === 0) { checkpoints.push(sim.snapshot()); if (checkpoints.length > keep) checkpoints.shift(); }
      if ((sim.tick & 255) === 0) {
        const error = Math.abs(sim.totalEnergy() - sim.expectedEnergy()) / Math.max(1, sim.totalEnergy());
        if (!Number.isFinite(error) || error > 1e-8 || !sim.orgs.every(o => Number.isFinite(o.energy) && o.genome.every(Number.isFinite))) throw new Error(`Scientific invariant failed at tick ${sim.tick}: ledger error ${error}`);
      }
    }
    options.progress?.(sim.tick, manifest.ticks); await schedule();
  }
  const ms = performance.now() - started, final = sampleNow(sim);
  const tail = sim.history.filter(s => s.tick >= manifest.ticks * .8);
  return {
    manifest: JSON.parse(JSON.stringify(manifest)), status: options.signal?.aborted ? 'cancelled' : 'complete', tick: sim.tick, hash: sim.stateHash(), final, history: sim.history,
    discoveries, checkpoints,
    performance: { ms, ticksPerSecond: sim.tick * 1000 / Math.max(1, ms), organismUpdates: updates, organismUpdatesPerSecond: updates * 1000 / Math.max(1, ms), maxPopulation: maxPop, maxLineageNodes: maxNodes, historySamples: sim.history.length },
    energyRelativeError: Math.abs(sim.totalEnergy() - sim.expectedEnergy()) / Math.max(1, sim.totalEnergy()),
    persistentTypes: sim.tick === manifest.ticks && tail.length >= 2 && initial.every((n, t) => !n || (final.typePop[t] >= 1 && tail.every(s => s.typePop[t] >= 1))),
  };
}

export function manifestFor(name: string, seed: number, ticks: number, patch: ConfigPatch = {}): ExperimentManifest {
  return { version: 1, name, config: makeConfig({ ...patch, seed }), ticks, interventions: [] };
}
