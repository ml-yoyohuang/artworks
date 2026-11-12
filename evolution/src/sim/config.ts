/** All tunable parameters. Plain JSON so a config is a complete experiment description. */

/**
 * Scientific model version. Bump when a rule, the genome layout or the state schema changes.
 *   1  single resource, one organism type (STAGE 1). Run it with `legacyConfig()`.
 *   2  two resources, three ecological types, heritable corner / lobe counts (STAGE 3).
 *   3  same ecology, with speed-coupled minimum turning radius.
 * Presentation changes (palette, rendering) never change this number.
 */
export const MODEL_VERSION = 3;

/** Environment parameters of one resource that may be changed while the simulation runs. */
export interface EnvConfig {
  /** logistic regrowth rate r (per tick) */
  regrowthRate: number;
  /** spontaneous influx (per tick, per cell, scaled by 1 - R/K) so empty cells recover */
  influx: number;
  /** resource carrying capacity of a cell with fertility 1 */
  cellCapacity: number;
}

/** Ecological type ids. Inherited unchanged; never inferred from colour, shape or clustering. */
export const TYPE_FORAGER = 0;
export const TYPE_GRAZER = 1;
export const TYPE_GENERALIST = 2;
export const N_TYPES = 3;
export const TYPE_KEYS = ['forager', 'grazer', 'generalist'] as const;

/** Per-type physiological coefficients. Every field enters an engine equation. */
export interface TypeConfig {
  name: string;
  /** uptake affinity for resource A and B (dimensionless, 0..1) */
  affinity: [number, number];
  /** multiplier on maximum uptake rate */
  intake: number;
  /** multiplier on basal (size-dependent) maintenance */
  basal: number;
  /** multiplier on the expressed maxSpeed trait */
  speed: number;
  /** multiplier on the locomotion cost coefficient */
  move: number;
}

/**
 * A bounded heritable integer count (corners of the grazer, lobes of the generalist).
 * Effects are linear in (count - min) and are abstract model rules, not geometry:
 *   uptake  x (1 + uptakePer * d)     maintenance x (1 + basalPer * d)
 *   speed   x (1 - speedPer  * d)     body construction x (1 + buildPer * d)
 */
export interface MorphConfig {
  min: number;
  max: number;
  /** probability per birth of a +-1 step (direction 50/50; a step outside the bounds is discarded) */
  mutationRate: number;
  uptakePer: number;
  basalPer: number;
  speedPer: number;
  buildPer: number;
  /** founding counts, assigned to founders of the type in rotation (no randomness) */
  founding: number[];
}

export interface SimConfig {
  /** scientific model version this config is meant for (1 = legacy single-resource semantics) */
  model: 1 | 2 | 3;
  seed: number;
  width: number;
  height: number;
  cellSize: number;
  /** resource A: 0 = uniform fertility, 1 = strongly patchy */
  patchiness: number;
  /** resource A: patch length scale, in cells */
  patchScale: number;
  /** resource A parameters */
  env: EnvConfig;
  /** resource B */
  resourceB: EnvConfig & {
    patchiness: number;
    patchScale: number;
    /**
     * independent     own noise field
     * complementary   fertile where A is poor (spatially separated niches)
     * same            identical fertility map to A
     */
    layout: 'independent' | 'complementary' | 'same';
  };
  /** true: the reserve of a dead organism returns to resource A in its cell (model 1). false: dissipated. */
  corpseRecycling: boolean;
  types: TypeConfig[];
  morph: { corners: MorphConfig; lobes: MorphConfig };
  bodyRadius: number;
  maxTurn: number;
  /** Model 3: minimum trajectory radius in world units; body radius * 2 also provides a floor. */
  minTurnRadius?: number;
  /** sensor half-angle (radians) for the left / right rays */
  sensorAngle: number;
  energy: {
    capacityPerMass: number;
    /** max uptake per tick at mass 1 (scales with mass^(2/3)) */
    intakeRate: number;
    /** half-saturation level of the (multi-resource) Holling type-II uptake */
    halfSaturation: number;
    /** speed at which uptake is halved: f = 1 / (1 + (v/feedSpeed)^2) */
    feedSpeed: number;
    /** fraction of ingested resource that becomes reserve (same for A and B: units are comparable) */
    assimilation: number;
    basal: number; // * mass^0.75
    locomotion: number; // * mass * speed^2
    speedCapacity: number; // * mass * maxSpeed (upkeep of the ability to be fast)
    sensing: number; // * senseRange
    brain: number; // flat controller upkeep
    /** energy dissipated to build one unit of offspring mass */
    birthCostPerMass: number;
  };
  life: {
    maturityAge: number;
    /** per-tick death hazard = baseHazard + gompertzA * exp(age / gompertzTau) */
    baseHazard: number;
    gompertzA: number;
    gompertzTau: number;
  };
  mutation: {
    /** per-locus mutation probability per birth (continuous genes) */
    rate: number;
    traitSd: number;
    weightSd: number;
  };
  founders: {
    /** total number of founders */
    count: number;
    /** relative share of each type [forager, grazer, generalist]; counts by largest remainder */
    mix: [number, number, number];
    /** initial energy as a fraction of capacity */
    energyFrac: number;
    /** sd of random founder genes (ignored for explicit genomes) */
    traitSd: number;
    weightSd: number;
    /** explicit founder genomes; founder i uses genomes[i % length] */
    genomes?: number[][];
    /** explicit discrete genes parallel to `genomes` (type, corners, lobes); overrides `mix` */
    kinds?: { type: number; corners?: number; lobes?: number }[];
  };
  /** hard safety cap; births are suppressed (and counted) at the cap */
  maxPopulation: number;
  metrics: { sampleInterval: number; maxSamples: number };
  /** genealogy nodes kept before old single-child ancestors are thinned */
  lineageMaxNodes: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  model: 3,
  minTurnRadius: 12,
  seed: 1,
  width: 960,
  height: 640,
  cellSize: 10,
  patchiness: 0.8,
  patchScale: 9,
  env: { regrowthRate: 0.012, influx: 0.004, cellCapacity: 10 },
  resourceB: { regrowthRate: 0.012, influx: 0.004, cellCapacity: 10, patchiness: 0.8, patchScale: 9, layout: 'complementary' },
  corpseRecycling: false,
  types: [
    { name: 'Mobile forager', affinity: [1, 0.15], intake: 1, basal: 1, speed: 1, move: 1 },
    { name: 'Conservative grazer', affinity: [0.15, 1], intake: 0.75, basal: 0.6, speed: 0.5, move: 1 },
    { name: 'Multi-lobed generalist', affinity: [0.6, 0.6], intake: 0.55, basal: 1, speed: 0.85, move: 1 },
  ],
  morph: {
    corners: { min: 3, max: 8, mutationRate: 0.02, uptakePer: 0.06, basalPer: 0.07, speedPer: 0, buildPer: 0.04, founding: [4, 5, 6, 7] },
    lobes: { min: 3, max: 6, mutationRate: 0.02, uptakePer: 0.1, basalPer: 0.08, speedPer: 0.06, buildPer: 0.06, founding: [3, 4, 5] },
  },
  bodyRadius: 4,
  maxTurn: 0.5,
  sensorAngle: 0.7,
  energy: {
    capacityPerMass: 30,
    intakeRate: 0.6,
    halfSaturation: 2,
    feedSpeed: 1,
    assimilation: 0.7,
    basal: 0.05,
    locomotion: 0.015,
    speedCapacity: 0.004,
    sensing: 0.0004,
    brain: 0.008,
    birthCostPerMass: 5,
  },
  life: { maturityAge: 40, baseHazard: 0.0002, gompertzA: 0.00002, gompertzTau: 400 },
  mutation: { rate: 0.05, traitSd: 0.15, weightSd: 0.2 },
  founders: { count: 240, mix: [1, 1, 1], energyFrac: 0.6, traitSd: 0.5, weightSd: 1 },
  maxPopulation: 3000,
  metrics: { sampleInterval: 100, maxSamples: 2048 },
  lineageMaxNodes: 12000,
};

type Deep<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends any[] ? T[K] : Deep<T[K]>) : T[K] };
export type ConfigPatch = Deep<SimConfig>;

function merge(base: any, patch: any): any {
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], v);
    else base[k] = v;
  }
  return base;
}

/** DEFAULT_CONFIG (current model) with a deep patch applied. Arrays are replaced, objects merged. */
export function makeConfig(patch: ConfigPatch = {}): SimConfig {
  return merge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), patch) as SimConfig;
}

/** The parts of a config that make it behave exactly like the STAGE 1 single-resource model. */
const LEGACY: ConfigPatch = {
  model: 1,
  minTurnRadius: 0,
  resourceB: { regrowthRate: 0, influx: 0, cellCapacity: 0, patchiness: 0, patchScale: 9, layout: 'same' },
  corpseRecycling: true,
  types: [
    { name: 'Organism (model 1)', affinity: [1, 0], intake: 1, basal: 1, speed: 1, move: 1 },
    { name: 'unused', affinity: [0, 0], intake: 1, basal: 1, speed: 1, move: 1 },
    { name: 'unused', affinity: [0, 0], intake: 1, basal: 1, speed: 1, move: 1 },
  ],
  founders: { count: 200, mix: [1, 0, 0] },
};

/**
 * Model 1 (STAGE 1) configuration: one resource, one type, corpse reserve returned to the cell.
 * The model-2 engine reproduces the STAGE 1 trajectories bit for bit under this config
 * (tests/legacy.test.ts compares against hashes recorded from the STAGE 1 engine).
 */
export function legacyConfig(patch: ConfigPatch = {}): SimConfig {
  return merge(merge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), LEGACY), patch) as SimConfig;
}

/** Upgrade a STAGE 1 config object (no `model` field) to the current schema with model-1 semantics. */
export function migrateConfigV1(old: any): SimConfig {
  return legacyConfig(old);
}

/** Founders per type for a config (largest-remainder allocation of `count` by `mix`). */
export function founderCounts(cfg: SimConfig): number[] {
  const w = cfg.founders.mix.map((x) => Math.max(0, x));
  const tot = w[0] + w[1] + w[2];
  if (tot <= 0) return [cfg.founders.count, 0, 0];
  const exact = w.map((x) => (x / tot) * cfg.founders.count);
  const n = exact.map(Math.floor);
  let left = cfg.founders.count - (n[0] + n[1] + n[2]);
  const order = [0, 1, 2].sort((a, b) => exact[b] - n[b] - (exact[a] - n[a]) || a - b);
  for (let i = 0; left > 0; i = (i + 1) % 3) { n[order[i]]++; left--; }
  return n;
}
