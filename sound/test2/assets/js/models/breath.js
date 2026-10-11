// 06 呼吸雕塑：示範聲音（樂譜已知的音高與氣息）與生長規則（純函式，可在 Node 測試）。
import { clamp } from '../core/rng.js';

// 輪廓點：[時間, MIDI（null=無聲氣流）, 力度, 氣息成分]；力度 0 代表停頓。
const SOFT = [[0, 55, 0, .3], [.15, 55, .42, .25], [.9, 57, .45, .22], [1.1, 57, 0, .3], [1.45, 57, 0, .3], [1.6, 57, .5, .2], [2.4, 55, .48, .25], [2.6, 55, 0, .3], [2.85, 52, 0, .4], [3.0, 52, .42, .35], [4.2, 50, .3, .55], [4.6, 50, 0, .6]];
const compress = (pts, k, amp, air) => pts.map(([t, m, a, r]) => [t * k, m, Math.min(1, a * amp), clamp(r * air)]);
export const DEMOS = {
  soft: { name: '短句・輕緩', pts: SOFT },
  urgent: { name: '短句・急促', pts: compress(SOFT, 0.55, 1.85, 0.45) },
  long: { name: '長吟', pts: [[0, 48, 0, .2], [.4, 48, .3, .15], [2.5, 55, .62, .12], [4.5, 55, .68, .12], [6.4, 52, .38, .18], [7.0, 52, 0, .3]] },
  air: { name: '氣音', pts: [[0, null, 0, 1], [.3, null, .5, 1], [1.6, null, .42, 1], [1.8, null, 0, 1], [2.4, null, 0, 1], [2.7, null, .6, 1], [4.2, null, .35, 1], [4.5, null, 0, 1]] }
};
export const demoLength = id => DEMOS[id].pts[DEMOS[id].pts.length - 1][0];

// 在輪廓上取樣：回傳 {amp, midi, air, voiced}
export function sample(pts, t) {
  if (t <= pts[0][0] || t >= pts[pts.length - 1][0]) return { amp: 0, midi: null, air: 0, voiced: false };
  let i = 1; while (pts[i][0] < t) i++;
  const [t0, m0, a0, r0] = pts[i - 1], [t1, m1, a1, r1] = pts[i], u = (t - t0) / (t1 - t0);
  const midi = m0 == null || m1 == null ? null : m0 + (m1 - m0) * u;
  return { amp: a0 + (a1 - a0) * u, midi, air: r0 + (r1 - r0) * u, voiced: midi != null };
}

// 生長：起止偵測（開／關門檻、停頓容忍、上限），並以固定步長累積截面。
export const RULES = { on: 0.08, off: 0.05, pauseTol: 0.45, endSilence: 1.0, maxLen: 12, step: 1 / 30, maxSlices: 360 };
export class Growth {
  constructor() {
    this.slices = []; this.parts = 0; this.sounding = false; this.silent = 0; this.age = 0; this.done = false;
    this.r = 0.04; this.twist = 0; this.h = 0; this.acc = 0; this.started = false; this.voicedTime = 0; this.airSum = 0; this.n = 0;
  }
  // f: {amp, midi|null, air, voiced}
  advance(f, dt) {
    if (this.done) return;
    this.acc += dt;
    while (this.acc >= RULES.step && !this.done) { this.acc -= RULES.step; this.step(f); }
  }
  step(f) {
    const h = RULES.step;
    const loud = this.sounding ? f.amp > RULES.off : f.amp > RULES.on;
    if (loud) {
      if (!this.started) { this.started = true; this.parts = 1; }
      else if (!this.sounding && this.silent > RULES.pauseTol) { this.parts++; this.h += 0.1; } // 長停頓：分成新部件
      this.sounding = true; this.silent = 0;
    } else if (this.started) { this.sounding = false; this.silent += h; }
    if (!this.started) return;
    this.age += h;
    if (this.silent > RULES.endSilence || this.age > RULES.maxLen || this.slices.length >= RULES.maxSlices) { this.done = true; return; }
    const inPause = !this.sounding;
    const rt = inPause ? 0.035 : 0.06 + 0.27 * clamp(f.amp);
    this.r += (rt - this.r) * (1 - Math.exp(-h / (inPause ? 0.09 : 0.16)));
    if (this.sounding && f.voiced && f.midi != null) { this.twist += (0.3 + (f.midi - 45) * 0.1) * h; this.voicedTime += h; }
    this.h += (inPause ? 0.13 : 0.42) * h;
    if (this.sounding) { this.airSum += f.air; this.n++; }
    this.slices.push({ h: this.h, r: this.r, twist: this.twist, air: this.sounding ? f.air : 0, part: this.parts, pause: inPause });
  }
  // 定型：去掉結尾的靜默尾巴
  finalize() { while (this.slices.length > 2 && this.slices[this.slices.length - 1].pause) this.slices.pop(); this.done = true; return this.summary(); }
  summary() {
    const air = this.n ? this.airSum / this.n : 0, voiced = this.age ? this.voicedTime / this.age : 0;
    const material = air > 0.62 ? 'plaster' : air < 0.3 && voiced > 0.4 ? 'glass' : 'ceramic';
    return { air, voiced, material, height: this.h, parts: this.parts, slices: this.slices.length };
  }
}
