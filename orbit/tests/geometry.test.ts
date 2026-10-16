import { test } from 'node:test';
import assert from 'node:assert/strict';
import { angleDelta, closure, gearPosition, penPosition, radii, rotation, sampleSegment, validateGeometry, TAU } from '../src/geometry';
import { GEARS, RINGS, HOLES } from '../src/catalog';
test('all 90 ring/gear/hole combinations close, with synchronized pen transforms', () => {
  for (const ring of RINGS) for (const { teeth: gear } of GEARS) for (const hole of HOLES) {
    const g = { ring, gear, hole }, end = closure(g), start = penPosition(g, 0), last = penPosition(g, end);
    assert.ok(Math.hypot(last.x - start.x, last.y - start.y) < 1e-8);
    for (const t of [-2.3, 0, 1.7, end]) {
      const c = gearPosition(g, t), p = penPosition(g, t), { R, r, d } = radii(g), a = rotation(g, t);
      assert.ok(Math.abs(Math.hypot(c.x, c.y) - (R - r)) < 1e-9);
      assert.ok(Math.hypot(p.x - c.x - d * Math.cos(a), p.y - c.y - d * Math.sin(a)) < 1e-9);
    }
  }
});
test('closure uses whole gear orbits, not one turn', () => {
  assert.equal(closure({ ring: 120, gear: 52, hole: .84 }), TAU * 13);
});
test('sampling is continuous and reversible even across a large dropped frame', () => {
  const g = { ring: 144, gear: 36, hole: .84 };
  const forward = sampleSegment(g, -1, 13), reverse = sampleSegment(g, 13, -1).reverse();
  forward.forEach((p, i) => assert.ok(Math.hypot(p.x - reverse[i].x, p.y - reverse[i].y) < 1e-8));
  for (let i = 1; i < forward.length; i++) {
    const mid = penPosition(g, -1 + 14 * (i - .5) / (forward.length - 1));
    assert.ok(Math.hypot(mid.x - (forward[i].x + forward[i - 1].x) / 2, mid.y - (forward[i].y + forward[i - 1].y) / 2) <= .01801);
  }
});
test('pointer angles unwrap across ±pi in both directions', () => {
  assert.ok(Math.abs(angleDelta(3.1, -3.1) - (TAU - 6.2)) < 1e-10);
  assert.ok(Math.abs(angleDelta(-3.1, 3.1) + (TAU - 6.2)) < 1e-10);
});
test('invalid parameters rejected and hole offsets affect actual geometry', () => {
  for (const g of [{ ring: 48, gear: 48, hole: .5 }, { ring: 120, gear: 0, hole: .5 }, { ring: 120, gear: 52.1, hole: .5 }, { ring: 120, gear: 52, hole: NaN }]) assert.throws(() => validateGeometry(g), RangeError);
  assert.notDeepEqual(penPosition({ ring: 120, gear: 52, hole: .2 }, 1), penPosition({ ring: 120, gear: 52, hole: .84 }, 1));
});
