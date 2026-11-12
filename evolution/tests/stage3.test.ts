import { describe, it, expect } from 'vitest';
import { Simulation, makeConfig, legacyConfig, Rng, mutateCount, expressPhenotype, GENOME_LEN } from '../src/sim';
import golden from './fixtures/golden-v1.json';
import snapshotV1 from './fixtures/snapshot-v1.json';
import { shapeOf } from '../src/app/creatures';

const small = (patch: any = {}) => makeConfig({ width: 240, height: 160, founders: { count: 60 }, ...patch });
describe('legacy scientific baselines', () => {
  for (const seed of [3, 9, 42]) it(`matches pre-extension hash for seed ${seed}`, () => {
    const sim = new Simulation(legacyConfig({ seed, width: 320, height: 240, founders: { count: 60 } })); sim.step(2500);
    expect(sim.stateHash()).toBe((golden.hashes as any)[`small-seed${seed}-t2500`].hash);
  });
  it('continues the original v1 snapshot and preserves unavailable history', () => {
    const sim = Simulation.restore(snapshotV1);
    expect(sim.stateHash()).toBe(golden.snapshotV1.hashAtSave);
    expect(sim.history[0].typePop).toBeUndefined();
    expect(sim.lineage.chain(sim.orgs[0].id)[0].genome).toBeNull();
    expect(Number.isNaN(sim.totalBirths)).toBe(true);
    sim.step(800); expect(sim.stateHash()).toBe(golden.snapshotV1.hashAfter800);
    const again = Simulation.restore(JSON.parse(JSON.stringify(sim.snapshot())));
    sim.step(300); again.step(300); expect(again.stateHash()).toBe(sim.stateHash());
  });
});
describe('two-resource ecology', () => {
  it('accounts for both resources, morphology costs, death and interventions', () => {
    const sim = new Simulation(small({ seed: 42 }));
    for (let i = 0; i < 10; i++) {
      sim.step(300);
      if (i === 3) { sim.setEnvironment({ cellCapacity: 3 }); sim.setEnvironment({ cellCapacity: 0 }, 'B'); }
      if (i === 5) sim.setEnvironment({ cellCapacity: 10 }, 'B');
      expect(Math.abs(sim.totalEnergy() - sim.expectedEnergy()) / Math.max(1, sim.totalEnergy())).toBeLessThan(1e-9);
      expect(sim.resource.every(v => v >= 0 && Number.isFinite(v))).toBe(true);
      expect(sim.resourceB.every(v => v >= 0 && Number.isFinite(v))).toBe(true);
    }
    expect(sim.ledger.corpse).toBeGreaterThan(0);
    expect(sim.ledger.regrowthB).not.toBe(0);
  });
  it('zero-capacity resources are genuinely absent and starvation stays finite', () => {
    const sim = new Simulation(small({ env: { cellCapacity: 0, influx: 0 }, resourceB: { cellCapacity: 0, influx: 0 } }));
    sim.step(3000); expect(sim.orgs).toHaveLength(0); expect(sim.totalEnergy()).toBe(0);
  });
  it('shares one intake budget and allocates scarce pools proportionally', () => {
    const cfg = small({ width: 10, height: 10, patchiness: 0, resourceB: { patchiness: 0, cellCapacity: .001, regrowthRate: 0, influx: 0 }, env: { cellCapacity: .001, regrowthRate: 0, influx: 0 }, founders: { count: 2, mix: [0,0,1], genomes: [new Array(GENOME_LEN).fill(0)], kinds: [{ type: 2, lobes: 3 }] }, life: { maturityAge: 1e8, baseHazard: 0, gompertzA: 0 } });
    cfg.energy.halfSaturation = 1e-9;
    const sim = new Simulation(cfg); sim.step();
    expect(sim.counters.typeUptakeA[2]).toBeCloseTo(.001, 12);
    expect(sim.counters.typeUptakeB[2]).toBeCloseTo(.001, 12);
    expect(sim.orgs[0].energy).toBeCloseTo(sim.orgs[1].energy, 12);
    for (const o of sim.orgs) expect(o.reqA + o.reqB).toBeLessThanOrEqual(o.ph.intakeMax + 1e-12);
  });
  it('v2 JSON restoration preserves every trajectory, count and ledger', () => {
    const a = new Simulation(small()); a.step(650); a.setEnvironment({ regrowthRate: .02 }, 'B');
    const saved = a.snapshot(), b = Simulation.restore(JSON.parse(JSON.stringify(saved)));
    a.step(700); b.step(700);
    expect(b.stateHash()).toBe(a.stateHash()); expect(b.ledger).toEqual(a.ledger);
    expect(JSON.stringify(b.history)).toBe(JSON.stringify(a.history));
    expect(saved.orgs[0].energy).not.toBe(a.orgs[0]?.energy);
  });
  it('neutral palette genes do not change three-type ecological trajectories', () => {
    const seed = new Simulation(small({ seed: 8 }));
    const genomes = seed.orgs.map(o => Array.from(o.genome));
    const run = (flip: boolean) => {
      const sim = new Simulation(small({ seed: 8, founders: { count: 60, genomes: genomes.map(g => g.map((v,i) => flip && i === 5 ? v+3 : flip && i === 6 ? v-2 : v)) } }));
      sim.step(2000); return sim.orgs.map(o => [o.id,o.type,o.corners,o.lobes,o.x,o.y,o.energy]);
    };
    expect(run(true)).toEqual(run(false));
  });
  it('rejects bad versions/config/state before replacing a world', () => {
    expect(() => Simulation.restore({ version: 99 })).toThrow('Unsupported snapshot');
    const snap: any = new Simulation(small()).snapshot(); snap.orgs[0].genome[0] = null;
    expect(() => Simulation.restore(snap)).toThrow('genome');
    expect(() => new Simulation(small({ founders: { count: -1 } }))).toThrow();
    const sim = new Simulation(small()); expect(() => sim.setEnvironment({ cellCapacity: NaN })).toThrow(); expect(sim.env.cellCapacity).toBe(10);
  });
});
describe('discrete morphology inheritance', () => {
  it('steps only by one, stays bounded, and draws no random number when disabled', () => {
    const rng = new Rng(9), state = rng.state();
    expect(mutateCount(5, { min: 3, max: 8, mutationRate: 0 }, rng)).toBe(5); expect(rng.state()).toEqual(state);
    let up = 0, down = 0;
    for (let i = 0; i < 2000; i++) { const v = mutateCount(5, { min: 3, max: 8, mutationRate: 1 }, rng); if (v === 6) up++; else if (v === 4) down++; else throw Error('Invalid step'); }
    expect(up).toBeGreaterThan(850); expect(down).toBeGreaterThan(850);
    for (let i = 0; i < 100; i++) { expect(mutateCount(3, { min: 3, max: 8, mutationRate: 1 }, rng)).toBeGreaterThanOrEqual(3); expect(mutateCount(8, { min: 3, max: 8, mutationRate: 1 }, rng)).toBeLessThanOrEqual(8); }
  });
  it('inherits type and disabled corner/lobe genes through real births', () => {
    const sim = new Simulation(small({ mutation: { rate: 0 }, morph: { corners: { mutationRate: 0 }, lobes: { mutationRate: 0 } } }));
    const founders = new Map(sim.orgs.map(o => [o.id, [o.type, o.corners, o.lobes]])); sim.step(3000);
    expect(sim.totalBirths).toBeGreaterThan(30);
    for (const o of sim.orgs) expect([o.type, o.corners, o.lobes]).toEqual(founders.get(o.founderId));
  });
  it('charges benefits and costs without changing mass or capacity', () => {
    const cfg = small(), g = new Float64Array(GENOME_LEN);
    for (const type of [1, 2]) {
      const a = expressPhenotype(g, cfg, type, type === 1 ? 3 : 0, type === 2 ? 3 : 0), b = expressPhenotype(g, cfg, type, type === 1 ? 8 : 0, type === 2 ? 6 : 0);
      expect(a.mass).toBe(b.mass); expect(a.capacity).toBe(b.capacity); expect(b.intakeMax).toBeGreaterThan(a.intakeMax); expect(b.fixedCost).toBeGreaterThan(a.fixedCost); expect(b.buildCost).toBeGreaterThan(a.buildCost);
    }
  });
  it('records real inherited one-step count changes at birth, never while aging', () => {
    const sim = new Simulation(small({ mutation: { rate: 0 }, morph: { corners: { mutationRate: 1 }, lobes: { mutationRate: 1 } } }));
    let compared = 0, changes = 0;
    for (let tick = 0; tick < 500; tick++) {
      const before = new Map(sim.orgs.map(o => [o.id, { type: o.type, corners: o.corners, lobes: o.lobes }]));
      sim.step();
      for (const o of sim.orgs) {
        const previous = before.get(o.id);
        if (previous) { expect([o.corners,o.lobes]).toEqual([previous.corners, previous.lobes]); continue; }
        const p = before.get(o.parentId)!;
        expect(o.type).toBe(p.type);
        const difference = Math.abs(o.corners-p.corners)+Math.abs(o.lobes-p.lobes);
        expect(difference).toBeLessThanOrEqual(1); compared++; if (difference) changes++;
      }
    }
    expect(compared).toBeGreaterThan(0); expect(changes).toBeGreaterThan(0);
  });
  it('records genealogy and thinning gaps without fabricating ancestors', () => {
    const sim = new Simulation(small({ lineageMaxNodes: 100 })); sim.step(8000);
    expect(sim.lineage.thinnedCount).toBeGreaterThan(0);
    for (const o of sim.orgs) { const chain = sim.lineage.chain(o.id); expect(chain[0].genome).toEqual(o.genome); expect(new Set(chain.map(n => n.id)).size).toBe(chain.length); }
  });
  it('keeps render geometry finite and independent of simulation RNG', () => {
    const sim = new Simulation(small()), hash = sim.stateHash(); for (const o of sim.orgs) expect(shapeOf(o).pts.every(Number.isFinite)).toBe(true); expect(sim.stateHash()).toBe(hash);
  });
});
