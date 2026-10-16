import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAU, closure, penPosition } from '../src/geometry';
import { Atelier } from '../src/state';
import { accelerationBound, domain, physical, point, rational, sample, validateCurve } from '../src/studio/geometry';
import { ARTWORKS, GEOMETRIES, INK_PRESETS, MOTIONS, template } from '../src/studio/presets';
import { align, DocumentHistory, duplicate, migrateClassic, parseProject, readLibrary, serialize, validateAppearance, validateArtwork, writeLibrary } from '../src/studio/data';
import { clone, defaultCurve } from '../src/studio/types';
import { advanceTime, animatedGeometry, morphPoints } from '../src/studio/temporal';
import { fit, mutate, variations } from '../src/studio/discovery';
import { brushes, classicPath, paletteColor, renderSVG } from '../src/studio/render';

test('five geometry families close when rational and remain finite, deterministic and bounded', () => {
  for (const preset of GEOMETRIES) {
    const g = preset.geometry; validateCurve(g); const d = domain(g), p = sample(g);
    assert.ok(p.length <= 18001); assert.ok(p.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && Math.hypot(p.x, p.y) < 411));
    assert.deepEqual(sample(clone(g)), p); assert.ok(accelerationBound(g) > 0);
    if (d.closed) assert.ok(Math.hypot(p[0].x - p.at(-1)!.x, p[0].y - p.at(-1)!.y) < 1e-6, preset.name);
  }
});
test('hypotrochoid matches Phase 01 coordinates after explicit normalization', () => {
  const g = defaultCurve(), classic = { ring: g.R, gear: g.r, hole: g.d / g.r };
  for (const t of [0, .1, 1, 12, closure(classic)]) {
    const p = point(g, t), q = penPosition(classic, t), scale = 290 / (2 * (g.R - g.r + g.d));
    assert.ok(Math.hypot(p.x - q.x * scale, p.y - q.y * scale) < 1e-8);
  }
});
test('epitrochoid sign, rose odd/even periods, open and long-period domains are correct', () => {
  const epi = { ...defaultCurve('epi'), R: 100, r: 20, d: 20 };
  assert.ok(Math.abs(point(epi, 0).x - 290 * 100 / 140) < 1e-10);
  assert.equal(domain({ ...defaultCurve('rose'), k: 3 }).end, Math.PI);
  assert.equal(domain({ ...defaultCurve('rose'), k: 4 }).end, TAU);
  assert.equal(domain({ ...defaultCurve('rose'), k: 1.5 }).end, TAU * 2);
  assert.equal(rational(Math.SQRT2), null);
  const open = { ...defaultCurve('rose'), k: Math.SQRT2, turns: 4 };
  assert.deepEqual(domain(open), { end: TAU * 4, closed: false, reason: '開放軌跡 · 依指定圈數取樣' });
  assert.equal(domain({ ...defaultCurve(), R: 239, r: 119 }).closed, false);
  assert.equal(domain({ ...defaultCurve('nested'), terms: [{ amplitude: 1, frequency: 2, phase: 0 }, { amplitude: .5, frequency: 4, phase: 0 }] }).end, Math.PI);
  assert.equal(domain({ ...defaultCurve(), d: 0 }).end, TAU);
  assert.equal(physical({ ...epi, d: 30 }), false);
});
test('invalid and extreme geometry is rejected before allocation', () => {
  for (const patch of [{ r: 0 }, { R: NaN }, { r: 120, R: 120 }, { turns: 10000 }, { phase: Infinity }, { k: 0 }, { terms: Array(5).fill({ amplitude: 1, frequency: 1, phase: 0 }) }]) assert.throws(() => sample({ ...defaultCurve(), ...patch }));
  assert.ok(sample({ ...defaultCurve('epi'), R: 240, r: 2, d: 240 }).length <= 18001);
});
test('all artwork, geometry, ink, motion and six composition presets validate', () => {
  assert.equal(ARTWORKS.length, 18); assert.equal(GEOMETRIES.length, 12); assert.equal(INK_PRESETS.length, 18); assert.equal(MOTIONS.length, 8);
  ARTWORKS.forEach(validateArtwork); INK_PRESETS.forEach(p => validateAppearance(p.appearance));
  for (let i = 0; i < 6; i++) validateArtwork(template(ARTWORKS[0], i));
  assert.equal(new Set(INK_PRESETS.map(p => JSON.stringify(p.appearance))).size, 18);
});
test('materials are deterministic, finite, use distinct renderers and reject bad parameters', () => {
  const p = sample(GEOMETRIES[1].geometry, 'preview');
  for (const { appearance: a } of INK_PRESETS) {
    const result = brushes[a.brush].draw(p, a, 'a', true);
    assert.equal(result, brushes[a.brush].draw(p, clone(a), 'a', true)); assert.ok(!result.includes('NaN')); assert.ok(result.length > 20);
  }
  assert.equal(paletteColor(['#000000', '#ffffff'], 0), '#000000');
  assert.throws(() => validateAppearance({ ...INK_PRESETS[0].appearance, opacity: 5 }));
});
test('timeline is frame-rate independent and continuous motions repeat by period', () => {
  const timeline = { time: 0, duration: 24, speed: 2, loop: true };
  let at30 = 0, at60 = 0;
  for (let i = 0; i < 300; i++) at30 = advanceTime(at30, 1 / 30, timeline);
  for (let i = 0; i < 600; i++) at60 = advanceTime(at60, 1 / 60, timeline);
  assert.ok(Math.abs(at30 - at60) < 1e-8); assert.equal(advanceTime(23, 2, { ...timeline, loop: false }), 24);
  for (const m of MOTIONS) {
    const o = clone(ARTWORKS[0].objects[0]); o.motion = clone(m.motion);
    const p = point(animatedGeometry(o, 1), .5), q = point(animatedGeometry(o, 1 + m.motion.period), .5);
    assert.ok(Math.hypot(p.x - q.x, p.y - q.y) < 1e-8);
    assert.deepEqual(morphPoints(o, sample(o.geometry), 3), morphPoints(clone(o), sample(o.geometry), 3));
  }
});
test('non-destructive history covers transforms, order, duplication, alignment and undo branches', () => {
  const h = new DocumentHistory(clone(ARTWORKS[0])), id = h.art.objects[0].id, original = serialize(h.art);
  h.commit(a => { duplicate(a, id); a.objects[0].transform.rotation = 45; }); assert.equal(h.art.objects.length, 4);
  h.undo(); assert.equal(serialize(h.art), original); h.redo(); assert.equal(h.art.objects[0].transform.rotation, 45);
  h.commit(a => { align(a, [id], 'center'); }); assert.equal(h.art.objects[0].transform.y, h.art.artboard.height / 2);
  h.undo(); h.commit(a => a.title = 'New branch'); assert.equal(h.redoStack.length, 0);
  assert.throws(() => h.commit(a => a.artboard.width = 1)); assert.equal(h.art.title, 'New branch');
});
test('project roundtrip, corrupt data, oversized files and future schema fail safely', () => {
  const original = clone(ARTWORKS[0]); assert.deepEqual(parseProject(serialize(original)), original);
  for (const raw of ['{bad', 'null', '{}', JSON.stringify({ ...original, schemaVersion: 99 }), JSON.stringify({ ...original, objects: Array(25).fill(original.objects[0]) }), ' '.repeat(2000001)]) assert.throws(() => parseProject(raw));
  const malformed = clone(original); malformed.objects[0].appearance.palette = ['red" onload="alert(1)']; assert.throws(() => serialize(malformed));
  const html = clone(original); html.title = '<img onerror="x">'; html.objects[1].text.content = '<script>test</script>';
  assert.ok(!renderSVG(html).includes('<script>')); assert.ok(renderSVG(html).includes('&lt;script&gt;'));
});
test('local library CRUD validates without replacing corrupt storage', () => {
  let stored: string | null = null; const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } };
  writeLibrary([clone(ARTWORKS[0])], storage); const list = readLibrary(storage); list[0].title = 'Renamed'; writeLibrary(list, storage); assert.equal(readLibrary(storage)[0].title, 'Renamed');
  writeLibrary([], storage); assert.deepEqual(readLibrary(storage), []);
  stored = '{bad'; assert.throws(() => readLibrary(storage)); assert.equal(stored, '{bad');
});
test('Classic migration preserves exact geometry, reversals, ink and exported path', () => {
  const classic = new Atelier(); classic.advance(1); classic.advance(-.4); const original = clone(classic.all);
  const migrated = migrateClassic(original); assert.deepEqual(migrated.objects[0].classic, original[0]);
  assert.equal(migrated.objects[0].transform.x, 380); assert.ok(classicPath(migrated.objects[0]).startsWith('M'));
  assert.deepEqual(parseProject(JSON.stringify({ schemaVersion: 1, strokes: original })), migrated); assert.deepEqual(classic.all, original);
});
test('variation boards repeat by seed, retain their source and avoid empty geometry', () => {
  const source = clone(ARTWORKS[0]), before = serialize(source), board = variations(source, 789, .5);
  assert.equal(board.length, 6); assert.deepEqual(board, variations(source, 789, .5)); assert.equal(serialize(source), before);
  assert.equal(new Set(board.map(a => JSON.stringify(a.objects[0].geometry))).size, 6);
  for (const a of board) { validateArtwork(a); assert.ok(fit(a)); }
  assert.notDeepEqual(mutate(source, 789, .2), mutate(source, 790, .2));
});
test('SVG output preserves size, transforms, layer appearance, paper and timeline', () => {
  const art = clone(ARTWORKS[16]); art.timeline.time = 3; const svg = renderSVG(art);
  assert.ok(svg.includes('width="1000" height="1200"')); assert.ok(svg.includes('translate(500 570)')); assert.ok(svg.includes('mix-blend-mode:screen'));
  assert.notEqual(svg, renderSVG({ ...art, timeline: { ...art.timeline, time: 4 } }));
  assert.ok(!renderSVG(art, { paper: false }).includes('<rect width="100%"'));
});
