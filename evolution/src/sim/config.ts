/** All tunable parameters. Plain JSON so a config is a complete experiment description. */

/** Environment parameters that may be changed while the simulation runs. */
export interface EnvConfig {
  /** logistic regrowth rate r (per tick) */
  regrowthRate: number;
  /** spontaneous influx (per tick, per cell, scaled by 1 - R/K) so empty cells recover */
  influx: number;
  /** resource carrying capacity of a cell with fertility 1 */
  cellCapacity: number;
}

export interface SimConfig {
  seed: number;
  width: number;
  height: number;
  cellSize: number;
  /** 0 = uniform fertility, 1 = strongly patchy */
  patchiness: number;
  /** patch length scale, in cells */
  patchScale: number;
  env: EnvConfig;
  bodyRadius: number;
  maxTurn: number;
  /** sensor half-angle (radians) for the left / right rays */
  sensorAngle: number;
  energy: {
    capacityPerMass: number;
    /** max uptake per tick at mass 1 (scales with mass^(2/3)) */
    intakeRate: number;
    /** half-saturation resource level of the Holling type-II uptake */
    halfSaturation: number;
    /** speed at which uptake is halved: f = 1 / (1 + (v/feedSpeed)^2) */
    feedSpeed: number;
    /** fraction of ingested resource that becomes reserve */
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
    /** per-locus mutation probability per birth */
    rate: number;
    traitSd: number;
    weightSd: number;
  };
  founders: {
    count: number;
    /** initial energy as a fraction of capacity */
    energyFrac: number;
    /** sd of random founder genes (ignored for explicit genomes) */
    traitSd: number;
    weightSd: number;
    /** explicit founder genomes; founder i uses genomes[i % length] */
    genomes?: number[][];
  };
  /** hard safety cap; births are suppressed (and counted) at the cap */
  maxPopulation: number;
  metrics: { sampleInterval: number; maxSamples: number };
}

export const DEFAULT_CONFIG: SimConfig = {
  seed: 1,
  width: 960,
  height: 640,
  cellSize: 10,
  patchiness: 0.8,
  patchScale: 9,
  env: { regrowthRate: 0.012, influx: 0.004, cellCapacity: 10 },
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
  founders: { count: 200, energyFrac: 0.6, traitSd: 0.5, weightSd: 1 },
  maxPopulation: 3000,
  metrics: { sampleInterval: 100, maxSamples: 2048 },
};

type Deep<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends any[] ? T[K] : Deep<T[K]>) : T[K] };

/** DEFAULT_CONFIG with a (one level deep) patch applied. */
export function makeConfig(patch: Deep<SimConfig> = {}): SimConfig {
  const base = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as any;
  for (const k of Object.keys(patch)) {
    const v = (patch as any)[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(base[k], v);
    else base[k] = v;
  }
  return base as SimConfig;
}
