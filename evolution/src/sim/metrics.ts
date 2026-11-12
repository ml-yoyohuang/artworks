/**
 * Scientific observability. Every field's definition is given here and in
 * docs/EVOLUTION_MODEL.md. History is bounded: when full, adjacent samples
 * are merged pairwise (interval counts summed) and the interval doubles.
 */
import { N_TRAITS, GENOME_LEN } from './genome';
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
  // --- state at `tick` ---
  /** sum of resource over all cells / sum of carrying capacity */
  resourceFrac: number;
  /** mean of energy / capacity over living organisms */
  meanEnergyFrac: number;
  /** mean realised speed during the last tick */
  meanSpeed: number;
  /** mean / max number of ancestors (birth events) back to a founder */
  meanGeneration: number;
  maxGeneration: number;
  /** number of distinct founders with living descendants */
  founderLineages: number;
  /** per-trait mean and sd of expressed phenotype values */
  traitMean: number[];
  traitSd: number[];
  /** diversity proxy: variance of raw gene values across the population, averaged over trait loci */
  traitGeneVar: number;
  /** same, averaged over controller loci */
  brainGeneVar: number;
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
  lastTick: number;
}

export function emptyCounters(tick: number): Counters {
  return { births: 0, deaths: 0, starved: 0, hazard: 0, stillbirths: 0, capHits: 0, parentAgeSum: 0, deathAgeSum: 0, lastTick: tick };
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
  for (const o of orgs) {
    e += o.energy / o.ph.capacity;
    sp += o.speed;
    gen += o.generation;
    if (o.generation > maxGen) maxGen = o.generation;
    founders.add(o.founderId);
    for (let i = 0; i < N_TRAITS; i++) {
      const v = o.ph.traits[i];
      tm[i] += v;
      ts[i] += v * v;
    }
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
  let res = 0, cap = 0;
  for (let i = 0; i < sim.resource.length; i++) {
    res += sim.resource[i];
    cap += sim.fertility[i];
  }
  cap *= sim.env.cellCapacity;
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
    resourceFrac: cap > 0 ? res / cap : 0,
    meanEnergyFrac: n ? e / n : 0,
    meanSpeed: n ? sp / n : 0,
    meanGeneration: n ? gen / n : 0,
    maxGeneration: maxGen,
    founderLineages: founders.size,
    traitMean: tm,
    traitSd: ts,
    traitGeneVar: tVar,
    brainGeneVar: bVar,
  };
}

/** Merge adjacent samples pairwise; keeps the later sample's state fields. */
export function decimate(samples: Sample[]): Sample[] {
  const out: Sample[] = [];
  const start = samples.length % 2; // keep an unpaired first sample as is
  if (start) out.push(samples[0]);
  for (let i = start; i + 1 < samples.length; i += 2) {
    const a = samples[i], b = samples[i + 1];
    const births = a.births + b.births, deaths = a.deaths + b.deaths;
    const w = (x: number, n: number) => (n > 0 && x === x ? x * n : 0);
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
    });
  }
  return out;
}

/** Histogram of an expressed trait over the living population. */
export function traitHistogram(sim: Simulation, trait: number, bins: number, min: number, max: number): number[] {
  const h = new Array(bins).fill(0);
  for (const o of sim.orgs) {
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
