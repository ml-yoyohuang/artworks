import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closure, penPosition, radii, TAU } from '../src/geometry';
import { HOLES } from '../src/catalog';
import { CANDIDATES, choose, type Choice } from '../src/play/randomize';
import { compatibleInks, contrast, PAPERS, PLAY_INKS } from '../src/play/palette';
import { PlayModel, validateSnapshot } from '../src/play/model';
import { parseProject } from '../src/studio/data';
import { createSVG } from '../src/export';

test('curated pool closes inside paper in no more than eight revolutions', () => {
  assert.ok(CANDIDATES.length >= 30);
  for (const c of CANDIDATES) {
    const g = { ...c, hole: HOLES[c.hole] }, end = closure(g), { R, r, d } = radii(g);
    assert.ok(end <= 8 * TAU); assert.ok(R - r + d < 330); assert.ok(g.hole >= .36);
    const first = penPosition(g, 0), last = penPosition(g, end);
    assert.ok(Math.hypot(first.x - last.x, first.y - last.y) < 1e-7);
  }
});
test('six paper palettes filter low contrast inks and retain at least five options', () => {
  assert.equal(PAPERS.length, 6);
  for (let p = 0; p < PAPERS.length; p++) {
    const inks = compatibleInks(p); assert.ok(inks.length >= 5);
    for (const i of inks) assert.ok(contrast(PAPERS[p].color, PLAY_INKS[i]) >= 4);
  }
});
test('seeded choices reproduce and recent history suppresses repeated ratios and colors', () => {
  let recent: Choice[] = [], repeats = 0; const unique = new Set<string>();
  for (let i = 0; i < 1200; i++) {
    const c = choose(42, i, i % 6, recent);
    assert.deepEqual(c, choose(42, i, i % 6, recent));
    assert.ok(compatibleInks(i % 6).includes(c.ink));
    if (recent.length) {
      assert.notEqual(c.ink, recent[0].ink);
      if (c.ring * recent[0].gear === c.gear * recent[0].ring) repeats++;
    }
    unique.add(`${c.ring}/${c.gear}/${c.hole}`); recent = [c, ...recent].slice(0, 4);
  }
  assert.ok(repeats < 30); assert.ok(unique.size >= 30);
});
test('real closure, reverse drawing, and no drawing after completion', () => {
  for (const direction of [-1, 1]) {
    const m = new PlayModel(42); const end = m.drawing.end;
    m.advance(direction * end * .4); m.advance(-direction * end * .2);
    assert.equal(m.drawing.active!.stops.length, 3); assert.equal(m.drawing.strokes.length, 0);
    m.advance(direction * end); assert.equal(m.drawing.strokes.length, 1); assert.equal(m.drawing.strokes[0].complete, true);
    assert.equal(m.advance(.5), null); assert.equal(m.drawing.strokes.length, 1);
  }
});
test('next preserves partial ink and resets only the instrument', () => {
  const m = new PlayModel(9); m.advance(.8); const stroke = structuredClone(m.drawing.active);
  m.next(); assert.deepEqual(m.drawing.strokes[0], stroke); assert.equal(m.drawing.t, 0); assert.equal(m.drawing.active, null);
  assert.equal(m.drawing.running, false);
});
test('paper snapshots restore exact reversible progress, seed and pairing', () => {
  const m = new PlayModel(91); m.advance(2); m.advance(-.4); const old = m.snapshot();
  m.newPaper(); assert.equal(m.drawing.hasInk, false); assert.equal(m.paper, 1);
  m.restore(old); assert.deepEqual(m.snapshot(), old); assert.equal(m.drawing.running, false);
  const copy = new PlayModel(0); copy.restore(old); m.next(); copy.next(); assert.deepEqual(m.choice, copy.choice);
  for (let i = 0; i < 6; i++) m.newPaper(); assert.equal(m.paper, 0);
});
test('malformed snapshots reject without replacing the current drawing', () => {
  const m = new PlayModel(1); m.advance(1); const good = m.snapshot();
  for (const corrupt of [
    (s: typeof good) => { s.play.paper = 9; }, (s: typeof good) => { s.strokes[0].color = 'url(evil)'; },
    (s: typeof good) => { s.play.t = Infinity; }, (s: typeof good) => { s.play.activeId = 'missing'; },
    (s: typeof good) => { s.strokes[0].geometry.gear = 0; }, (s: typeof good) => { s.play.choice.hole = 9; },
  ]) { const bad = structuredClone(good); corrupt(bad); assert.throws(() => m.restore(bad)); assert.deepEqual(m.snapshot(), good); }
});
test('Play shares v1 strokes, Studio migration and export with actual paper color', () => {
  const m = new PlayModel(42); m.advance(2); const snapshot = m.snapshot(); validateSnapshot(snapshot);
  const studio = parseProject(JSON.stringify(snapshot)); assert.equal(studio.objects[0].classic!.color, snapshot.strokes[0].color);
  const svg = createSVG(snapshot.strokes, true, PAPERS[m.paper].color);
  assert.ok(svg.includes(`fill="${PAPERS[m.paper].color}"`)); assert.ok(svg.includes(`stroke="${snapshot.strokes[0].color}"`));
});
