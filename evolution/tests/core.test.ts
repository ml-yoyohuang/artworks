import { describe, it, expect } from 'vitest';
import {
  Simulation, makeConfig, Rng, mutate, randomGenome, expressTrait, rawForTrait, expressPhenotype,
  Lineage, Clock, GENOME_LEN, N_TRAITS, TRAITS, T_SIZE, T_SPEED, T_SENSE, T_MARKER_A, T_MARKER_B,
  DEFAULT_CONFIG, think, N_IN, N_OUT,
} from '../src/sim';
import { decimate } from '../src/sim/metrics';

const small = (patch: any = {}) =>
  makeConfig({ width: 320, height: 240, founders: { count: 60 }, ...patch });

describe('rng', () => {
  it('is deterministic and restorable from state', () => {
    const a = new Rng(42), b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
    const c = new Rng(a.state());
    for (let i = 0; i < 100; i++) expect(c.gauss()).toBe(a.gauss());
  });
  it('is roughly uniform / standard normal', () => {
    const r = new Rng(7);
    let s = 0, g = 0, g2 = 0;
    const n = 200000;
    for (let i = 0; i < n; i++) { s += r.next(); const x = r.gauss(); g += x; g2 += x * x; }
    expect(s / n).toBeCloseTo(0.5, 2);
    expect(g / n).toBeCloseTo(0, 1);
    expect(g2 / n).toBeCloseTo(1, 1);
  });
});

describe('genotype -> phenotype', () => {
  it('expresses every trait inside its declared range for any raw value', () => {
    for (let i = 0; i < N_TRAITS; i++)
      for (const raw of [-1e6, -50, -3, 0, 3, 50, 1e6]) {
        const v = expressTrait(i, raw);
        expect(v).toBeGreaterThanOrEqual(TRAITS[i].min - 1e-9);
        expect(v).toBeLessThanOrEqual(TRAITS[i].max + 1e-9);
      }
  });
  it('rawForTrait inverts expressTrait', () => {
    for (let i = 0; i < N_TRAITS; i++) {
      const v = TRAITS[i].min + 0.37 * (TRAITS[i].max - TRAITS[i].min);
      expect(expressTrait(i, rawForTrait(i, v))).toBeCloseTo(v, 9);
    }
  });
  it('implements the declared tradeoffs: size, speed capacity and sense range all cost energy', () => {
    const base = new Float64Array(GENOME_LEN);
    const cost = (i: number, raw: number) => {
      const g = new Float64Array(base); g[i] = raw;
      return expressPhenotype(g, DEFAULT_CONFIG).fixedCost;
    };
    for (const i of [T_SIZE, T_SPEED, T_SENSE]) expect(cost(i, 2)).toBeGreaterThan(cost(i, -2));
    for (const i of [T_MARKER_A, T_MARKER_B]) expect(cost(i, 2)).toBe(cost(i, -2));
  });
  it('controller outputs are bounded and depend on inputs', () => {
    const g = randomGenome(new Rng(3), 0.5, 1);
    const out1 = new Float64Array(N_OUT), out2 = new Float64Array(N_OUT);
    think(g, N_TRAITS, new Float64Array(N_IN).fill(0.1), out1);
    think(g, N_TRAITS, new Float64Array(N_IN).fill(0.9), out2);
    expect(Math.abs(out1[0])).toBeLessThanOrEqual(1);
    expect(out1[1]).toBeGreaterThanOrEqual(0);
    expect(out1[1]).toBeLessThanOrEqual(1);
    expect(out1[0] !== out2[0] || out1[1] !== out2[1]).toBe(true);
  });
});

describe('Test B — mutation operator', () => {
  const m = { rate: 0.05, traitSd: 0.15, weightSd: 0.2 };
  it('mutates loci at the configured frequency with the configured effect sizes', () => {
    const rng = new Rng(11);
    const parent = randomGenome(rng, 0.5, 1);
    let mutated = 0, total = 0, tSq = 0, tN = 0, wSq = 0, wN = 0, sum = 0;
    for (let k = 0; k < 4000; k++) {
      const { genome, count } = mutate(parent, rng, m);
      let c = 0;
      for (let i = 0; i < GENOME_LEN; i++) {
        const d = genome[i] - parent[i];
        if (d !== 0) {
          c++; sum += d;
          if (i < N_TRAITS) { tSq += d * d; tN++; } else { wSq += d * d; wN++; }
        }
      }
      expect(c).toBe(count);
      mutated += c; total += GENOME_LEN;
    }
    expect(mutated / total).toBeGreaterThan(0.047);
    expect(mutated / total).toBeLessThan(0.053);
    expect(Math.sqrt(tSq / tN)).toBeCloseTo(0.15, 1);
    expect(Math.sqrt(wSq / wN)).toBeCloseTo(0.2, 1);
    expect(Math.abs(sum / mutated)).toBeLessThan(0.01); // unbiased
  });
  it('rate 0 copies the genome exactly and never aliases the parent', () => {
    const rng = new Rng(5);
    const parent = randomGenome(rng, 0.5, 1);
    const { genome, count } = mutate(parent, rng, { ...m, rate: 0 });
    expect(count).toBe(0);
    expect(Array.from(genome)).toEqual(Array.from(parent));
    expect(genome).not.toBe(parent);
  });
});

describe('Test A — inheritance', () => {
  it('without mutation every descendant carries its founder genome exactly', () => {
    const sim = new Simulation(small({ seed: 3, mutation: { rate: 0 } }));
    const founders = new Map(sim.orgs.map((o) => [o.id, Array.from(o.genome)]));
    sim.step(3000);
    const descendants = sim.orgs.filter((o) => o.generation > 0);
    expect(descendants.length).toBeGreaterThan(20);
    for (const o of descendants) expect(Array.from(o.genome)).toEqual(founders.get(o.founderId));
  });
  it('with mutation offspring resemble their parent far more than a random individual', () => {
    const sim = new Simulation(small({ seed: 4 }));
    sim.step(1500);
    const byId = new Map(sim.orgs.map((o) => [o.id, o]));
    const dist = (a: Float64Array, b: Float64Array) => {
      let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s);
    };
    let dp = 0, dr = 0, n = 0;
    for (const o of sim.orgs) {
      const p = byId.get(o.parentId);
      if (!p) continue;
      const other = sim.orgs[(n * 7919) % sim.orgs.length];
      if (other.founderId === o.founderId) continue;
      dp += dist(o.genome, p.genome); dr += dist(o.genome, other.genome); n++;
    }
    expect(n).toBeGreaterThan(10);
    expect(dp / n).toBeLessThan(0.25 * (dr / n));
    for (const o of sim.orgs) {
      const p = byId.get(o.parentId);
      if (p) { expect(o.generation).toBe(p.generation + 1); expect(o.founderId).toBe(p.founderId); }
    }
  });
});

describe('Test C — reproduction and mortality depend on energy', () => {
  it('a world with no resource starves completely and nobody is born', () => {
    const sim = new Simulation(small({ seed: 5, env: { cellCapacity: 1e-9, influx: 0, regrowthRate: 0 } }));
    sim.step(2000);
    expect(sim.orgs.length).toBe(0);
    expect(sim.nextId - 1).toBe(60); // no ids beyond the founders
    expect(sim.events.some((e) => e.type === 'extinction')).toBe(true);
    sim.step(10); // stepping an extinct world is safe
  });
  it('a richer world sustains a larger population (3 seeds)', () => {
    for (const seed of [1, 2, 3]) {
      const mean = (regrowthRate: number, influx: number) => {
        const sim = new Simulation(small({ seed, env: { regrowthRate, influx } }));
        sim.step(4000);
        const h = sim.history.filter((s) => s.tick >= 2500);
        return h.reduce((a, s) => a + s.population, 0) / h.length;
      };
      expect(mean(0.016, 0.006)).toBeGreaterThan(1.3 * mean(0.006, 0.002));
    }
  });
  it('organisms below their reproduction threshold do not reproduce', () => {
    const sim = new Simulation(small({ seed: 6 }));
    for (let t = 0; t < 600; t++) {
      const before = new Map(sim.orgs.map((o) => [o.id, { e: o.energy, n: o.offspring, thr: o.ph.traits[3] * o.ph.capacity, age: o.age }]));
      sim.step();
      for (const o of sim.orgs) {
        const b = before.get(o.id);
        if (b && o.offspring > b.n) expect(b.age + 1).toBeGreaterThanOrEqual(sim.cfg.life.maturityAge);
      }
    }
    expect(sim.orgs.every((o) => o.energy >= 0 && o.energy <= o.ph.capacity + 1e-9)).toBe(true);
  });
});

describe('energy accounting', () => {
  it('conserves energy: world total equals the ledger', () => {
    const sim = new Simulation(small({ seed: 7 }));
    for (let k = 0; k < 6; k++) {
      sim.step(500);
      const tot = sim.totalEnergy();
      expect(Math.abs(tot - sim.expectedEnergy()) / tot).toBeLessThan(1e-9);
    }
    expect(sim.ledger.metabolism).toBeGreaterThan(0);
    expect(sim.ledger.birthCost).toBeGreaterThan(0);
  });
  it('never produces non-finite or out-of-bounds state', () => {
    const sim = new Simulation(small({ seed: 8 }));
    sim.step(3000);
    for (const o of sim.orgs) {
      for (const v of [o.x, o.y, o.heading, o.energy, o.speed]) expect(Number.isFinite(v)).toBe(true);
      expect(o.x >= 0 && o.x < 320 && o.y >= 0 && o.y < 240).toBe(true);
      expect(o.genome.every(Number.isFinite)).toBe(true);
    }
    expect(sim.resource.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
  });
});

describe('Test G — reproducibility, save / restore', () => {
  it('same seed and config give bit-identical state; a different seed does not', () => {
    const a = new Simulation(small({ seed: 9 })), b = new Simulation(small({ seed: 9 }));
    const c = new Simulation(small({ seed: 10 }));
    a.step(1500); b.step(1500); c.step(1500);
    expect(a.stateHash()).toBe(b.stateHash());
    expect(a.history).toEqual(b.history);
    expect(a.stateHash()).not.toBe(c.stateHash());
  });
  it('stepping in chunks equals stepping at once', () => {
    const a = new Simulation(small({ seed: 9 })), b = new Simulation(small({ seed: 9 }));
    a.step(700);
    for (let i = 0; i < 700; i++) b.step();
    expect(a.stateHash()).toBe(b.stateHash());
  });
  it('restore(JSON(snapshot)) continues identically, including environment changes', () => {
    const a = new Simulation(small({ seed: 12 }));
    a.step(650);
    a.setEnvironment({ regrowthRate: 0.02 });
    a.step(100);
    const b = Simulation.restore(JSON.parse(JSON.stringify(a.snapshot())));
    expect(b.stateHash()).toBe(a.stateHash());
    a.step(900); b.step(900);
    expect(b.stateHash()).toBe(a.stateHash());
    expect(JSON.stringify(b.history)).toBe(JSON.stringify(a.history));
    expect(b.lineage.nodes.size).toBe(a.lineage.nodes.size);
    expect(b.env.regrowthRate).toBe(0.02);
  });
});

describe('neutral markers', () => {
  it('changing marker genes changes nothing in the simulation', () => {
    const base = new Simulation(small({ seed: 13 }));
    const genomes = base.orgs.map((o) => Array.from(o.genome));
    const flipped = genomes.map((g) => { const h = g.slice(); h[T_MARKER_A] += 3; h[T_MARKER_B] -= 2; return h; });
    const run = (gs: number[][]) => {
      const s = new Simulation(small({ seed: 13, mutation: { rate: 0 }, founders: { count: 60, genomes: gs } }));
      s.step(1500);
      return s.orgs.map((o) => [o.id, o.x, o.y, o.energy]);
    };
    expect(run(flipped)).toEqual(run(genomes));
  });
});

describe('interventions', () => {
  it('introduce() adds a founder and accounts for its energy', () => {
    const sim = new Simulation(small({ seed: 14 }));
    sim.step(100);
    const o = sim.introduce(randomGenome(new Rng(1), 0.5, 1), 100, 100);
    expect(o.founderId).toBe(o.id);
    sim.step(100);
    expect(Math.abs(sim.totalEnergy() - sim.expectedEnergy())).toBeLessThan(1e-6);
    expect(() => sim.introduce([1, 2, 3], 0, 0)).toThrow();
  });
});

describe('lineage', () => {
  it('prunes dead leaves and trims the dead trunk', () => {
    const l = new Lineage();
    l.birth(1, -1, 0); l.birth(2, 1, 1); l.birth(3, 2, 2); l.birth(4, 3, 3); l.birth(5, 3, 3); l.birth(6, 1, 4);
    l.death(6, 5);
    expect(l.nodes.has(6)).toBe(false);
    l.death(1, 6); l.death(2, 6); l.death(3, 6);
    expect(l.nodes.size).toBe(5); // 1,2,3 kept: they have living descendants
    expect(l.mrca(4, 5)).toBe(3);
    l.compact();
    expect([...l.nodes.keys()].sort()).toEqual([3, 4, 5]); // trunk 1->2 trimmed, MRCA kept
    l.death(4, 7);
    l.compact();
    expect([...l.nodes.keys()]).toEqual([5]);
  });
  it('stays bounded in a long run and covers every living organism', () => {
    const sim = new Simulation(small({ seed: 15 }));
    let maxNodes = 0;
    for (let k = 0; k < 40; k++) { sim.step(512); maxNodes = Math.max(maxNodes, sim.lineage.nodes.size); }
    expect(sim.nextId).toBeGreaterThan(1500); // many more organisms have lived than are retained
    expect(maxNodes).toBeLessThan(sim.nextId / 3);
    for (const o of sim.orgs) expect(sim.lineage.ancestors(o.id)[0]).toBe(o.id);
  });
});

describe('metrics and clock', () => {
  it('history is bounded by decimation and keeps interval counts', () => {
    const sim = new Simulation(small({ seed: 16, metrics: { sampleInterval: 10, maxSamples: 64 } }));
    sim.step(3000);
    expect(sim.history.length).toBeLessThan(64);
    expect(sim.sampleInterval).toBeGreaterThan(10);
    const births = sim.history.reduce((a, s) => a + s.births, 0) + sim.counters.births;
    expect(births).toBe(sim.nextId - 1 - 60);
    const s = sim.history[sim.history.length - 1];
    expect(s.traitMean.length).toBe(N_TRAITS);
    expect(s.population).toBeGreaterThan(0);
  });
  it('decimate sums counters', () => {
    const sim = new Simulation(small({ seed: 16, metrics: { sampleInterval: 50 } }));
    sim.step(400);
    const d = decimate(sim.history);
    expect(d.reduce((a, s) => a + s.births, 0)).toBe(sim.history.reduce((a, s) => a + s.births, 0));
    expect(d[d.length - 1].tick).toBe(400);
  });
  it('clock converts real time to ticks, pauses, and caps bursts', () => {
    const c = new Clock(60, 100);
    expect(c.advance(0.5)).toBe(30);
    c.paused = true;
    expect(c.advance(1)).toBe(0);
    c.paused = false;
    c.ticksPerSecond = 6000;
    expect(c.advance(1)).toBe(100);
    c.ticksPerSecond = 1;
    expect(c.advance(0.6) + c.advance(0.6)).toBe(1);
  });
});
