/**
 * Genotype -> phenotype.
 *
 * The genome is a flat Float64Array of unbounded real "raw" genes:
 *   [0 .. N_TRAITS)            trait genes (one locus per trait)
 *   [N_TRAITS .. GENOME_LEN)   controller weights (see brain.ts)
 *
 * Trait genes are expressed through a logistic map into a bounded range, so
 * mutation never needs clamping and every genome is a valid organism.
 * To add a trait: append a TraitSpec and read it where it matters. Nothing
 * else in the genome layout needs to change.
 */
import type { Rng } from './rng';
import { BRAIN_WEIGHTS } from './brain';
import { type SimConfig, TYPE_GRAZER, TYPE_GENERALIST } from './config';

export interface TraitSpec {
  name: string;
  min: number;
  max: number;
  /** geometric interpolation (for scale-like traits) instead of linear */
  log: boolean;
  /** true if no simulation rule reads this trait */
  neutral: boolean;
}

export const TRAITS: TraitSpec[] = [
  { name: 'size', min: 0.4, max: 2.4, log: true, neutral: false },
  { name: 'maxSpeed', min: 0.3, max: 4, log: false, neutral: false },
  { name: 'senseRange', min: 6, max: 80, log: true, neutral: false },
  { name: 'reproThreshold', min: 0.3, max: 0.95, log: false, neutral: false },
  { name: 'offspringInvest', min: 0.1, max: 0.5, log: false, neutral: false },
  { name: 'markerA', min: 0, max: 1, log: false, neutral: true },
  { name: 'markerB', min: 0, max: 1, log: false, neutral: true },
];

export const T_SIZE = 0;
export const T_SPEED = 1;
export const T_SENSE = 2;
export const T_REPRO = 3;
export const T_INVEST = 4;
export const T_MARKER_A = 5;
export const T_MARKER_B = 6;

export const N_TRAITS = TRAITS.length;
export const GENOME_LEN = N_TRAITS + BRAIN_WEIGHTS;

export function expressTrait(i: number, raw: number): number {
  const t = TRAITS[i];
  const s = 1 / (1 + Math.exp(-raw));
  return t.log ? t.min * Math.pow(t.max / t.min, s) : t.min + (t.max - t.min) * s;
}

/** Inverse of expressTrait: raw gene value that yields phenotype value v. */
export function rawForTrait(i: number, v: number): number {
  const t = TRAITS[i];
  let s = t.log ? Math.log(v / t.min) / Math.log(t.max / t.min) : (v - t.min) / (t.max - t.min);
  s = Math.min(1 - 1e-9, Math.max(1e-9, s));
  return Math.log(s / (1 - s));
}

/** Derived, cached quantities. Pure function of (genome, type, corners, lobes) + config. */
export interface Phenotype {
  traits: Float64Array; // expressed trait values, indexed like TRAITS (before type multipliers)
  type: number;
  corners: number; // 0 = not applicable
  lobes: number; // 0 = not applicable
  mass: number; // size^2 (2D body area). Corner / lobe counts never change it.
  radius: number;
  capacity: number; // max energy reserve
  intakeMax: number; // max total resource uptake per tick (shared by A and B)
  affA: number; // uptake affinity for resource A
  affB: number;
  senseA: number; // weight of A in the affinity-weighted resource sensors (affA / (affA + affB))
  senseB: number;
  vmax: number; // maximum speed after type and morphology multipliers
  fixedCost: number; // per-tick cost independent of behaviour
  moveCoef: number; // locomotion cost = moveCoef * speed^2
  buildCost: number; // energy dissipated to build this body at birth
}

/** Multipliers contributed by a morphology count; all 1 when the trait does not apply. */
export function morphFactors(cfg: SimConfig, type: number, corners: number, lobes: number) {
  const m = type === TYPE_GRAZER ? cfg.morph.corners : type === TYPE_GENERALIST ? cfg.morph.lobes : null;
  if (!m) return { uptake: 1, basal: 1, speed: 1, build: 1 };
  const d = (type === TYPE_GRAZER ? corners : lobes) - m.min;
  return { uptake: 1 + m.uptakePer * d, basal: 1 + m.basalPer * d, speed: Math.max(0.05, 1 - m.speedPer * d), build: 1 + m.buildPer * d };
}

export function expressPhenotype(genome: Float64Array, cfg: SimConfig, type = 0, corners = 0, lobes = 0): Phenotype {
  const traits = new Float64Array(N_TRAITS);
  for (let i = 0; i < N_TRAITS; i++) traits[i] = expressTrait(i, genome[i]);
  const mass = traits[T_SIZE] * traits[T_SIZE];
  const e = cfg.energy;
  const t = cfg.types[type];
  const f = morphFactors(cfg, type, corners, lobes);
  const vmax = traits[T_SPEED] * (t.speed * f.speed);
  const affSum = t.affinity[0] + t.affinity[1];
  // With all multipliers equal to 1 (model 1) every expression below reduces exactly to STAGE 1.
  return {
    traits,
    type,
    corners,
    lobes,
    mass,
    radius: cfg.bodyRadius * traits[T_SIZE],
    capacity: e.capacityPerMass * mass,
    intakeMax: e.intakeRate * Math.pow(mass, 2 / 3) * (t.intake * f.uptake),
    affA: t.affinity[0],
    affB: t.affinity[1],
    senseA: affSum > 0 ? t.affinity[0] / affSum : 0,
    senseB: affSum > 0 ? t.affinity[1] / affSum : 0,
    vmax,
    fixedCost:
      e.basal * Math.pow(mass, 0.75) * (t.basal * f.basal) +
      e.speedCapacity * mass * vmax +
      e.sensing * traits[T_SENSE] +
      e.brain,
    moveCoef: e.locomotion * mass * t.move,
    buildCost: e.birthCostPerMass * mass * f.build,
  };
}

/**
 * Mutation of a bounded integer count. With probability `rate` the count steps by +1 or -1
 * (equal odds); a step that would leave [min, max] is discarded, so the count is unchanged.
 * Draws from the RNG only when rate > 0.
 */
export function mutateCount(count: number, m: { min: number; max: number; mutationRate: number }, rng: Rng): number {
  if (m.mutationRate <= 0) return count;
  if (rng.next() >= m.mutationRate) return count;
  const next = count + (rng.next() < 0.5 ? -1 : 1);
  return next < m.min || next > m.max ? count : next;
}

export function randomGenome(rng: Rng, traitSd: number, weightSd: number): Float64Array {
  const g = new Float64Array(GENOME_LEN);
  for (let i = 0; i < GENOME_LEN; i++) g[i] = rng.gauss() * (i < N_TRAITS ? traitSd : weightSd);
  return g;
}

/**
 * Mutation operator (the only source of new variation).
 * Each locus independently mutates with probability `rate`; a mutation adds
 * Gaussian noise (sd differs for trait loci and controller loci).
 * Returns the child genome and the number of mutated loci.
 */
export function mutate(
  parent: Float64Array,
  rng: Rng,
  m: SimConfig['mutation'],
): { genome: Float64Array; count: number } {
  const g = new Float64Array(parent);
  let count = 0;
  if (m.rate > 0) {
    for (let i = 0; i < g.length; i++) {
      if (rng.next() < m.rate) {
        g[i] += rng.gauss() * (i < N_TRAITS ? m.traitSd : m.weightSd);
        count++;
      }
    }
  }
  return { genome: g, count };
}
