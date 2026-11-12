import { describe, it, expect } from 'vitest';
import { Clock, Simulation, makeConfig, type SimEvent } from '../src/sim';
import { parseSeed, tickPosition, extinctionTick } from '../src/app/observation';
import { shapeOf } from '../src/app/creatures';

describe('observation contracts', () => {
  it('preserves seed zero and falls back for invalid query values', () => {
    expect(parseSeed('0', () => 99)).toBe(0);
    expect(parseSeed('123', () => 99)).toBe(123);
    for (const value of [null, '', ' ', 'NaN', 'Infinity', '2.5']) expect(parseSeed(value, () => 99)).toBe(99);
  });

  it('positions decimated history and events on the same real tick axis', () => {
    const positions = [0, 100, 300, 500].map(t => tickPosition(t, 0, 500));
    expect(positions).toEqual([0, 0.2, 0.6, 1]);
    expect(tickPosition(200, 0, 500)).toBe(0.4);
    expect(tickPosition(0, 0, 0)).toBe(0);
  });

  it('uses the latest extinction event rather than the advancing observation tick', () => {
    const events: SimEvent[] = [
      { tick: 10, type: 'extinction', detail: '' },
      { tick: 20, type: 'introduction', detail: '' },
      { tick: 40, type: 'extinction', detail: '' },
    ];
    expect(extinctionTick(events)).toBe(40);
    expect(extinctionTick([])).toBeUndefined();
  });

  it('starts a replacement world with a fresh interpolation phase', () => {
    const clock = new Clock(30);
    clock.advance(0.02);
    expect(clock.phase).toBeCloseTo(0.6);
    clock.reset();
    expect(clock.phase).toBe(0);
    expect(clock.advance(0.02)).toBe(0);
  });

  it('derives identical clone silhouettes without consuming simulation randomness', () => {
    const sim = new Simulation(makeConfig({ seed: 0, founders: { count: 2 } }));
    const control = Simulation.restore(JSON.parse(JSON.stringify(sim.snapshot())));
    const before = sim.stateHash();
    const shape = shapeOf(sim.orgs[0]);
    expect(shapeOf({ ...sim.orgs[0], id: 999 })).toEqual(shape);
    expect(shape.pts.every(Number.isFinite)).toBe(true);
    expect(sim.stateHash()).toBe(before);
    sim.step(100);
    control.step(100);
    expect(sim.stateHash()).toBe(control.stateHash());
  });
});
