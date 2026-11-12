import type { SimConfig, EnvConfig } from './config';

export function finite(v: unknown, name: string, min = 0, max = Infinity): asserts v is number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`${name} must be finite in [${min}, ${max}]`);
}
export function integer(v: unknown, name: string, min = 0, max = 1e9): asserts v is number {
  finite(v, name, min, max);
  if (!Number.isSafeInteger(v)) throw new Error(`${name} must be an integer`);
}
export function validateEnv(env: EnvConfig): void {
  if (!env) throw new Error('Missing resource environment');
  for (const key of ['regrowthRate', 'influx', 'cellCapacity'] as const) finite(env[key], key);
}
export function validateConfig(c: SimConfig): void {
  if (!c || ![1, 2, 3].includes(c.model)) throw new Error('Unsupported model version');
  if (c.model === 3 || c.minTurnRadius !== undefined) finite(c.minTurnRadius, 'minimum turning radius');
  finite(c.seed, 'seed', -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  finite(c.width, 'width', 1); finite(c.height, 'height', 1); finite(c.cellSize, 'cellSize', 1);
  integer(Math.ceil(c.width / c.cellSize) * Math.ceil(c.height / c.cellSize), 'grid cells', 1, 2e6);
  validateEnv(c.env); validateEnv(c.resourceB);
  finite(c.patchiness, 'patchiness', 0, 1); finite(c.resourceB.patchiness, 'B patchiness', 0, 1);
  finite(c.patchScale, 'patchScale', 1); finite(c.resourceB.patchScale, 'B patchScale', 1);
  if (!['same', 'complementary', 'independent'].includes(c.resourceB.layout)) throw new Error('Unknown B layout');
  integer(c.maxPopulation, 'maxPopulation', 1, 1e5);
  integer(c.founders.count, 'founders', 0, c.maxPopulation);
  if (!Array.isArray(c.founders.mix) || c.founders.mix.length !== 3) throw new Error('Expected three founder weights');
  c.founders.mix.forEach(v => finite(v, 'founder weight'));
  finite(c.founders.energyFrac, 'energy fraction', 0, 1);
  finite(c.founders.traitSd, 'traitSd'); finite(c.founders.weightSd, 'weightSd');
  integer(c.metrics.sampleInterval, 'sample interval', 1); integer(c.metrics.maxSamples, 'max samples', 4, 1e5);
  integer(c.lineageMaxNodes, 'lineage budget', 4, 1e6);
  finite(c.bodyRadius, 'body radius', 0.001); finite(c.maxTurn, 'maxTurn'); finite(c.sensorAngle, 'sensor angle');
  for (const [key, value] of Object.entries(c.energy)) finite(value, `energy.${key}`);
  for (const key of ['assimilation', 'halfSaturation', 'feedSpeed', 'capacityPerMass'] as const) finite(c.energy[key], key, 1e-12);
  finite(c.energy.assimilation, 'assimilation', 1e-12, 1);
  for (const [key, value] of Object.entries(c.life)) finite(value, `life.${key}`);
  finite(c.life.gompertzTau, 'gompertzTau', 1e-12);
  finite(c.mutation.rate, 'mutation rate', 0, 1); finite(c.mutation.traitSd, 'trait mutation SD'); finite(c.mutation.weightSd, 'weight mutation SD');
  if (!Array.isArray(c.types) || c.types.length !== 3) throw new Error('Expected three type definitions');
  for (const t of c.types) {
    if (!Array.isArray(t.affinity) || t.affinity.length !== 2) throw new Error('Expected A/B affinity');
    t.affinity.forEach(v => finite(v, 'affinity', 0, 1));
    for (const key of ['intake', 'basal', 'speed', 'move'] as const) finite(t[key], key);
  }
  for (const [key, m] of Object.entries(c.morph)) {
    integer(m.min, `${key}.min`, 3, 24); integer(m.max, `${key}.max`, m.min, 24);
    finite(m.mutationRate, `${key}.mutationRate`, 0, 1);
    for (const k of ['uptakePer', 'basalPer', 'speedPer', 'buildPer'] as const) finite(m[k], k);
    if (!m.founding.length) throw new Error(`Empty founding ${key}`);
    m.founding.forEach(v => integer(v, `founding ${key}`, m.min, m.max));
  }
}
