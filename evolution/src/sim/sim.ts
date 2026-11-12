/**
 * EVOLUTION MACHINE — simulation core (scientific model 2).
 * Renderer-independent, deterministic for a given config (same JS engine),
 * fixed logical time step. See docs/EVOLUTION_MODEL.md for the rules.
 *
 * Model 1 (STAGE 1: one resource, one type) is the special case produced by
 * `legacyConfig()`. Arithmetic is ordered so that this case is bit-identical to
 * the STAGE 1 engine; tests/legacy.test.ts holds the recorded hashes.
 */
import { Rng, type RngState } from './rng';
import { think, N_IN, N_OUT } from './brain';
import {
  type SimConfig, type EnvConfig, MODEL_VERSION, N_TYPES, TYPE_GRAZER, TYPE_GENERALIST,
  founderCounts, migrateConfigV1,
} from './config';
import {
  type Phenotype, expressPhenotype, mutate, mutateCount, randomGenome,
  N_TRAITS, GENOME_LEN, T_SENSE, T_REPRO, T_INVEST,
} from './genome';
import { Lineage } from './lineage';
import { type Sample, type Counters, emptyCounters, sampleNow, decimate } from './metrics';
import { validateConfig, validateEnv, finite, integer } from './validation';
import { boundedTurn } from './motion';

export interface Organism {
  id: number;
  parentId: number; // -1 for founders
  founderId: number; // id of the founding ancestor
  generation: number; // lineage depth: 0 for founders, parent.generation + 1 otherwise
  birthTick: number;
  // --- genotype (immutable during life, inherited) ---
  genome: Float64Array; // continuous genes
  type: number; // ecological type id; children always inherit it
  corners: number; // grazer corner count; 0 = not applicable
  lobes: number; // generalist lobe count; 0 = not applicable
  // --- phenotype derived from the genotype ---
  ph: Phenotype;
  // --- physiological / kinematic state ---
  x: number;
  y: number;
  heading: number;
  speed: number; // realised speed in the last tick
  energy: number;
  age: number;
  offspring: number;
  // scratch
  cell: number;
  reqA: number;
  reqB: number;
  alive: boolean;
}

export interface SimEvent {
  tick: number;
  type: 'extinction' | 'environment' | 'introduction';
  detail: string;
}

/**
 * Energy ledger. All terms are cumulative energy units; A and B use the same unit.
 *   world energy = injected + regrowth + regrowthB
 *                  - metabolism - assimilationLoss - birthCost - corpse
 */
export interface Ledger {
  /** energy added from outside: initial stocks of A and B, founders, introductions */
  injected: number;
  /** net regrowth of resource A (signed) */
  regrowth: number;
  /** net regrowth of resource B (signed) */
  regrowthB: number;
  /** maintenance + locomotion paid from reserves */
  metabolism: number;
  /** ingested energy not converted into reserve */
  assimilationLoss: number;
  /** body construction at birth, plus endowments lost in stillbirths */
  birthCost: number;
  /** reserves of dead organisms that were dissipated (0 when corpseRecycling is on) */
  corpse: number;
}

type OrgState = Omit<Organism, 'genome' | 'ph' | 'cell' | 'reqA' | 'reqB' | 'alive'> & { genome: number[] };

export interface Snapshot {
  version: 2;
  model: number;
  cfg: SimConfig;
  env: EnvConfig;
  envB: EnvConfig;
  tick: number;
  nextId: number;
  totalBirths: number;
  rng: RngState;
  resource: number[];
  resourceB: number[];
  ledger: Ledger;
  counters: Counters;
  history: Sample[];
  sampleInterval: number;
  events: SimEvent[];
  lineage: unknown[];
  lineageMeta: { pruned: number; thinned: number };
  orgs: OrgState[];
  /** present when the snapshot was migrated from an older format: what was and was not recorded */
  migratedFrom?: string;
}

const SENSE_BIOMASS_HALF = 2;
const TAU = Math.PI * 2;
const MAX_EVENTS = 500;
export const SNAPSHOT_VERSION = 2;

/**
 * Bring any supported snapshot to the current format, or throw a helpful error.
 * Version 1 (STAGE 1/2) is migrated with model-1 semantics: every organism is type 0, resource B
 * does not exist, and nothing that was not recorded (ancestor genomes, per-type history) is invented.
 */
export function migrateSnapshot(raw: any): Snapshot {
  if (!raw || typeof raw !== 'object') throw new Error('Not a simulation snapshot.');
  if (raw.version === SNAPSHOT_VERSION) return raw as Snapshot;
  if (raw.version === 1) {
    const cfg = migrateConfigV1(raw.cfg);
    const cells = Math.ceil(cfg.width / cfg.cellSize) * Math.ceil(cfg.height / cfg.cellSize);
    return {
      version: 2,
      model: 1,
      cfg,
      env: raw.env,
      envB: { ...cfg.resourceB },
      tick: raw.tick,
      nextId: raw.nextId,
      totalBirths: NaN, // not recorded by version 1
      rng: raw.rng,
      resource: raw.resource,
      resourceB: new Array(cells).fill(0),
      ledger: { ...raw.ledger, regrowthB: 0, corpse: 0 },
      counters: { ...emptyCounters(raw.counters.lastTick), ...raw.counters, lrsSum: NaN, lrsSq: NaN },
      history: raw.history, // per-type fields are absent, not back-filled
      sampleInterval: raw.sampleInterval,
      events: raw.events,
      lineage: raw.lineage, // 5-number rows: ancestors keep ids and times, genomes are unavailable
      lineageMeta: { pruned: 0, thinned: 0 },
      orgs: raw.orgs.map((o: any) => ({ ...o, type: 0, corners: 0, lobes: 0 })),
      migratedFrom: 'snapshot version 1 (model 1): ancestor genomes, per-type history and total births were not recorded',
    };
  }
  throw new Error(`Unsupported snapshot version ${JSON.stringify(raw.version)}. This build reads versions 1 and ${SNAPSHOT_VERSION}.`);
}

/** JSON encodes unknown statistical numbers as null; revive them as missing, not zero. */
function cloneNumbers<T>(value: T): T {
  if (value === null) return NaN as T;
  if (Array.isArray(value)) return value.map(cloneNumbers) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneNumbers(v)])) as T;
  return value;
}

function validateSnapshot(s: Snapshot): void {
  validateConfig(s.cfg); validateEnv(s.env); validateEnv(s.envB);
  if (s.model !== s.cfg.model) throw new Error('Snapshot model and configuration disagree');
  integer(s.tick, 'snapshot tick'); integer(s.nextId, 'next id', 1);
  integer(s.sampleInterval, 'snapshot sample interval', 1);
  const cells = Math.ceil(s.cfg.width / s.cfg.cellSize) * Math.ceil(s.cfg.height / s.cfg.cellSize);
  for (const arr of [s.resource, s.resourceB]) {
    if (!Array.isArray(arr) || arr.length !== cells) throw new Error('Snapshot resource grid dimensions disagree');
    arr.forEach(v => finite(v, 'resource stock'));
  }
  if (!Array.isArray(s.history) || !s.history.length || !Array.isArray(s.events) || !Array.isArray(s.lineage)) throw new Error('Missing snapshot history/events/lineage');
  if (!Array.isArray(s.rng) || s.rng.length !== 4 || !s.rng.every(Number.isFinite)) throw new Error('Invalid RNG state');
  for (const value of Object.values(s.ledger)) finite(value, 'ledger term', -Number.MAX_VALUE);
  const ids = new Set<number>();
  for (const o of s.orgs) {
    integer(o.id, 'organism id', 1, s.nextId - 1);
    if (ids.has(o.id)) throw new Error('Duplicate organism ID'); ids.add(o.id);
    integer(o.type, 'organism type', 0, s.cfg.model === 1 ? 0 : 2);
    for (const [key, type, m] of [['corners', 1, s.cfg.morph.corners], ['lobes', 2, s.cfg.morph.lobes]] as const) {
      integer(o[key], key, o.type === type ? m.min : 0, o.type === type ? m.max : 0);
    }
    if (!Array.isArray(o.genome) || o.genome.length !== GENOME_LEN || !o.genome.every(Number.isFinite)) throw new Error('Invalid genome');
    finite(o.x, 'x', 0, s.cfg.width - 1e-7); finite(o.y, 'y', 0, s.cfg.height - 1e-7);
    finite(o.energy, 'organism energy', 0, expressPhenotype(Float64Array.from(o.genome), s.cfg, o.type, o.corners, o.lobes).capacity + 1e-8);
    finite(o.heading, 'heading', -Math.PI, Math.PI); finite(o.speed, 'speed'); integer(o.age, 'age'); integer(o.offspring, 'offspring');
  }
  const parents = new Map<number, number>();
  for (const row of s.lineage as any[]) { integer(row[0], 'lineage id', 1, s.nextId - 1); if (parents.has(row[0])) throw new Error('Duplicate lineage ID'); parents.set(row[0], row[1]); }
  for (const id of parents.keys()) {
    const seen = new Set<number>(); let current = id;
    while (parents.has(current)) { if (seen.has(current)) throw new Error('Cyclic lineage'); seen.add(current); current = parents.get(current)!; }
  }
}

export class Simulation {
  readonly cfg: SimConfig;
  /** live parameters of resource A; change via setEnvironment() */
  env: EnvConfig;
  /** live parameters of resource B; change via setEnvironment(patch, 'B') */
  envB: EnvConfig;
  tick = 0;
  nextId = 1;
  /** birth events since the start (founders and introductions excluded); NaN if migrated from v1 */
  totalBirths = 0;
  orgs: Organism[] = [];
  readonly cols: number;
  readonly rows: number;
  /** resource A energy per cell */
  readonly resource: Float64Array;
  /** static fertility of A in (0,1]; carrying capacity of a cell = env.cellCapacity * fertility */
  readonly fertility: Float64Array;
  /** resource B energy per cell, and its fertility */
  readonly resourceB: Float64Array;
  readonly fertilityB: Float64Array;
  /** body mass per cell, rebuilt each tick before sensing */
  readonly biomass: Float64Array;
  ledger: Ledger = { injected: 0, regrowth: 0, regrowthB: 0, metabolism: 0, assimilationLoss: 0, birthCost: 0, corpse: 0 };
  counters: Counters = emptyCounters(0);
  history: Sample[] = [];
  sampleInterval: number;
  events: SimEvent[] = [];
  lineage: Lineage;
  /** set when restored from a migrated snapshot */
  migratedFrom?: string;

  private rng: Rng;
  private demA: Float64Array;
  private demB: Float64Array;
  private inp = new Float64Array(N_IN);
  private out = new Float64Array(N_OUT);
  private extinct = false;

  constructor(cfg: SimConfig, snap?: Snapshot) {
    validateConfig(cfg);
    this.cfg = JSON.parse(JSON.stringify(cfg));
    if (![1, 2, MODEL_VERSION].includes(this.cfg.model)) throw new Error(`Unsupported model version ${this.cfg.model}`);
    if (this.cfg.types.length !== N_TYPES) throw new Error(`config.types must list ${N_TYPES} types`);
    this.env = { ...this.cfg.env };
    this.envB = { regrowthRate: this.cfg.resourceB.regrowthRate, influx: this.cfg.resourceB.influx, cellCapacity: this.cfg.resourceB.cellCapacity };
    this.cols = Math.ceil(cfg.width / cfg.cellSize);
    this.rows = Math.ceil(cfg.height / cfg.cellSize);
    const n = this.cols * this.rows;
    this.resource = new Float64Array(n);
    this.fertility = new Float64Array(n);
    this.resourceB = new Float64Array(n);
    this.fertilityB = new Float64Array(n);
    this.biomass = new Float64Array(n);
    this.demA = new Float64Array(n);
    this.demB = new Float64Array(n);
    this.sampleInterval = cfg.metrics.sampleInterval;
    this.rng = new Rng(cfg.seed);
    this.lineage = new Lineage(this.cfg.lineageMaxNodes);
    this.buildFertility();

    if (snap) {
      this.env = { ...snap.env };
      this.envB = { ...snap.envB };
      this.tick = snap.tick;
      this.nextId = snap.nextId;
      this.totalBirths = snap.totalBirths ?? NaN;
      this.rng = new Rng(snap.rng);
      this.resource.set(snap.resource);
      this.resourceB.set(snap.resourceB);
      this.ledger = { ...snap.ledger };
      this.counters = cloneNumbers(snap.counters);
      this.history = cloneNumbers(snap.history);
      this.sampleInterval = snap.sampleInterval;
      this.events = snap.events.map((e) => ({ ...e }));
      this.lineage = Lineage.fromJSON(snap.lineage as any[], this.cfg.lineageMaxNodes, snap.lineageMeta);
      this.migratedFrom = snap.migratedFrom;
      for (const s of snap.orgs) {
        const genome = Float64Array.from(s.genome);
        this.orgs.push({ ...s, genome, ph: expressPhenotype(genome, this.cfg, s.type, s.corners, s.lobes), cell: 0, reqA: 0, reqB: 0, alive: true });
        const node = this.lineage.nodes.get(s.id);
        if (node && node.genome) node.genome = genome; // share one array between organism and record
      }
      this.extinct = this.orgs.length === 0;
      return;
    }

    for (let i = 0; i < n; i++) {
      this.resource[i] = this.env.cellCapacity * this.fertility[i];
      this.ledger.injected += this.resource[i];
    }
    if (this.envB.cellCapacity > 0) {
      for (let i = 0; i < n; i++) {
        this.resourceB[i] = this.envB.cellCapacity * this.fertilityB[i];
        this.ledger.injected += this.resourceB[i];
      }
    }
    const f = cfg.founders;
    const kinds = this.founderKinds();
    for (let i = 0; i < kinds.length; i++) {
      const genome = f.genomes && f.genomes.length
        ? Float64Array.from(f.genomes[i % f.genomes.length])
        : randomGenome(this.rng, f.traitSd, f.weightSd);
      const k = kinds[i];
      this.spawn(genome, this.rng.next() * cfg.width, this.rng.next() * cfg.height, f.energyFrac, k.type, k.corners, k.lobes);
    }
    this.history.push(sampleNow(this));
  }

  /** Accepts any supported snapshot version; throws before touching anything if unsupported. */
  static restore(raw: unknown): Simulation {
    const snap = migrateSnapshot(raw);
    validateSnapshot(snap);
    return new Simulation(snap.cfg, snap);
  }

  /** Discrete genes of each founder. Deterministic and RNG-free. */
  private founderKinds(): { type: number; corners: number; lobes: number }[] {
    const f = this.cfg.founders, m = this.cfg.morph;
    const out: { type: number; corners: number; lobes: number }[] = [];
    const seen = [0, 0, 0];
    const make = (type: number, corners?: number, lobes?: number) => {
      integer(type, 'founder type', 0, 2);
      const i = seen[type]++;
      out.push({
        type,
        corners: type === TYPE_GRAZER ? this.checkCount(corners ?? m.corners.founding[i % m.corners.founding.length], m.corners, 'corners') : 0,
        lobes: type === TYPE_GENERALIST ? this.checkCount(lobes ?? m.lobes.founding[i % m.lobes.founding.length], m.lobes, 'lobes') : 0,
      });
    };
    if (f.kinds && f.kinds.length) {
      const total = f.genomes && f.genomes.length ? Math.max(f.count, 0) : f.count;
      for (let i = 0; i < total; i++) { const k = f.kinds[i % f.kinds.length]; make(k.type, k.corners, k.lobes); }
    } else {
      const counts = founderCounts(this.cfg);
      for (let t = 0; t < N_TYPES; t++) for (let i = 0; i < counts[t]; i++) make(t);
    }
    if (this.cfg.model === 1 && out.some((k) => k.type !== 0)) throw new Error('model 1 has a single organism type');
    return out;
  }

  private checkCount(v: number, m: { min: number; max: number }, what: string): number {
    if (!Number.isInteger(v) || v < m.min || v > m.max) throw new Error(`${what} must be an integer in [${m.min}, ${m.max}], got ${v}`);
    return v;
  }

  /** Smooth seeded value noise -> patchy fertility. Uses its own RNG streams. */
  private buildFertility(): void {
    const { seed } = this.cfg;
    const noise = (stream: number, patchScale: number, out: Float64Array) => {
      const r = new Rng((seed ^ stream) >>> 0);
      const gw = Math.ceil(this.cols / patchScale) + 2;
      const gh = Math.ceil(this.rows / patchScale) + 2;
      const g = new Float64Array(gw * gh);
      for (let i = 0; i < g.length; i++) g[i] = r.next();
      const sm = (t: number) => t * t * (3 - 2 * t);
      for (let cy = 0; cy < this.rows; cy++) {
        for (let cx = 0; cx < this.cols; cx++) {
          const u = cx / patchScale, v = cy / patchScale;
          const x0 = Math.floor(u), y0 = Math.floor(v);
          const fx = sm(u - x0), fy = sm(v - y0);
          const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1];
          const c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
          const nz = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
          const t = Math.min(1, Math.max(0, (nz - 0.3) / 0.4));
          out[cy * this.cols + cx] = sm(t); // 0 = poorest, 1 = richest
        }
      }
    };
    const n = this.fertility.length;
    const richA = new Float64Array(n);
    noise(0x9e3779b1, this.cfg.patchScale, richA);
    for (let i = 0; i < n; i++) this.fertility[i] = 1 - this.cfg.patchiness * (1 - richA[i]);
    const rb = this.cfg.resourceB;
    if (this.cfg.model >= 2 || rb.cellCapacity > 0) {
      const richB = new Float64Array(n);
      if (rb.layout === 'independent') noise(0x51ed270b, rb.patchScale, richB);
      else for (let i = 0; i < n; i++) richB[i] = rb.layout === 'complementary' ? 1 - richA[i] : richA[i];
      for (let i = 0; i < n; i++) this.fertilityB[i] = 1 - rb.patchiness * (1 - richB[i]);
    }
  }

  private cellAt(x: number, y: number): number {
    return Math.floor(y / this.cfg.cellSize) * this.cols + Math.floor(x / this.cfg.cellSize);
  }

  private spawn(genome: Float64Array, x: number, y: number, energyFrac: number, type: number, corners: number, lobes: number): Organism {
    const ph = expressPhenotype(genome, this.cfg, type, corners, lobes);
    const id = this.nextId++;
    const o: Organism = {
      id, parentId: -1, founderId: id, generation: 0, birthTick: this.tick,
      genome, type, corners, lobes, ph, x, y, heading: (this.rng.next() - 0.5) * TAU, speed: 0,
      energy: energyFrac * ph.capacity, age: 0, offspring: 0, cell: 0, reqA: 0, reqB: 0, alive: true,
    };
    this.ledger.injected += o.energy;
    this.orgs.push(o);
    this.lineage.birth(id, -1, this.tick, type, corners, lobes, genome);
    this.extinct = false;
    return o;
  }

  /**
   * Experimenter intervention: introduce a new founder organism.
   * `kind` gives its discrete genes; omitted counts default to the minimum of the type's range.
   */
  introduce(
    genome: ArrayLike<number>, x: number, y: number, energyFrac = this.cfg.founders.energyFrac,
    kind: { type?: number; corners?: number; lobes?: number } = {},
  ): Organism {
    if (genome.length !== GENOME_LEN) throw new Error(`genome length must be ${GENOME_LEN}`);
    const type = kind.type ?? 0;
    if (!Array.from(genome).every(Number.isFinite)) throw new Error('Genome must contain finite numbers');
    finite(x, 'release x', -Number.MAX_VALUE); finite(y, 'release y', -Number.MAX_VALUE); finite(energyFrac, 'release energy fraction', 0, 1);
    if (!Number.isInteger(type) || type < 0 || type >= N_TYPES) throw new Error(`unknown type ${type}`);
    if (this.cfg.model === 1 && type !== 0) throw new Error('model 1 has a single organism type');
    const m = this.cfg.morph;
    const corners = type === TYPE_GRAZER ? this.checkCount(kind.corners ?? m.corners.min, m.corners, 'corners') : 0;
    const lobes = type === TYPE_GENERALIST ? this.checkCount(kind.lobes ?? m.lobes.min, m.lobes, 'lobes') : 0;
    const cx = Math.min(this.cfg.width - 1e-6, Math.max(0, x));
    const cy = Math.min(this.cfg.height - 1e-6, Math.max(0, y));
    const o = this.spawn(Float64Array.from(genome), cx, cy, energyFrac, type, corners, lobes);
    this.logEvent('introduction', JSON.stringify({ id: o.id, x: o.x, y: o.y, energyFrac, type: o.type, corners: o.corners, lobes: o.lobes, genome: Array.from(o.genome) }));
    return o;
  }

  /** Experimenter intervention: change parameters of resource A (default) or B from now on. */
  setEnvironment(patch: Partial<EnvConfig>, resource: 'A' | 'B' = 'A'): void {
    const env = resource === 'A' ? this.env : this.envB;
    if (Object.keys(patch).some(k => !['regrowthRate', 'influx', 'cellCapacity'].includes(k))) throw new Error('Unknown environmental parameter');
    if (this.cfg.model === 1 && resource === 'B' && patch.cellCapacity) throw new Error('Model 1 has no resource B');
    validateEnv({ ...env, ...patch });
    Object.assign(env, patch);
    this.logEvent('environment', resource === 'A' ? JSON.stringify(patch) : JSON.stringify({ resource: 'B', ...patch }));
  }

  private logEvent(type: SimEvent['type'], detail: string): void {
    this.events.push({ tick: this.tick, type, detail });
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

  step(n = 1): void {
    for (let i = 0; i < n; i++) this.stepOnce();
  }

  private stepOnce(): void {
    const cfg = this.cfg, en = cfg.energy, life = cfg.life;
    const orgs = this.orgs, resA = this.resource, resB = this.resourceB, bio = this.biomass;
    const demA = this.demA, demB = this.demB;
    const W = cfg.width, H = cfg.height, cs = cfg.cellSize, cols = this.cols;
    const maxX = W - 1e-6, maxY = H - 1e-6;
    const ca = Math.cos(cfg.sensorAngle), sa = Math.sin(cfg.sensorAngle);
    const capA = this.env.cellCapacity, capB = this.envB.cellCapacity;
    const invCapA3 = capA > 0 ? 1 / (3 * capA) : 0;
    const invCapB3 = capB > 0 ? 1 / (3 * capB) : 0;
    const invCapB = capB > 0 ? 1 / capB : 0;
    const inp = this.inp, out = this.out, rng = this.rng;
    const nOrg = orgs.length;
    const c = this.counters;

    // 1. biomass field (what organisms can sense of each other)
    bio.fill(0);
    for (let i = 0; i < nOrg; i++) {
      const o = orgs[i];
      o.cell = this.cellAt(o.x, o.y);
      bio[o.cell] += o.ph.mass;
    }

    // 2. sense -> think -> move. All organisms perceive the same start-of-tick world.
    //    Resource sensors read one affinity-weighted signal: senseA * A/capA + senseB * B/capB.
    for (let i = 0; i < nOrg; i++) {
      const o = orgs[i];
      const ph = o.ph;
      const ch = Math.cos(o.heading), sh = Math.sin(o.heading);
      const range = ph.traits[T_SENSE];
      for (let k = 0; k < 3; k++) {
        let dx: number, dy: number;
        if (k === 0) { dx = ch * ca + sh * sa; dy = sh * ca - ch * sa; }
        else if (k === 1) { dx = ch; dy = sh; }
        else { dx = ch * ca - sh * sa; dy = sh * ca + ch * sa; }
        let rA = 0, rB = 0, b = 0;
        for (let j = 1; j <= 3; j++) {
          const d = (range * j) / 3;
          const px = o.x + dx * d, py = o.y + dy * d;
          if (px < 0 || py < 0 || px >= W || py >= H) continue; // outside reads as barren
          const cell = Math.floor(py / cs) * cols + Math.floor(px / cs);
          rA += resA[cell];
          rB += resB[cell];
          b += cell === o.cell ? bio[cell] - ph.mass : bio[cell];
        }
        inp[k] = Math.min(1, ph.senseA * rA * invCapA3 + ph.senseB * rB * invCapB3);
        b /= 3;
        inp[3 + k] = b / (b + SENSE_BIOMASS_HALF);
      }
      inp[6] = Math.min(1, (capA > 0 ? (ph.senseA * resA[o.cell]) / capA : 0) + ph.senseB * resB[o.cell] * invCapB);
      inp[7] = o.energy / ph.capacity;
      think(o.genome, N_TRAITS, inp, out);

      const nextSpeed = out[1] * ph.vmax;
      const turn = cfg.model >= 3
        ? boundedTurn(out[0] * cfg.maxTurn, nextSpeed, Math.max(cfg.minTurnRadius ?? 12, ph.radius * 2))
        : out[0] * cfg.maxTurn;
      let h = o.heading + turn;
      if (h > Math.PI) h -= TAU; else if (h < -Math.PI) h += TAU;
      o.heading = h;
      o.speed = nextSpeed;
      let x = o.x + Math.cos(h) * o.speed, y = o.y + Math.sin(h) * o.speed;
      if (x < 0) x = 0; else if (x > maxX) x = maxX;
      if (y < 0) y = 0; else if (y > maxY) y = maxY;
      o.x = x; o.y = y;
    }

    // 3. uptake requests at the new position.
    //    Multi-resource type-II response with ONE shared intake budget per organism:
    //      q_k = intakeMax * s_k / (s_A + s_B + h) / (1 + v^2),   s_k = affinity_k * R_k
    //    so q_A + q_B <= intakeMax whatever the affinities are.
    demA.fill(0);
    demB.fill(0);
    for (let i = 0; i < nOrg; i++) {
      const o = orgs[i];
      const ph = o.ph;
      const cell = (o.cell = this.cellAt(o.x, o.y));
      const sA = ph.affA * resA[cell], sB = ph.affB * resB[cell];
      const v = o.speed / en.feedSpeed;
      const den = sA + sB + en.halfSaturation;
      let qA = (ph.intakeMax * sA) / den / (1 + v * v);
      let qB = (ph.intakeMax * sB) / den / (1 + v * v);
      const tot = qA + qB;
      const room = (ph.capacity - o.energy) / en.assimilation;
      if (tot > room) {
        if (room > 0) { qA = room * (qA / tot); qB = room * (qB / tot); }
        else { qA = 0; qB = 0; }
      }
      o.reqA = qA;
      o.reqB = qB;
      demA[cell] += qA;
      demB[cell] += qB;
    }
    // per-cell, per-resource scale: if requests exceed the stock, everyone is scaled equally
    // (order-independent scramble competition). Stored negated to mark the cell as processed.
    for (let i = 0; i < nOrg; i++) {
      const cell = orgs[i].cell;
      if (demA[cell] > 0) demA[cell] = demA[cell] > resA[cell] ? -resA[cell] / demA[cell] : -1;
      if (demB[cell] > 0) demB[cell] = demB[cell] > resB[cell] ? -resB[cell] / demB[cell] : -1;
    }

    // 4. uptake, metabolism, mortality
    for (let i = 0; i < nOrg; i++) {
      const o = orgs[i];
      const ph = o.ph, cell = o.cell, ty = o.type;
      const gotA = o.reqA * -demA[cell];
      resA[cell] -= gotA;
      o.energy += gotA * en.assimilation;
      this.ledger.assimilationLoss += gotA * (1 - en.assimilation);
      c.typeUptakeA[ty] += gotA;
      if (o.reqB > 0) {
        const gotB = o.reqB * -demB[cell];
        resB[cell] -= gotB;
        o.energy += gotB * en.assimilation;
        this.ledger.assimilationLoss += gotB * (1 - en.assimilation);
        c.typeUptakeB[ty] += gotB;
      }
      const move = ph.moveCoef * o.speed * o.speed;
      const cost = ph.fixedCost + move;
      const paid = cost < o.energy ? cost : o.energy;
      o.energy -= paid;
      this.ledger.metabolism += paid;
      if (paid === cost) { c.typeFixedCost[ty] += ph.fixedCost; c.typeMoveCost[ty] += move; }
      else { const fr = cost > 0 ? paid / cost : 0; c.typeFixedCost[ty] += ph.fixedCost * fr; c.typeMoveCost[ty] += move * fr; }
      o.age++;
      let dead = false;
      if (o.energy <= 0) { dead = true; c.starved++; }
      const hz = life.baseHazard + life.gompertzA * Math.exp(o.age / life.gompertzTau);
      if (rng.next() < hz && !dead) { dead = true; c.hazard++; }
      if (dead) {
        o.alive = false;
        if (cfg.corpseRecycling) resA[cell] += o.energy; // model 1: reserve returns to the cell
        else this.ledger.corpse += o.energy; // model 2: dissipated
        o.energy = 0;
        c.deaths++;
        c.typeDeaths[ty]++;
        c.deathAgeSum += o.age;
        c.lrsSum += o.offspring;
        c.lrsSq += o.offspring * o.offspring;
        this.lineage.death(o.id, this.tick);
      }
    }
    for (let i = 0; i < nOrg; i++) {
      const cell = orgs[i].cell;
      if (resA[cell] < 0) resA[cell] = 0; // float guard
      if (resB[cell] < 0) resB[cell] = 0;
    }

    // 5. reproduction (asexual). Newborns act from the next tick.
    const born: Organism[] = [];
    let alive = 0;
    for (let i = 0; i < nOrg; i++) {
      const o = orgs[i];
      if (!o.alive) continue;
      alive++;
      const ph = o.ph;
      if (o.age < life.maturityAge) continue;
      if (o.energy < ph.traits[T_REPRO] * ph.capacity) continue;
      const transfer = ph.traits[T_INVEST] * o.energy;
      if (transfer <= ph.buildCost) continue; // cannot afford a body like its own
      if (alive + born.length + (nOrg - i - 1) >= cfg.maxPopulation) { c.capHits++; continue; }
      const { genome } = mutate(o.genome, rng, cfg.mutation);
      // discrete genes: type is always inherited; counts may step by one
      const corners = o.type === TYPE_GRAZER ? mutateCount(o.corners, cfg.morph.corners, rng) : 0;
      const lobes = o.type === TYPE_GENERALIST ? mutateCount(o.lobes, cfg.morph.lobes, rng) : 0;
      const cph = expressPhenotype(genome, cfg, o.type, corners, lobes);
      const build = cph.buildCost;
      o.energy -= transfer;
      if (transfer <= build) {
        // mutant body too expensive for the endowment: investment is lost
        this.ledger.birthCost += transfer;
        c.stillbirths++;
        continue;
      }
      let endow = transfer - build;
      this.ledger.birthCost += build;
      if (endow > cph.capacity) { o.energy += endow - cph.capacity; endow = cph.capacity; }
      const ang = rng.next() * TAU;
      const dist = ph.radius + cph.radius;
      const id = this.nextId++;
      born.push({
        id, parentId: o.id, founderId: o.founderId, generation: o.generation + 1, birthTick: this.tick + 1,
        genome, type: o.type, corners, lobes, ph: cph,
        x: Math.min(maxX, Math.max(0, o.x + Math.cos(ang) * dist)),
        y: Math.min(maxY, Math.max(0, o.y + Math.sin(ang) * dist)),
        heading: (rng.next() - 0.5) * TAU, speed: 0, energy: endow, age: 0, offspring: 0,
        cell: 0, reqA: 0, reqB: 0, alive: true,
      });
      o.offspring++;
      c.births++;
      c.typeBirths[o.type]++;
      c.parentAgeSum += o.age;
      this.totalBirths++;
      this.lineage.birth(id, o.id, this.tick + 1, o.type, corners, lobes, genome);
    }

    // 6. remove the dead, add the newborn (stable order => deterministic)
    if (alive !== nOrg) {
      let w = 0;
      for (let i = 0; i < nOrg; i++) if (orgs[i].alive) orgs[w++] = orgs[i];
      orgs.length = w;
    }
    for (let i = 0; i < born.length; i++) orgs.push(born[i]);

    // 7. resource regrowth, each resource independently: dR = (r R + influx) (1 - R/K)
    this.ledger.regrowth += this.regrow(resA, this.fertility, this.env);
    this.ledger.regrowthB += this.regrow(resB, this.fertilityB, this.envB);

    // 8. clock, bookkeeping
    this.tick++;
    if (orgs.length === 0 && !this.extinct) {
      this.extinct = true;
      this.logEvent('extinction', 'population reached zero');
    }
    if ((this.tick & 511) === 0) this.lineage.compact();
    if (this.tick % this.sampleInterval === 0) {
      this.history.push(sampleNow(this));
      this.counters = emptyCounters(this.tick);
      if (this.history.length >= cfg.metrics.maxSamples) {
        this.history = decimate(this.history);
        this.sampleInterval *= 2;
      }
    }
  }

  private regrow(res: Float64Array, fert: Float64Array, env: EnvConfig): number {
    const r = env.regrowthRate, influx = env.influx, cap = env.cellCapacity;
    let grown = 0;
    for (let i = 0; i < res.length; i++) {
      const K = cap * fert[i];
      const R = res[i];
      let nr = K > 0 ? R + (r * R + influx) * (1 - R / K) : 0;
      if (nr < 0) nr = 0;
      grown += nr - R;
      res[i] = nr;
    }
    return grown;
  }

  /** Total energy currently in the world (both resources + reserves). */
  totalEnergy(): number {
    let e = 0;
    for (let i = 0; i < this.resource.length; i++) e += this.resource[i] + this.resourceB[i];
    for (const o of this.orgs) e += o.energy;
    return e;
  }

  /** Energy the ledger says should exist. totalEnergy() must match this. */
  expectedEnergy(): number {
    const l = this.ledger;
    return l.injected + l.regrowth + l.regrowthB - l.metabolism - l.assimilationLoss - l.birthCost - l.corpse;
  }

  /** Living organisms per ecological type. */
  typeCounts(): number[] {
    const n = new Array(N_TYPES).fill(0);
    for (const o of this.orgs) n[o.type]++;
    return n;
  }

  /** Nearest living organism within `maxDist`, for inspection tools. */
  organismAt(x: number, y: number, maxDist = 20): Organism | null {
    let best: Organism | null = null, bd = maxDist * maxDist;
    for (const o of this.orgs) {
      const d = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  /** Complete JSON-serialisable state. restore(snapshot()) continues identically. */
  snapshot(): Snapshot {
    return {
      version: 2,
      model: this.cfg.model,
      cfg: JSON.parse(JSON.stringify(this.cfg)),
      env: { ...this.env },
      envB: { ...this.envB },
      tick: this.tick,
      nextId: this.nextId,
      totalBirths: this.totalBirths,
      rng: this.rng.state(),
      resource: Array.from(this.resource),
      resourceB: Array.from(this.resourceB),
      ledger: { ...this.ledger },
      counters: JSON.parse(JSON.stringify(this.counters)),
      history: cloneNumbers(this.history),
      sampleInterval: this.sampleInterval,
      events: this.events.map((e) => ({ ...e })),
      lineage: this.lineage.toJSON(),
      lineageMeta: { pruned: this.lineage.prunedCount, thinned: this.lineage.thinnedCount },
      orgs: this.orgs.map((o) => ({
        id: o.id, parentId: o.parentId, founderId: o.founderId, generation: o.generation,
        birthTick: o.birthTick, genome: Array.from(o.genome), type: o.type, corners: o.corners, lobes: o.lobes,
        x: o.x, y: o.y, heading: o.heading, speed: o.speed, energy: o.energy, age: o.age, offspring: o.offspring,
      })),
      ...(this.migratedFrom ? { migratedFrom: this.migratedFrom } : {}),
    };
  }

  /**
   * 32-bit FNV-1a over the exact bits of all dynamic scientific state.
   * Model 1 uses the STAGE 1 layout so hashes remain comparable with recorded baselines;
   * model 2 additionally covers resource B and the discrete genes.
   */
  stateHash(): number {
    let h = 0x811c9dc5;
    const buf = new Float64Array(1);
    const u = new Uint32Array(buf.buffer);
    const mix = (v: number) => {
      buf[0] = v;
      h = Math.imul(h ^ u[0], 0x01000193);
      h = Math.imul(h ^ u[1], 0x01000193);
    };
    const v2 = this.cfg.model !== 1;
    mix(this.tick);
    mix(this.nextId);
    for (const s of this.rng.state()) mix(s);
    for (let i = 0; i < this.resource.length; i++) mix(this.resource[i]);
    if (v2) for (let i = 0; i < this.resourceB.length; i++) mix(this.resourceB[i]);
    for (const o of this.orgs) {
      mix(o.id); mix(o.x); mix(o.y); mix(o.heading); mix(o.energy); mix(o.age);
      if (v2) { mix(o.type); mix(o.corners); mix(o.lobes); }
      for (let i = 0; i < o.genome.length; i++) mix(o.genome[i]);
    }
    if (v2) {
      mix(this.totalBirths);
      for (const o of this.orgs) { mix(o.speed); mix(o.offspring); mix(o.parentId); mix(o.founderId); mix(o.generation); mix(o.birthTick); }
      const parameters = JSON.stringify({ cfg: this.cfg, env: this.env, envB: this.envB, ledger: this.ledger, counters: this.counters });
      for (let i = 0; i < parameters.length; i++) { h = Math.imul(h ^ parameters.charCodeAt(i), 0x01000193); }
    }
    return h >>> 0;
  }
}
