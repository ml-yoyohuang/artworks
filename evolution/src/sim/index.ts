/** Public, renderer-independent API of the simulation core. */
export { Simulation, migrateSnapshot, SNAPSHOT_VERSION } from './sim';
export type { Organism, Snapshot, SimEvent, Ledger } from './sim';
export { DEFAULT_CONFIG, makeConfig, legacyConfig, MODEL_VERSION, TYPE_FORAGER, TYPE_GRAZER, TYPE_GENERALIST, TYPE_KEYS, N_TYPES } from './config';
export type { SimConfig, EnvConfig, ConfigPatch, MorphConfig } from './config';
export {
  TRAITS, N_TRAITS, GENOME_LEN, expressTrait, rawForTrait, expressPhenotype, mutate, mutateCount, randomGenome,
  T_SIZE, T_SPEED, T_SENSE, T_REPRO, T_INVEST, T_MARKER_A, T_MARKER_B,
} from './genome';
export type { Phenotype, TraitSpec } from './genome';
export { think, N_IN, N_HID, N_OUT, BRAIN_WEIGHTS } from './brain';
export { Rng } from './rng';
export { Lineage } from './lineage';
export { sampleNow, traitHistogram, energyHistogram } from './metrics';
export type { Sample } from './metrics';
export { Clock } from './clock';
