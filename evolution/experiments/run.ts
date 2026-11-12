/**
 * Seeded headless experiments. Usage:
 *   npm run exp <baseline|selection|adaptation|envchange|example> [--quick]
 * Results are written to experiments/results/<name>.json and summarised on stdout.
 * See docs/EXPERIMENTS.md for hypotheses and recorded outcomes.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import {
  Simulation, makeConfig, Rng, rawForTrait, TRAITS, N_TRAITS, N_IN, N_HID,
  T_SENSE, T_MARKER_A, type SimConfig, type Sample,
} from '../src/sim';
import exampleConfig from './example.config.json';

const args = process.argv.slice(2).filter((a) => a !== '--');
const which = args[0] ?? 'example';
const quick = args.includes('--quick');
const OUT = 'experiments/results';
mkdirSync(`${OUT}/genomes`, { recursive: true });

/** Smaller arena than the viewer default: same rules, ~400 organisms, faster replicates. */
const arena = (seed: number, patch: any = {}): SimConfig =>
  makeConfig({ seed, width: 640, height: 480, founders: { count: 150 }, ...patch });

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a: number[]) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1)); };
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : 'NaN');

/** Two-sided exact binomial (sign) test p-value for k successes of n at p = 0.5. */
function signP(k: number, n: number): number {
  const c = (n: number, k: number) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
  const tail = Math.min(k, n - k);
  let p = 0;
  for (let i = 0; i <= tail; i++) p += c(n, i);
  return Math.min(1, (2 * p) / 2 ** n);
}

function sampleGenomes(sim: Simulation, n: number, rng: Rng): number[][] {
  const pool = sim.orgs.slice();
  const out: number[][] = [];
  for (let i = 0; i < n && pool.length; i++) out.push(Array.from(pool.splice(rng.int(pool.length), 1)[0].genome));
  return out;
}

const save = (name: string, data: unknown) => writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 1));
const genomeFile = (tag: string) => `${OUT}/genomes/${tag}.json`;

/**
 * Head-to-head competition assay (no mutation): groups A and B start interleaved
 * at equal numbers in a fresh world; returns the final frequency of A among the
 * living (NaN if extinct). Group membership is read from the founder id.
 */
function compete(a: number[][], b: number[][], seed: number, ticks: number, patch: any = {}): { freqA: number; pop: number } {
  const n = Math.min(a.length, b.length);
  const genomes: number[][] = [];
  for (let i = 0; i < n; i++) genomes.push(a[i], b[i]);
  const sim = new Simulation(arena(seed, { mutation: { rate: 0 }, founders: { count: 2 * n, genomes }, ...patch }));
  sim.step(ticks);
  const nA = sim.orgs.filter((o) => (o.founderId - 1) % 2 === 0).length;
  return { freqA: sim.orgs.length ? nA / sim.orgs.length : NaN, pop: sim.orgs.length };
}

function report(label: string, freqs: number[]): object {
  const v = freqs.filter((x) => x === x);
  const wins = v.filter((x) => x > 0.5).length, losses = v.filter((x) => x < 0.5).length;
  const p = signP(wins, wins + losses);
  console.log(`${label}: mean ${f(mean(v))} sd ${f(sd(v))} | >0.5 in ${wins}/${v.length} | sign-test p=${f(p, 4)} | [${v.map((x) => f(x, 2)).join(' ')}]`);
  return { label, freqs, mean: mean(v), sd: sd(v), wins, n: v.length, signP: p };
}

function checkFinite(sim: Simulation): boolean {
  for (const o of sim.orgs) if (![o.x, o.y, o.energy, o.heading].every(Number.isFinite) || !o.genome.every(Number.isFinite)) return false;
  return sim.resource.every(Number.isFinite);
}

// ---------------------------------------------------------------------------
// baseline: long replicate runs. Stability (Test H), replicate consistency of
// trait change vs neutral markers (Tests D/E), genome archives for `adaptation`.
// ---------------------------------------------------------------------------
function baseline() {
  const seeds = quick ? [1, 2] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const ticks = quick ? 20000 : 100000;
  const earlyTick = 5000;
  const runs: any[] = [];
  for (const seed of seeds) {
    const sim = new Simulation(arena(seed));
    const rng = new Rng(seed + 5000);
    const t0 = Date.now();
    let early: Sample | null = null;
    let minPop = Infinity, maxPop = 0, maxNodes = 0, orgSteps = 0;
    const heap0 = process.memoryUsage().heapUsed;
    for (let t = 0; t < ticks; t += 1000) {
      for (let i = 0; i < 1000; i++) { orgSteps += sim.orgs.length; sim.step(); }
      if (sim.tick === earlyTick) {
        early = sim.history[sim.history.length - 1];
        writeFileSync(genomeFile(`base-${seed}-early`), JSON.stringify(sampleGenomes(sim, 120, rng)));
      }
      if (sim.tick >= earlyTick) { minPop = Math.min(minPop, sim.orgs.length); maxPop = Math.max(maxPop, sim.orgs.length); }
      maxNodes = Math.max(maxNodes, sim.lineage.nodes.size);
    }
    writeFileSync(genomeFile(`base-${seed}-late`), JSON.stringify(sampleGenomes(sim, 120, rng)));
    const late = sim.history[sim.history.length - 1];
    const ms = Date.now() - t0;
    const tot = sim.totalEnergy();
    runs.push({
      seed, ticks, extinct: sim.orgs.length === 0, minPop, maxPop, finalPop: sim.orgs.length,
      organismsEverBorn: sim.nextId - 1, meanGeneration: late.meanGeneration,
      generationTime: mean(sim.history.filter((s) => s.tick > earlyTick && s.births > 0).map((s) => s.meanParentAge)),
      founderLineages: late.founderLineages, capHits: sim.history.reduce((a, s) => a + s.capHits, 0),
      finite: checkFinite(sim), energyRelError: Math.abs(tot - sim.expectedEnergy()) / tot,
      maxLineageNodes: maxNodes, historySamples: sim.history.length,
      heapGrowthMB: (process.memoryUsage().heapUsed - heap0) / 1e6,
      ms, nsPerOrganismStep: (ms * 1e6) / orgSteps,
      earlyTraits: early!.traitMean, lateTraits: late.traitMean,
      earlySpeed: early!.meanSpeed, lateSpeed: late.meanSpeed,
      trajectory: sim.history.filter((s) => s.tick % 10000 === 0).map((s) => ({ tick: s.tick, pop: s.population, res: s.resourceFrac, traits: s.traitMean })),
    });
    const r = runs[runs.length - 1];
    console.log(`seed ${seed}: pop ${r.minPop}-${r.maxPop} final ${r.finalPop} gen ${f(r.meanGeneration, 1)} genTime ${f(r.generationTime, 0)} lineages ${r.founderLineages} nodes<=${maxNodes} eErr ${r.energyRelError.toExponential(1)} finite ${r.finite} ${f(r.nsPerOrganismStep, 0)}ns/os ${ms}ms`);
  }
  console.log(`\ntrait change from tick ${earlyTick} to ${ticks} across ${runs.length} replicate seeds:`);
  const traitSummary = TRAITS.map((t, i) => {
    const d = runs.map((r) => r.lateTraits[i] - r.earlyTraits[i]);
    const up = d.filter((x) => x > 0).length;
    const row = { trait: t.name, neutral: t.neutral, earlyMean: mean(runs.map((r) => r.earlyTraits[i])), lateMean: mean(runs.map((r) => r.lateTraits[i])), lateSdAcrossSeeds: sd(runs.map((r) => r.lateTraits[i])), meanDelta: mean(d), increasedIn: up, n: d.length, signP: signP(up, d.length) };
    console.log(`  ${t.name.padEnd(16)} ${f(row.earlyMean)} -> ${f(row.lateMean)} (sd across seeds ${f(row.lateSdAcrossSeeds)})  increased in ${up}/${d.length}  sign-test p=${f(row.signP, 4)}${t.neutral ? '  [neutral]' : ''}`);
    return row;
  });
  save(quick ? 'baseline-quick' : 'baseline', { arena: arena(0), earlyTick, runs, traitSummary });
}

// ---------------------------------------------------------------------------
// selection: constructed single-locus pressure (Test D) with neutral control (Test E)
// ---------------------------------------------------------------------------
function viableGenomes(stockTicks: number): number[][] {
  const file = genomeFile(`selection-stock-${stockTicks}`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const sim = new Simulation(arena(100));
  sim.step(stockTicks);
  const g = sampleGenomes(sim, 100, new Rng(101));
  writeFileSync(file, JSON.stringify(g));
  return g;
}

function selection() {
  const seeds = Array.from({ length: quick ? 4 : 16 }, (_, i) => 200 + i);
  const ticks = quick ? 3000 : 8000;
  const EARLY = 1000;
  const SHORT = 10, LONG = 40;
  const out: any = { ticks, short: SHORT, long: LONG, earlyTick: EARLY, stocks: [] };
  const logit = (p: number, n: number) => { const q = Math.min(1 - 0.5 / n, Math.max(0.5 / n, p)); return Math.log(q / (1 - q)); };
  // Two stocks from the same run (seed 100): sampled after 8k ticks ("young", controllers barely
  // adapted) and after 30k ticks ("old", controllers adapted to the sense range they evolved with).
  for (const stockTicks of quick ? [8000] : [8000, 30000]) {
    const stock = viableGenomes(stockTicks);
    const stockRange = mean(stock.map((g) => TRAITS[T_SENSE].min * Math.pow(TRAITS[T_SENSE].max / TRAITS[T_SENSE].min, 1 / (1 + Math.exp(-g[T_SENSE])))));
    console.log(`
=== stock sampled at tick ${stockTicks} (its own mean senseRange ${f(stockRange, 1)}) ===`);
    // Each stock genome is used 4 times: {short,long} x {marker low, marker high}. The two
    // loci are crossed, so the marker is not linked to the selected allele at the start.
    const genomes: number[][] = [];
    for (const g of stock) for (let k = 0; k < 4; k++) {
      const h = g.slice();
      h[T_SENSE] = rawForTrait(T_SENSE, k % 2 === 0 ? SHORT : LONG);
      h[T_MARKER_A] = rawForTrait(T_MARKER_A, k < 2 ? 0.1 : 0.9);
      genomes.push(h);
    }
    const treatments: any[] = [];
    for (const sensing of [0.002, 0.0004, 0]) {
      const fShort: number[] = [], fMark: number[] = [], sShort: number[] = [], sMark: number[] = [];
      for (const seed of seeds) {
        // shuffle founder order per seed so position / id carry no allele information
        const rng = new Rng(seed * 7 + 1);
        const gs = genomes.slice();
        for (let i = gs.length - 1; i > 0; i--) { const j = rng.int(i + 1); [gs[i], gs[j]] = [gs[j], gs[i]]; }
        const sim = new Simulation(arena(seed, { mutation: { rate: 0 }, founders: { count: gs.length, genomes: gs }, energy: { sensing } }));
        const freq = () => {
          const n = Math.max(1, sim.orgs.length);
          return [sim.orgs.filter((o) => o.ph.traits[T_SENSE] < 20).length / n, sim.orgs.filter((o) => o.ph.traits[T_MARKER_A] > 0.5).length / n, n];
        };
        sim.step(EARLY);
        const [es, em, en] = freq();
        // selection coefficient per 1000 ticks: change of logit frequency from the 0.5 start
        sShort.push(logit(es, en)); sMark.push(logit(em, en));
        sim.step(ticks - EARLY);
        const [ls, lm] = freq();
        fShort.push(sim.orgs.length ? ls : NaN); fMark.push(sim.orgs.length ? lm : NaN);
      }
      console.log(`sensing cost ${sensing} per unit range (default 0.0004), start frequency 0.5:`);
      console.log(`  logit change over first ${EARLY} ticks: short allele ${f(mean(sShort), 2)} ± ${f(sd(sShort), 2)}, marker ${f(mean(sMark), 2)} ± ${f(sd(sMark), 2)}`);
      treatments.push({
        sensing, sShort: { mean: mean(sShort), sd: sd(sShort), values: sShort }, sMarker: { mean: mean(sMark), sd: sd(sMark), values: sMark },
        shortAllele: report(`  short allele freq @${ticks}`, fShort),
        marker: report(`  neutral marker   @${ticks}`, fMark),
      });
    }
    out.stocks.push({ stockTicks, stockRange, treatments });
  }
  save(quick ? 'selection-quick' : 'selection', out);
}

// ---------------------------------------------------------------------------
// adaptation: do evolved populations out-compete their own ancestors? Is the
// controller's sensory input functionally used?
// ---------------------------------------------------------------------------
function lesion(g: number[], inputs: number[]): number[] {
  const h = g.slice();
  for (let hid = 0; hid < N_HID; hid++)
    for (const i of inputs) h[N_TRAITS + hid * (N_IN + 1) + 1 + i] = 0;
  return h;
}

function adaptation() {
  const lines = (quick ? [1, 2] : [1, 2, 3, 4, 5, 6]).filter((s) => existsSync(genomeFile(`base-${s}-late`)));
  if (!lines.length) throw new Error('run `npm run exp baseline` first');
  const worlds = quick ? [1] : [1, 2, 3];
  const ticks = quick ? 3000 : 8000;
  const res: Record<string, number[]> = { evolvedVsAncestor: [], intactVsNoResourceRays: [], intactVsNoBiomassRays: [], intactVsNoExternal: [], control: [] };
  for (const s of lines) {
    const early: number[][] = JSON.parse(readFileSync(genomeFile(`base-${s}-early`), 'utf8')).slice(0, 100);
    const late: number[][] = JSON.parse(readFileSync(genomeFile(`base-${s}-late`), 'utf8')).slice(0, 100);
    for (const w of worlds) {
      const seed = 3000 + s * 10 + w; // new seed => new fertility map: not the map they evolved on
      res.evolvedVsAncestor.push(compete(late, early, seed, ticks).freqA);
      res.intactVsNoResourceRays.push(compete(late, late.map((g) => lesion(g, [0, 1, 2])), seed, ticks).freqA);
      res.intactVsNoBiomassRays.push(compete(late, late.map((g) => lesion(g, [3, 4, 5])), seed, ticks).freqA);
      res.intactVsNoExternal.push(compete(late, late.map((g) => lesion(g, [0, 1, 2, 3, 4, 5, 6])), seed, ticks).freqA);
      res.control.push(compete(late, late, seed, ticks).freqA); // identical groups: pure drift
    }
  }
  console.log(`frequency of group A after ${ticks} ticks (start 0.5), ${lines.length} lines x ${worlds.length} unseen worlds:`);
  const out = Object.entries(res).map(([k, v]) => report(`  ${k.padEnd(24)}`, v));
  save(quick ? 'adaptation-quick' : 'adaptation', { ticks, lines, worlds, results: out });
}

// ---------------------------------------------------------------------------
// envchange: productivity drop at mid-run (Test F), then reciprocal transplant
// ---------------------------------------------------------------------------
function envchange() {
  const seeds = quick ? [21] : [21, 22, 23, 24, 25, 26];
  const phase = quick ? 10000 : 50000;
  const assayTicks = quick ? 3000 : 10000;
  const rich = makeConfig().env;
  const poor = { regrowthRate: rich.regrowthRate * 0.35, influx: rich.influx * 0.35 };
  const runs: any[] = [];
  const home: Record<string, number[]> = { poorLineInPoorEnv: [], poorLineInRichEnv: [] };
  for (const seed of seeds) {
    const sim = new Simulation(arena(seed));
    sim.step(phase);
    const snap = JSON.parse(JSON.stringify(sim.snapshot()));
    const before = sim.history[sim.history.length - 1];
    const R = Simulation.restore(snap), P = Simulation.restore(snap);
    P.setEnvironment(poor);
    let minPopAfter = Infinity;
    for (let t = 0; t < phase; t += 500) { R.step(500); P.step(500); minPopAfter = Math.min(minPopAfter, P.orgs.length); }
    const r = R.history[R.history.length - 1], p = P.history[P.history.length - 1];
    const soon = P.history.find((s) => s.tick >= phase + 3000)!;
    runs.push({ seed, before: { pop: before.population, traits: before.traitMean, speed: before.meanSpeed }, popSoonAfterDrop: soon.population, minPopAfterDrop: minPopAfter,
      richEnd: { pop: r.population, traits: r.traitMean, speed: r.meanSpeed, genTime: r.meanParentAge }, poorEnd: { pop: p.population, traits: p.traitMean, speed: p.meanSpeed, genTime: p.meanParentAge } });
    console.log(`seed ${seed}: pop before ${before.population}; after drop min ${minPopAfter}, end ${p.population}; control end ${r.population}`);
    if (!P.orgs.length || !R.orgs.length) continue;
    const rng = new Rng(seed + 9000);
    const n = Math.min(100, P.orgs.length, R.orgs.length);
    const gp = sampleGenomes(P, n, rng), gr = sampleGenomes(R, n, rng);
    for (const w of quick ? [1] : [1, 2]) {
      const ws = 4000 + seed * 10 + w;
      home.poorLineInPoorEnv.push(compete(gp, gr, ws, assayTicks, { env: poor }).freqA);
      home.poorLineInRichEnv.push(compete(gp, gr, ws, assayTicks).freqA);
    }
  }
  console.log(`\nmean traits at end (rich control vs poor branch), ${runs.length} seeds:`);
  const traitDiff = TRAITS.map((t, i) => {
    const d = runs.map((r) => r.poorEnd.traits[i] - r.richEnd.traits[i]);
    const up = d.filter((x) => x > 0).length;
    const row = { trait: t.name, rich: mean(runs.map((r) => r.richEnd.traits[i])), poor: mean(runs.map((r) => r.poorEnd.traits[i])), poorHigherIn: up, n: d.length, signP: signP(up, d.length) };
    console.log(`  ${t.name.padEnd(16)} rich ${f(row.rich)}  poor ${f(row.poor)}  poor>rich in ${up}/${d.length}  p=${f(row.signP, 4)}`);
    return row;
  });
  console.log(`\nreciprocal transplant, frequency of the poor-evolved line after ${assayTicks} ticks (start 0.5):`);
  const transplant = Object.entries(home).map(([k, v]) => report(`  ${k.padEnd(20)}`, v));
  save(quick ? 'envchange-quick' : 'envchange', { phase, poor, runs, traitDiff, transplant });
}

// ---------------------------------------------------------------------------
// example: run the example configuration and print its history
// ---------------------------------------------------------------------------
function example() {
  const { ticks, ...patch } = exampleConfig as any;
  const sim = new Simulation(makeConfig(patch));
  console.log('tick  pop  resource  generation  ' + TRAITS.map((t) => t.name).join('  '));
  for (let t = 0; t < ticks; t += 2000) {
    sim.step(2000);
    const s = sim.history[sim.history.length - 1];
    console.log([s.tick, s.population, f(s.resourceFrac, 2), f(s.meanGeneration, 1), ...s.traitMean.map((v) => f(v, 2))].join('  '));
  }
  console.log('state hash', sim.stateHash());
}

const t0 = Date.now();
({ baseline, selection, adaptation, envchange, example } as Record<string, () => void>)[which]();
console.log(`\n[${which}] done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
