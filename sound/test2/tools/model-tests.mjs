// 關鍵規則的行為測試：node sound/test2/tools/model-tests.mjs
import assert from 'node:assert/strict';
import { simulate, fingerprint, MAX_RINGS, K } from '../assets/js/models/fossil.js';
import { timeline, openAt, scarOf, RestDetector, makeCut } from '../assets/js/models/cuts.js';
import { makeMaze, trace, C, LIMITS } from '../assets/js/models/echo.js';
import { EnergyModel, MODES } from '../assets/js/models/energy.js';
import { PhaseClock, PA } from '../assets/js/models/tides.js';
import { Growth, DEMOS, sample, demoLength, RULES } from '../assets/js/models/breath.js';
import { stepInfo, warpOver } from '../assets/js/models/loom.js';
import { layout, features, SETS } from '../assets/js/models/architecture.js';

const results = [];
const test = (name, fn) => { try { fn(); results.push([name, 'pass']); console.log('✓', name); } catch (e) { results.push([name, 'FAIL', e.message]); console.log('✗', name, '\n ', e.message); process.exitCode = 1; } };

// 01
test('01 不同和弦產生不同空間；共同音的牆保持不動', () => {
  const [c, am] = SETS[0].chords;
  const a = layout(c.v, 'nave'), b = layout(am.v, 'nave');
  assert.notDeepEqual(a.walls[0], b.walls[0]);              // 低音移動 → 第一道牆移動
  assert.deepEqual(a.walls.slice(1).map(w => w.x), b.walls.slice(1).map(w => w.x)); // 其餘聲部相同 → 牆不動
  assert.ok(features([45, 55, 61, 70]).tension > features([36, 55, 64, 71]).tension);
});

// 02
test('02 重複的樂句得到相同的列（相同紋樣），變奏不同', () => {
  for (let s = 0; s < 32; s++) {
    const a = stepInfo(s), b = stepInfo(s + 32), v = stepInfo(s + 64);
    assert.deepEqual([a.note, a.bass, a.kick, a.snare, a.hat, a.phraseStep], [b.note, b.bass, b.kick, b.snare, b.hat, b.phraseStep]);
    if (s === 31) assert.ok([...Array(32).keys()].some(k => stepInfo(k).note !== stepInfo(k + 64).note));
  }
  assert.equal(stepInfo(13 * 8).note, null); // 第 14 小節旋律退場
  assert.notEqual(warpOver(1, 0, 0, 0), warpOver(1, 2, 0, 0));
});

// 03
test('03 短休止只留細線，長休止真正打開', () => {
  const cut = makeCut({ energy: 0.8, dur: 3, reg: 0.4 }, [], 'x', 1.6);
  assert.ok(openAt(cut, 0.4) < cut.maxOpen * 0.1, 'short rest stays thin');
  assert.ok(openAt(cut, 3.5) > cut.maxOpen * 0.75, 'long rest opens');
  const weak = makeCut({ energy: 0.2, dur: 1, reg: 0.9 }, [], 'x', 1.6);
  assert.ok(weak.maxOpen < cut.maxOpen && weak.depth < cut.depth, 'previous dynamics shape the cut');
  cut.peakOpen = cut.maxOpen; assert.ok(scarOf(cut) < cut.maxOpen * 0.3);
});
test('03 休止偵測：雙門檻、遲滯與最短持續，雜訊不會快速開合', () => {
  const d = new RestDetector(); const ev = [];
  const run = (level, secs) => { for (let i = 0; i < secs * 60; i++) { const e = d.push(level + (i % 2 ? 0.004 : -0.004), 1 / 60); if (e) ev.push(e); } };
  run(0.005, 1); run(0.1, 1); run(0.026, 0.5); run(0.1, 0.5); run(0.004, 1);
  assert.deepEqual(ev, ['sound-start', 'rest-start']); // 介於門檻間的 0.026 不會觸發休止
  const d2 = new RestDetector(); const ev2 = [];
  for (let i = 0; i < 120; i++) { const e = d2.push(i % 8 < 1 ? 0.2 : 0.004, 1 / 60); if (e) ev2.push(e); }
  assert.ok(!ev2.includes('rest-start'), 'clicks shorter than minSound do not cut');
  assert.equal(timeline(1.6)[1].rest, timeline(1)[1].rest * 1.6);
});

// 04
test('04 同 seed 逐值相同、不同 seed 不同、幾何有上限', () => {
  const a = fingerprint(simulate('4172')), b = fingerprint(simulate('4172')), c = fingerprint(simulate('77'));
  assert.deepEqual(a, b); assert.notEqual(a.hash, c.hash);
  for (const s of ['1', '4172', '9999']) assert.ok(simulate(s).rings.length <= MAX_RINGS);
});
test('04 節奏 → 肋、長音 → 脊線、重複 → 沿舊脊線礦化', () => {
  const sim = simulate('4172');
  assert.ok(sim.rings.filter(r => r.rib > 0).length > 40);
  assert.ok(sim.rings.some(r => r.kinds.includes('l') && Math.max(...r.H) > 0.2));
  const vein = sim.rings.filter(r => r.vein);
  assert.ok(vein.length > 5 && Math.max(...vein.at(-1).M) > 0.5);
  // 礦化落在既有脊線上
  const r = vein.at(-1), top = r.H.indexOf(Math.max(...r.H));
  assert.ok(r.M[top] >= Math.max(...r.M) * 0.8);
  assert.equal(r.H.length, K);
});

// 05
test('05 兩層相位由同一時鐘推導；改變速度時相位連續；第一次聚合在 14 秒', () => {
  const c = new PhaseClock(90, 1);
  assert.ok(Math.abs(c.delta(14)) < 1e-9);
  assert.ok(Math.abs(c.delta(14 + 45) - 0.5) < 1e-9);
  const before = c.phaseB(30); c.change(30, 45, 1);
  assert.ok(Math.abs(c.phaseB(30) - before) < 1e-12);
  assert.ok(Math.abs(c.delta(30 + 45) - c.delta(30) - 1) < 1e-9, 'faster cycle after change');
  const notes = c.notes(0, PA); assert.equal(notes.filter(n => n.layer === 'A').length, 8);
  assert.ok(notes.filter(n => n.layer === 'B').length >= 8);
});

// 06
test('06 同一句話以不同節奏與力度留下不同的物件；停頓收頸；有長度上限', () => {
  const grow = id => { const g = new Growth(); for (let t = 0; t < demoLength(id) + 2; t += 1 / 60) g.advance(sample(DEMOS[id].pts, t), 1 / 60); return g; };
  const soft = grow('soft').finalize(), urgent = grow('urgent').finalize(), air = grow('air').finalize();
  assert.notDeepEqual([soft.height.toFixed(2), soft.material], [urgent.height.toFixed(2), urgent.material]);
  assert.equal(air.voiced, 0); assert.equal(air.material, 'plaster');
  const g = grow('soft'); assert.ok(g.slices.some(s => s.pause) && Math.min(...g.slices.map(s => s.r)) < 0.06);
  const long = new Growth(); for (let t = 0; t < 30; t += 1 / 60) long.advance({ amp: 0.6, midi: 55, voiced: true, air: 0.1 }, 1 / 60);
  assert.ok(long.done && long.age <= RULES.maxLen + 0.05);
  const noisy = new Growth(); for (let t = 0; t < 3; t += 1 / 60) noisy.advance({ amp: 0.07, midi: null, voiced: false, air: 1 }, 1 / 60);
  assert.equal(noisy.started, false, 'below the on-threshold never starts');
});

// 07
test('07 延遲 = 路徑 ÷ 速度；反射衰減；數量有上限', () => {
  const m = makeMaze('t', 6, 5), src = m.center(2, 2);
  const arr = trace(m, src, 0, 1);
  assert.ok(arr.length > 0 && arr.length <= LIMITS.maxArrivals);
  for (const a of arr) { assert.ok(a.t >= LIMITS.minDist * 2 / C - 1e-9); assert.ok(a.bounces <= LIMITS.bounces); }
  const d = Math.hypot(arr[0].p[0] - src[0], arr[0].p[1] - src[1]);
  assert.ok(Math.abs(arr[0].t - Math.max(LIMITS.minDist * 2, 2 * Math.max(d, LIMITS.minDist)) / C) < 0.2);
});
test('07 已揭露的牆改變之後的回聲路徑（雙向耦合）', () => {
  const m = makeMaze('t', 6, 5), src = m.center(2, 2);
  const first = trace(m, src, 1, 7);
  assert.ok(first.every(a => a.bounces === 0));
  for (const a of first) if (a.reveal) m.segs[a.seg].revealAt = a.t;
  const second = trace(m, src, 10, 7);
  assert.ok(second.some(a => a.bounces > 0), 'revealed walls reflect');
  assert.notDeepEqual(second.map(a => a.seg), first.map(a => a.seg));
});

// 08
test('08 能量與幀率無關；有界；安靜時流失', () => {
  const a = new EnergyModel(), b = new EnergyModel();
  for (let k = 0; k < 40; k++) { a.advance(k * 0.25); a.inject(0.5); }
  for (let k = 0; k < 40; k++) { for (let j = 1; j <= 5; j++) b.advance((k - 1) * 0.25 + j * 0.05); b.advance(k * 0.25); b.inject(0.5); }
  assert.ok(Math.abs(a.E - b.E) < 1e-9, 'same result for different frame chunks');
  const m = new EnergyModel(); m.inject(5); assert.ok(m.E <= 1.6);
  const s = new EnergyModel('stable'); s.inject(8); const e0 = s.E; s.advance(5); assert.ok(s.E < e0 * 0.7);
});
test('08 同一個注入在不同歷史下反應不同；觸發後鎖定，不在門檻附近重複', () => {
  const low = new EnergyModel(), high = new EnergyModel();
  for (let i = 0; i < 13; i++) high.inject(1); assert.ok(high.E < 1);
  const rl = [], rh = [];
  low.inject(1); low.advance(0.1, t => rl.push(t)); high.inject(1); high.advance(0.1, t => rh.push(t));
  assert.equal(rl.length, 0); assert.equal(rh.length, 1);
  for (let k = 0; k < 100; k++) { high.inject(1); high.advance(0.1 + k * 0.05, t => rh.push(t)); }
  assert.equal(rh.length, 1, 'locked during release/open');
  assert.ok(MODES.fragile.threshold < MODES.stable.threshold);
});

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
writeFileSync(fileURLToPath(new URL('../_qa/model-tests.json', import.meta.url)), JSON.stringify({ date: new Date().toISOString(), results }, null, 2) + '\n');
