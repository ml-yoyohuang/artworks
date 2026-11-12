import { it, expect } from 'vitest';
import { manifestFor, runExperiment } from '../src/sim/research';
import { Simulation } from '../src/sim';

it('headless scheduling and checkpoints preserve exactly the same scientific trajectory', async () => {
  const m = manifestFor('test', 3, 600, { width: 120, height: 80, founders: { count: 15 } });
  m.interventions = [{ tick: 123, resource: 'B', patch: { influx: .001 } }]; m.checkpointEvery = 200;
  const founder = new Simulation(m.config).orgs[0];
  m.interventions.push({ tick: 210, introduction: { genome: Array.from(founder.genome), x: 20, y: 20, type: 1, corners: 5 } });
  const a = await runExperiment(m, { chunk: 17, schedule: async () => {} }), b = await runExperiment(m, { chunk: 100, schedule: async () => {} });
  expect(a.hash).toBe(b.hash); expect(a.history).toEqual(b.history); expect(a.energyRelativeError).toBeLessThan(1e-9);
  const replay = Simulation.restore(a.checkpoints[1]); replay.step(200); expect(replay.stateHash()).toBe(a.hash);
});
it('supports cancellation with reproducible partial results rather than claiming completion', async () => {
  const abort = new AbortController();
  const r = await runExperiment(manifestFor('cancel', 4, 1000, { founders: { count: 10 } }), { chunk: 16, signal: abort.signal, progress: () => abort.abort(), schedule: async () => {} });
  expect(r.status).toBe('cancelled'); expect(r.tick).toBe(16); expect(r.persistentTypes).toBe(false);
});
