/**
 * Scientific observability. Field definitions live here and in docs/EVOLUTIONARY_METRICS.md.
 * History is bounded: when full, adjacent samples are merged pairwise (interval counters
 * summed, state fields taken from the later sample) and the sampling interval doubles.
 *
 * Three different clocks are reported and must not be confused:
 *   tick            simulation time
 *   totalBirths     number of birth events so far
 *   meanGeneration  lineage depth: birth events between a living organism and its founder
 */
import { N_TRAITS, GENOME_LEN } from './genome';
import { N_TYPES, TYPE_GRAZER, TYPE_GENERALIST } from './config';
import type { Simulation } from './sim';

export interface Sample {
  tick: number;
  /** ticks covered by the interval counters below */
  span: number;
  /** living organisms at `tick` */
  population: number;
  // --- interval counters (events during the last `span` ticks) ---
  births: number;
  deaths: number;
  starved: number; // deaths with energy reaching 0
  hazard: number; // deaths from the age-dependent random hazard
  stillbirths: number; // offspring whose endowment could not pay for their body
  capHits: number; // births suppressed by maxPopulation (artifact indicator)
  /** mean age of the parent at each birth in the interval = generation time (NaN if no births) */
  meanParentAge: number;
  /** mean age at death in the interval (NaN if no deaths) */
  meanDeathAge: number;
  /** lifetime number of offspring of the organisms that died in the interval: mean and variance */
  lrsMean: number;
  lrsVar: number;
  // --- state at `tick` ---
  /** resource A: sum over cells / sum of carrying capacity */
  resourceFrac: number;
  /** resource B: same definition (0 when B has no capacity) */
  resourceFracB: number;
  /** mean of energy / capacity over living organisms */
  meanEnergyFrac: number;
  /** mean realised speed during the last tick */
  meanSpeed: number;
  /** mean / max number of ancestors (birth events) back to a founder */
  meanGeneration: number;
  maxGeneration: number;
  /** birth events since the start of the run (founders and introductions excluded) */
  totalBirths: number;
  /** number of distinct founders with living descendants */
  founderLineages: number;
  /** per-trait mean and sd of expressed trait values, whole population */
  traitMean: number[];
  traitSd: number[];
  /** diversity proxy: variance of raw gene values across the population, averaged over trait loci */
  traitGeneVar: number;
  /** same, averaged over controller loci */
  brainGeneVar: number;
  // --- per ecological type, index = type id ---
  typePop: number[];
  typeEnergyFrac: number[]; // mean energy / capacity (NaN if the type is absent)
  typeSpeed: number[]; // mean realised speed in the last tick
  typeTraitMean: number[][]; // [type][trait] mean expressed trait
  typeBirths: number[]; // interval
  typeDeaths: number[]; // interval
  typeUptakeA: number[]; // interval: energy units of A removed from the grid
  typeUptakeB: number[];
  typeFixedCost: number[]; // interval: maintenance energy paid (basal, speed capacity, sensing, controller)
  typeMoveCost: number[]; // interval: locomotion energy paid
  /** grazers by corner count, generalists by lobe count: index = count, value = organisms */
  cornerCounts: number[];
  lobeCounts: number[];
}

export interface Counters {
  births: number;
  deaths: number;
  starved: number;
  hazard: number;
  stillbirths: number;
  capHits: number;
  parentAgeSum: number;
  deathAgeSum: number;
  lrsSum: number;
  lrsSq: number;
  typeBirths: number[];
  typeDeaths: number[];
  typeUptakeA: number[];
  typeUptakeB: number[];
  typeFixedCost: number[];
  typeMoveCost: number[];
  lastTick: number;
}

const zeros = () => new Array(N_TYPES).fill(0);

export function emptyCounters(tick: number): Counters {
  return {
    births: 0, deaths: 0, starved: 0, hazard: 0, stillbirths: 0, capHits: 0, parentAgeSum: 0, deathAgeSum: 0,
    lrsSum: 0, lrsSq: 0,
    typeBirths: zeros(), typeDeaths: zeros(), typeUptakeA: zeros(), typeUptakeB: zeros(), typeFixedCost: zeros(), typeMoveCost: zeros(),
    lastTick: tick,
  };
}

/** Compute a sample of the current state (does not reset counters). */
export function sampleNow(sim: Simulation): Sample {
  const orgs = sim.orgs;
  const n = orgs.length;
  const c = sim.counters;
  const tm = new Array(N_TRAITS).fill(0);
  const ts = new Array(N_TRAITS).fill(0);
  let e = 0, sp = 0, gen = 0, maxGen = 0;
  const founders = new Set<number>();
  const gSum = new Float64Array(GENOME_LEN);
  const gSq = new Float64Array(GENOME_LEN);
  const typePop = zeros(), typeE = zeros(), typeSp = zeros();
  const typeTrait: number[][] = [0, 1, 2].map(() => new Array(N_TRAITS).fill(0));
  const cornerCounts = new Array(sim.cfg.morph.corners.max + 1).fill(0);
  const lobeCounts = new Array(sim.cfg.morph.lobes.max + 1).fill(0);
  for (const o of orgs) {
    const ef = o.energy / o.ph.capacity;
    e += ef;
    sp += o.speed;
    gen += o.generation;
    if (o.generation > maxGen) maxGen = o.generation;
    founders.add(o.founderId);
    typePop[o.type]++;
    typeE[o.type] += ef;
    typeSp[o.type] += o.speed;
    const tt = typeTrait[o.type];
    for (let i = 0; i < N_TRAITS; i++) {
      const v = o.ph.traits[i];
      tm[i] += v;
      ts[i] += v * v;
      tt[i] += v;
    }
    if (o.type === TYPE_GRAZER) cornerCounts[o.corners]++;
    else if (o.type === TYPE_GENERALIST) lobeCounts[o.lobes]++;
    const g = o.genome;
    for (let i = 0; i < GENOME_LEN; i++) {
      gSum[i] += g[i];
      gSq[i] += g[i] * g[i];
    }
  }
  let tVar = 0, bVar = 0;
  if (n > 0) {
    for (let i = 0; i < N_TRAITS; i++) {
      tm[i] /= n;
      ts[i] = Math.sqrt(Math.max(0, ts[i] / n - tm[i] * tm[i]));
    }
    for (let i = 0; i < GENOME_LEN; i++) {
      const m = gSum[i] / n;
      const v = Math.max(0, gSq[i] / n - m * m);
      if (i < N_TRAITS) tVar += v;
      else bVar += v;
    }
    tVar /= N_TRAITS;
    bVar /= GENOME_LEN - N_TRAITS;
  }
  for (let t = 0; t < N_TYPES; t++) {
    const k = typePop[t];
    typeE[t] = k ? typeE[t] / k : NaN;
    typeSp[t] = k ? typeSp[t] / k : NaN;
    for (let i = 0; i < N_TRAITS; i++) typeTrait[t][i] = k ? typeTrait[t][i] / k : NaN;
  }
  const frac = (res: Float64Array, fert: Float64Array, cellCap: number) => {
    let r = 0, cap = 0;
    for (let i = 0; i < res.length; i++) { r += res[i]; cap += fert[i]; }
    cap *= cellCap;
    return cap > 0 ? r / cap : 0;
  };
  const lrsMean = c.deaths ? c.lrsSum / c.deaths : NaN;
  return {
    tick: sim.tick,
    span: sim.tick - c.lastTick,
    population: n,
    births: c.births,
    deaths: c.deaths,
    starved: c.starved,
    hazard: c.hazard,
    stillbirths: c.stillbirths,
    capHits: c.capHits,
    meanParentAge: c.births ? c.parentAgeSum / c.births : NaN,
    meanDeathAge: c.deaths ? c.deathAgeSum / c.deaths : NaN,
    lrsMean,
    lrsVar: c.deaths ? Math.max(0, c.lrsSq / c.deaths - lrsMean * lrsMean) : NaN,
    resourceFrac: frac(sim.resource, sim.fertility, sim.env.cellCapacity),
    resourceFracB: frac(sim.resourceB, sim.fertilityB, sim.envB.cellCapacity),
    meanEnergyFrac: n ? e / n : 0,
    meanSpeed: n ? sp / n : 0,
    meanGeneration: n ? gen / n : 0,
    maxGeneration: maxGen,
    totalBirths: sim.totalBirths,
    founderLineages: founders.size,
    traitMean: tm,
    traitSd: ts,
    traitGeneVar: tVar,
    brainGeneVar: bVar,
    typePop,
    typeEnergyFrac: typeE,
    typeSpeed: typeSp,
    typeTraitMean: typeTrait,
    typeBirths: c.typeBirths.slice(),
    typeDeaths: c.typeDeaths.slice(),
    typeUptakeA: c.typeUptakeA.slice(),
    typeUptakeB: c.typeUptakeB.slice(),
    typeFixedCost: c.typeFixedCost.slice(),
    typeMoveCost: c.typeMoveCost.slice(),
    cornerCounts,
    lobeCounts,
  };
}

const addArr = (a: number[] | undefined, b: number[] | undefined) => (a && b ? a.map((v, i) => v + b[i]) : b ?? a ?? zeros());

/** Merge adjacent samples pairwise; keeps the later sample's state fields. */
export function decimate(samples: Sample[]): Sample[] {
  const out: Sample[] = [];
  const start = samples.length % 2; // keep an unpaired first sample as is
  if (start) out.push(samples[0]);
  for (let i = start; i + 1 < samples.length; i += 2) {
    const a = samples[i], b = samples[i + 1];
    const births = a.births + b.births, deaths = a.deaths + b.deaths;
    const w = (x: number, n: number) => (n > 0 && x === x && x !== null ? x * n : 0);
    const lrsMean = deaths ? (w(a.lrsMean, a.deaths) + w(b.lrsMean, b.deaths)) / deaths : NaN;
    // pooled second moment -> variance of the merged interval
    const m2 = (s: Sample) => w(s.lrsVar + s.lrsMean * s.lrsMean, s.deaths);
    out.push({
      ...b,
      span: a.span + b.span,
      births,
      deaths,
      starved: a.starved + b.starved,
      hazard: a.hazard + b.hazard,
      stillbirths: a.stillbirths + b.stillbirths,
      capHits: a.capHits + b.capHits,
      meanParentAge: births ? (w(a.meanParentAge, a.births) + w(b.meanParentAge, b.births)) / births : NaN,
      meanDeathAge: deaths ? (w(a.meanDeathAge, a.deaths) + w(b.meanDeathAge, b.deaths)) / deaths : NaN,
      lrsMean,
      lrsVar: deaths ? Math.max(0, (m2(a) + m2(b)) / deaths - lrsMean * lrsMean) : NaN,
      typeBirths: addArr(a.typeBirths, b.typeBirths),
      typeDeaths: addArr(a.typeDeaths, b.typeDeaths),
      typeUptakeA: addArr(a.typeUptakeA, b.typeUptakeA),
      typeUptakeB: addArr(a.typeUptakeB, b.typeUptakeB),
      typeFixedCost: addArr(a.typeFixedCost, b.typeFixedCost),
      typeMoveCost: addArr(a.typeMoveCost, b.typeMoveCost),
    });
  }
  return out;
}

/** Histogram of an expressed trait over the living population (optionally one type). */
export function traitHistogram(sim: Simulation, trait: number, bins: number, min: number, max: number, type = -1): number[] {
  const h = new Array(bins).fill(0);
  for (const o of sim.orgs) {
    if (type >= 0 && o.type !== type) continue;
    const b = Math.floor(((o.ph.traits[trait] - min) / (max - min)) * bins);
    h[Math.min(bins - 1, Math.max(0, b))]++;
  }
  return h;
}

/** Histogram of energy / capacity over the living population. */
export function energyHistogram(sim: Simulation, bins: number): number[] {
  const h = new Array(bins).fill(0);
  for (const o of sim.orgs) h[Math.min(bins - 1, Math.floor((o.energy / o.ph.capacity) * bins))]++;
  return h;
}
