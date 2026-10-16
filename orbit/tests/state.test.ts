import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { Atelier } from '../src/state';
import { pathData } from '../src/geometry';
if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
test('incomplete stroke undo/redo restores geometry and progress', () => {
  const a = new Atelier(); a.advance(2); a.advance(-1); a.advance(3);
  assert.deepEqual(a.active?.stops, [0, 2, 1, 4]);
  a.undo(); assert.equal(a.hasInk, false); a.redo(); assert.equal(a.t, 4);
  assert.deepEqual(a.active?.stops, [0, 2, 1, 4]);
});
test('switching tools preserves ink and starts an independent stroke', () => {
  const a = new Atelier(); a.advance(3); a.select({ gear: 48, ink: 2 }); a.advance(1);
  assert.equal(a.strokes[0].geometry.gear, 52); assert.equal(a.active?.geometry.gear, 48);
  assert.notEqual(a.strokes[0].color, a.active?.color);
});
test('closure clamps, pauses, and subsequent drawing starts a new stroke', () => {
  const a = new Atelier(); a.running = true; a.advance(a.end + 1);
  assert.equal(a.strokes[0].complete, true); assert.equal(a.running, false);
  assert.equal(a.progress, 1); a.advance(.2); assert.equal(a.t, .2); assert.equal(a.all.length, 2);
});
test('negative closure and branching after undo', () => {
  const a = new Atelier(); a.advance(-a.end); assert.equal(a.progress, 1);
  a.undo(); assert.equal(a.redoStack.length, 1); a.advance(1); assert.equal(a.redo(), false);
  a.clear(); assert.equal(a.redo(), false); assert.equal(a.hasInk, false);
});
test('1x, 10x and 20x retain identical complete vector geometry', () => {
  const paths = [1, 10, 20].map(speed => {
    const a = new Atelier();
    while (a.progress < 1) a.advance(speed * 2.4 / 60);
    assert.equal(a.strokes.length, 1);
    assert.equal(a.strokes[0].complete, true);
    return pathData(a.strokes[0].geometry, a.strokes[0].stops);
  });
  assert.equal(paths[0], paths[1]); assert.equal(paths[1], paths[2]);
});
