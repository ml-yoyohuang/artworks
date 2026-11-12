/**
 * EVOLUTION MACHINE — simulation core.
 * Renderer-independent, deterministic for a given config (same JS engine),
 * fixed logical time step. See docs/EVOLUTION_MODEL.md for the rules.
 */
import { Rng, type RngState } from './rng';
import { think, N_IN, N_OUT } from './brain';
import { type SimConfig, type EnvConfig } from './config';
import {
  type Phenotype, expressPhenotype, mutate, randomGenome,
  N_TRAITS, GENOME_LEN, T_SPEED, T_SENSE, T_REPRO, T_INVEST,
} from './genome';
import { Lineage } from './lineage';
import { type Sample, type Counters, emptyCounters, sampleNow, decimate } from './metrics';

export interface Organism {
  id: number;
  parentId: number; // -1 for founders
  founderId: number; // id of the founding ancestor
  generation: number; // 0 for founders, parent.generation + 1 otherwise
  birthTick: number;
  genome: Float64Array; // genotype (immutable during life)
  ph: Phenotype; // phenotype derived from genome
  // physiological / kinematic state
  x: number;
  y: number;
  heading: number;
  speed: number; // realised speed in the last tick
  energy: number;
  age: number;
  offspring: number;
  // scratch
  cell: number;
  req: number;
  alive: boolean;
}

export interface SimEvent {
  tick: number;
  type: 'extinction' | 'environment' | 'introduction';
  detail: string;
}

export interface Ledger {
  /** energy added from outside: initial resource, founders, introductions */
  injected: number;
  /** net resource regrowth (signed) */
  regrowth: number;
  metabolism: number;
  assimilationLoss: number;
  birthCost: number;
}

export interface Snapshot {
  version: 1;
  cfg: SimConfig;
  env: EnvConfig;
  tick: number;
  nextId: number;
  rng: RngState;
  resource: number[];
  ledger: Ledger;
  counters: Counters;
  history: Sample[];
  sampleInterval: number;
  events: SimEvent[];
  lineage: number[][];
  orgs: Array<Omit<Organism, 'genome' | 'ph' | 'cell' | 'req' | 'alive'> & { genome: number[] }>;
}

const SENSE_BIOMASS_HALF = 2;
const TAU = Math.PI * 2;
const MAX_EVENTS = 500;

export class Simulation {
  readonly cfg: SimConfig;
  /** live environment parameters; change via setEnvironment() */
  env: EnvConfig;
  tick = 0;
  nextId = 1;
  orgs: Organism[] = [];
  readonly cols: number;
  readonly rows: number;
  /** resource energy per cell */
  readonly resource: Float64Array;
  /** static fertility in (0,1]; carrying capacity of a cell = env.cellCapacity * fertility */
  readonly fertility: Float64Array;
  /** body mass per cell, rebuilt each tick before sensing */
  readonly biomass: Float64Array;
  ledger: Ledger = { injected: 0, regrowth: 0, metabolism: 0, assimilationLoss: 0, birthCost: 0 };
  counters: Counters = emptyCounters(0);
  history: Sample[] = [];
  sampleInterval: number;
  events: SimEvent[] = [];
  lineage = new Lineage();

  private rng: Rng;
  private demand: Float64Array;
  private inp = new Float64Array(N_IN);
  private out = new Float64Array(N_OUT);
  private extinct = false;

  constructor(cfg: SimConfig, snap?: Snapshot) {
    this.cfg = JSON.parse(JSON.stringify(cfg));
    this.env = { ...this.cfg.env };
    this.cols = Math.ceil(cfg.width / cfg.cellSize);
    this.rows = Math.ceil(cfg.height / cfg.cellSize);
    const n = this.cols * this.rows;
    this.resource = new Float64Array(n);
    this.fertility = new Float64Array(n);
    this.biomass = new Float64Array(n);
    this.demand = new Float64Array(n);
    this.sampleInterval = cfg.metrics.sampleInterval;
    this.rng = new Rng(cfg.seed);
    this.buildFertility();

    if (snap) {
      this.env = { ...snap.env };
      this.tick = snap.tick;
      this.nextId = snap.nextId;
      this.rng = new Rng(snap.rng);
      this.resource.set(snap.resource);
      this.ledger = { ...snap.ledger };
      this.counters = { ...snap.counters };
      this.history = snap.history.map((s) => ({ ...s }));
      this.sampleInterval = snap.sampleInterval;
      this.events = snap.events.map((e) => ({ ...e }));
      this.lineage = Lineage.fromJSON(snap.lineage);
      for (const s of snap.orgs) {
        const genome = Float64Array.from(s.genome);
        this.orgs.push({ ...s, genome, ph: expressPhenotype(genome, this.cfg), cell: 0, req: 0, alive: true });
      }
      this.extinct = this.orgs.length === 0;
      return;
    }

    for (let i = 0; i < n; i++) {
      this.resource[i] = this.env.cellCapacity * this.fertility[i];
      this.ledger.injected += this.resource[i];
    }
    const f = cfg.founders;
    for (let i = 0; i < f.count; i++) {
      const genome = f.genomes && f.genomes.length
        ? Float64Array.from(f.genomes[i % f.genomes.length])
        : randomGenome(this.rng, f.traitSd, f.weightSd);
      this.spawn(genome, this.rng.next() * cfg.width, this.rng.next() * cfg.height, f.energyFrac);
    }
    this.history.push(sampleNow(this));
  }

  static restore(snap: Snapshot): Simulation {
    return new Simulation(snap.cfg, snap);
  }

  /** Smooth seeded value noise -> patchy fertility. Uses its own RNG stream. */
  private buildFertility(): void {
    const { patchiness, patchScale, seed } = this.cfg;
    const r = new Rng((seed ^ 0x9e3779b1) >>> 0);
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
        this.fertility[cy * this.cols + cx] = 1 - patchiness * (1 - sm(t));
      }
    }
  }

  private cellAt(x: number, y: number): number {
    return Math.floor(y / this.cfg.cellSize) * this.cols + Math.floor(x / this.cfg.cellSize);
  }

  private spawn(genome: Float64Array, x: number, y: number, energyFrac: number): Organism {
    const ph = expressPhenotype(genome, this.cfg);
    const id = this.nextId++;
    const o: Organism = {
      id, parentId: -1, founderId: id, generation: 0, birthTick: this.tick,
      genome, ph, x, y, heading: (this.rng.next() - 0.5) * TAU, speed: 0,
      energy: energyFrac * ph.capacity, age: 0, offspring: 0, cell: 0, req: 0, alive: true,
    };
    this.ledger.injected += o.energy;
    this.orgs.push(o);
    this.lineage.birth(id, -1, this.tick);
    this.extinct = false;
    return o;
  }

  /** Experimenter intervention: introduce a new founder organism. */
  introduce(genome: ArrayLike<number>, x: number, y: number, energyFrac = this.cfg.founders.energyFrac): Organism {
    if (genome.length !== GENOME_LEN) throw new Error(`genome length must be ${GENOME_LEN}`);
    const cx = Math.min(this.cfg.width - 1e-6, Math.max(0, x));
    const cy = Math.min(this.cfg.height - 1e-6, Math.max(0, y));
    const o = this.spawn(Float64Array.from(genome), cx, cy, energyFrac);
    this.logEvent('introduction', `organism ${o.id}`);
    return o;
  }

  /** Experimenter intervention: change environment parameters from now on. */
  setEnvironment(patch: Partial<EnvConfig>): void {
    Object.assign(this.env, patch);
    this.logEvent('environment', JSON.stringify(patch));
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
    const orgs = this.orgs, res = this.resource, bio = this.biomass, dem = this.demand;
    const W = cfg.width, H = cfg.height, cs = cfg.cellSize, cols = this.cols;
    const maxX = W - 1e-6, maxY = H - 1e-6;
    const ca = Math.cos(cfg.sensorAngle), sa = Math.sin(cfg.sensorAngle);
    const invCap3 = 1 / (3 * this.env.cellCapacity);
    const inp = this.inp, out = this.out, rng = this.rng;
    const nOrg = orgs.length;

    // 1. biomass field (what organisms can sense of each other)
    bio.fill(0);
    for (let i = 0; i < nOrg; i++) {
      const o = orgs[i];
      o.cell = this.cellAt(o.x, o.y);
      bio[o.cell] += o.ph.mass;
    }

    // 2. sense -> think -> move. All organisms perceive the same start-of-tick world.
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
        let r = 0, b = 0;
        for (let j = 1; j <= 3; j++) {
          const d = (range * j) / 3;
          const px = o.x + dx * d, py = o.y + dy * d;
          if (px < 0 || py < 0 || px >= W || py >= H) continue; // outside reads as barren
          const c = Math.floor(py / cs) * cols + Math.floor(px / cs);
          r += res[c];
          b += c === o.cell ? bio[c] - ph.mass : bio[c];
        }
        inp[k] = Math.min(1, r * invCap3);
        b /= 3;
        inp[3 + k] = b / (b + SENSE_BIOMASS_HALF);
      }
      inp[6] = Math.min(1, res[o.cell] / this.env.cellCapacity);
      inp[7] = o.energy / ph.capacity;
      think(o.genome, N_TRAITS, inp, out);

      let h = o.heading + out[0] * cfg.maxTurn;
      if (h > Math.PI) h -= TAU; else if (h < -Math.PI) h += TAU;
      o.heading = h;
      o.speed = out[1] * ph.traits[T_SPEED];
      let x = o.x + Math.cos(h) * o.speed, y = o.y + Math.sin(h) * o.speed;
      if (x < 0) x = 0; else if (x > maxX) x = maxX;
      if (y < 0) y = 0; else if (y > maxY) y = maxY;
      o.x = x; o.y = y;
    }

    // 3. feeding requests at the new position (scramble competition within a cell)
    dem.fill(0);
    for (let i = 0; i < nOrg; i++) {
      const o = orgs[i];
      const c = (o.cell = this.cellAt(o.x, o.y));
      const R = res[c];
      const v = o.speed / en.feedSpeed;
      let req = (o.ph.intakeMax * R) / (R + en.halfSaturation) / (1 + v * v);
      const room = (o.ph.capacity - o.energy) / en.assimilation;
      if (req > room) req = room > 0 ? room : 0;
      o.req = req;
      dem[c] += req;
    }
    // per-cell scale factor: if requests exceed the cell's content, share proportionally
    for (let i = 0; i < nOrg; i++) {
      const c = orgs[i].cell;
      if (dem[c] > 0) dem[c] = dem[c] > res[c] ? -res[c] / dem[c] : -1; // store -scale (negative = processed)
    }

    // 4. uptake, metabolism, mortality
    const c = this.counters;
    for (let i = 0; i < nOrg; i++) {
      const o = orgs[i];
      const got = o.req * -dem[o.cell];
      res[o.cell] -= got;
      o.energy += got * en.assimilation;
      this.ledger.assimilationLoss += got * (1 - en.assimilation);
      const cost = o.ph.fixedCost + o.ph.moveCoef * o.speed * o.speed;
      const paid = cost < o.energy ? cost : o.energy;
      o.energy -= paid;
      this.ledger.metabolism += paid;
      o.age++;
      let dead = false;
      if (o.energy <= 0) { dead = true; c.starved++; }
      const hz = life.baseHazard + life.gompertzA * Math.exp(o.age / life.gompertzTau);
      if (rng.next() < hz && !dead) { dead = true; c.hazard++; }
      if (dead) {
        o.alive = false;
        res[o.cell] += o.energy; // corpse energy returns to the cell
        o.energy = 0;
        c.deaths++;
        c.deathAgeSum += o.age;
        this.lineage.death(o.id, this.tick);
      }
    }
    for (let i = 0; i < nOrg; i++) {
      const cell = orgs[i].cell;
      if (res[cell] < 0) res[cell] = 0; // float guard
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
      if (transfer <= en.birthCostPerMass * ph.mass) continue; // cannot afford a body like its own
      if (alive + born.length + (nOrg - i - 1) >= cfg.maxPopulation) { c.capHits++; continue; }
      const { genome } = mutate(o.genome, rng, cfg.mutation);
      const cph = expressPhenotype(genome, cfg);
      const build = en.birthCostPerMass * cph.mass;
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
        genome, ph: cph,
        x: Math.min(maxX, Math.max(0, o.x + Math.cos(ang) * dist)),
        y: Math.min(maxY, Math.max(0, o.y + Math.sin(ang) * dist)),
        heading: (rng.next() - 0.5) * TAU, speed: 0, energy: endow, age: 0, offspring: 0,
        cell: 0, req: 0, alive: true,
      });
      o.offspring++;
      c.births++;
      c.parentAgeSum += o.age;
      this.lineage.birth(id, o.id, this.tick + 1);
    }

    // 6. remove the dead, add the newborn (stable order => deterministic)
    if (alive !== nOrg) {
      let w = 0;
      for (let i = 0; i < nOrg; i++) if (orgs[i].alive) orgs[w++] = orgs[i];
      orgs.length = w;
    }
    for (let i = 0; i < born.length; i++) orgs.push(born[i]);

    // 7. resource regrowth: dR = (r R + influx) (1 - R/K)
    const r = this.env.regrowthRate, influx = this.env.influx, cap = this.env.cellCapacity;
    const fert = this.fertility;
    let grown = 0;
    for (let i = 0; i < res.length; i++) {
      const K = cap * fert[i];
      const R = res[i];
      let nr = K > 0 ? R + (r * R + influx) * (1 - R / K) : 0;
      if (nr < 0) nr = 0;
      grown += nr - R;
      res[i] = nr;
    }
    this.ledger.regrowth += grown;

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

  /** Total energy currently in the world (resource + reserves). */
  totalEnergy(): number {
    let e = 0;
    for (let i = 0; i < this.resource.length; i++) e += this.resource[i];
    for (const o of this.orgs) e += o.energy;
    return e;
  }

  /** Energy the ledger says should exist. totalEnergy() must match this. */
  expectedEnergy(): number {
    const l = this.ledger;
    return l.injected + l.regrowth - l.metabolism - l.assimilationLoss - l.birthCost;
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
      version: 1,
      cfg: JSON.parse(JSON.stringify(this.cfg)),
      env: { ...this.env },
      tick: this.tick,
      nextId: this.nextId,
      rng: this.rng.state(),
      resource: Array.from(this.resource),
      ledger: { ...this.ledger },
      counters: { ...this.counters },
      history: this.history.map((s) => ({ ...s })),
      sampleInterval: this.sampleInterval,
      events: this.events.map((e) => ({ ...e })),
      lineage: this.lineage.toJSON(),
      orgs: this.orgs.map((o) => ({
        id: o.id, parentId: o.parentId, founderId: o.founderId, generation: o.generation,
        birthTick: o.birthTick, genome: Array.from(o.genome), x: o.x, y: o.y, heading: o.heading,
        speed: o.speed, energy: o.energy, age: o.age, offspring: o.offspring,
      })),
    };
  }

  /** 32-bit FNV-1a over the exact bits of all dynamic state. Equal hash <=> (practically) equal state. */
  stateHash(): number {
    let h = 0x811c9dc5;
    const buf = new Float64Array(1);
    const u = new Uint32Array(buf.buffer);
    const mix = (v: number) => {
      buf[0] = v;
      h = Math.imul(h ^ u[0], 0x01000193);
      h = Math.imul(h ^ u[1], 0x01000193);
    };
    mix(this.tick);
    mix(this.nextId);
    for (const s of this.rng.state()) mix(s);
    for (let i = 0; i < this.resource.length; i++) mix(this.resource[i]);
    for (const o of this.orgs) {
      mix(o.id); mix(o.x); mix(o.y); mix(o.heading); mix(o.energy); mix(o.age);
      for (let i = 0; i < o.genome.length; i++) mix(o.genome[i]);
    }
    return h >>> 0;
  }
}
