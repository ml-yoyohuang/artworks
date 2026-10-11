// 03 休止符的規則：樂譜、聲音記憶、休止偵測與切口幾何（純函式，可在 Node 測試）。
import { rng, clamp } from '../core/rng.js';

// 每段：聲音長度、起訖力度、音域（0 低 … 1 高）、密度（每秒脈衝）、之後的休止長度。
export const PHRASES = [
  { dur: 2.4, v0: 0.5, v1: 0.55, reg: 0.5, dens: 6, rest: 0.45 },
  { dur: 4.0, v0: 0.72, v1: 0.95, reg: 0.18, dens: 12, rest: 3.5 },
  { dur: 1.5, v0: 0.22, v1: 0.2, reg: 0.92, dens: 3, rest: 0.35 },
  { dur: 1.0, v0: 0.3, v1: 0.32, reg: 0.75, dens: 4, rest: 1.4 },
  { dur: 2.0, v0: 0.5, v1: 0.5, reg: 0.45, dens: 7, rest: 0.6 },
  { dur: 5.0, v0: 0.25, v1: 1.0, reg: 0.35, dens: 10, rest: 5.0 },
  { dur: 2.5, v0: 0.4, v1: 0.38, reg: 0.6, dens: 5, rest: 0.4 },
  { dur: 1.0, v0: 0.8, v1: 0.8, reg: 0.55, dens: 14, rest: 2.2 },
  { dur: 3.0, v0: 0.55, v1: 0.6, reg: 0.1, dens: 8, rest: 0.8 },
  { dur: 4.0, v0: 0.6, v1: 0.82, reg: 0.88, dens: 11, rest: 4.2 }
];

// 依「留白」係數展開樂譜為時間表；回傳 [{start, end, restEnd, ...phrase, index}]，循環延伸到 until。
export function timeline(space = 1, until = 600) {
  const out = []; let t = 0, k = 0;
  while (t < until) {
    const p = PHRASES[k % PHRASES.length];
    const rest = p.rest * space;
    out.push({ ...p, index: k, start: t, end: t + p.dur, restEnd: t + p.dur + rest, rest });
    t += p.dur + rest; k++;
  }
  return out;
}

export const velAt = (p, t) => p.v0 + (p.v1 - p.v0) * clamp((t - p.start) / p.dur);

// 聲音記憶：在一段聲音期間累積力度、長度與音域。
export class PhraseMemory {
  constructor() { this.reset(); }
  reset() { this.sum = 0; this.n = 0; this.peak = 0; this.dur = 0; this.reg = 0; }
  add(level, dt, reg = 0.5) { this.sum += level * dt; this.dur += dt; this.peak = Math.max(this.peak, level); this.reg += reg * dt; this.n++; }
  stats() { const d = Math.max(1e-3, this.dur); return { energy: this.sum / d, dur: this.dur, peak: this.peak, reg: this.reg / d }; }
}

// 外部音訊（麥克風）休止偵測：開／關雙門檻（遲滯）與最短持續時間。
export class RestDetector {
  constructor({ on = 0.035, off = 0.018, minSound = 0.25, minRest = 0.22, floorAdapt = 0.995 } = {}) {
    Object.assign(this, { on, off, minSound, minRest, floorAdapt });
    this.state = 'rest'; this.candidate = null; this.since = 0; this.floor = 0.004; this.t = 0;
  }
  // level：RMS；回傳 'sound-start' | 'rest-start' | null
  push(level, dt) {
    this.t += dt;
    if (this.state === 'rest' && level < this.floor * 3) this.floor = this.floor * this.floorAdapt + level * (1 - this.floorAdapt);
    const on = Math.max(this.on, this.floor * 4), off = Math.max(this.off, this.floor * 2.2);
    const want = this.state === 'rest' ? (level > on ? 'sound' : null) : (level < off ? 'rest' : null);
    if (!want) { this.candidate = null; return null; }
    if (this.candidate !== want) { this.candidate = want; this.since = this.t; return null; }
    const need = want === 'sound' ? 0.06 : this.minRest;
    if (this.t - this.since < need) return null;
    // 太短的聲音不算一段（避免咳嗽般的瞬間噪音切開表面）
    this.candidate = null; this.state = want;
    if (want === 'sound') { this.soundStart = this.t; return 'sound-start'; }
    return this.t - this.soundStart >= this.minSound ? 'rest-start' : 'rest-start-short';
  }
}

// 由前一段聲音決定切口：方向、長度、深度、最大開口與位置（避開既有切口與標題區）。
export function makeCut(stats, existing, seed, aspect = 1.6) {
  const r = rng(`cut:${seed}`);
  const E = clamp(stats.energy), D = clamp(stats.dur / 5), B = clamp(stats.reg);
  const angle = -0.35 + B * 1.55 + (r() - 0.5) * 0.5;
  const len = (0.07 + 0.3 * D * (0.55 + 0.45 * E) + 0.04 * E) * Math.min(1, 0.45 + aspect * 0.55);
  const maxOpen = 0.006 + 0.075 * Math.pow(E, 1.3) * (0.6 + 0.4 * D);
  const depth = clamp(0.25 + 0.85 * E * E);
  const bow = (r() - 0.5) * 0.35 * (1 - E * 0.5);
  const xr = Math.max(0.05, (aspect >= 1 ? aspect * 0.5 : 0.5) - 0.06 - len * Math.abs(Math.cos(angle))), yr = Math.max(0.05, (aspect >= 1 ? 0.5 : 0.5 / aspect) - 0.08 - len * Math.abs(Math.sin(angle)));
  let best = null, bestScore = -1;
  for (let i = 0; i < 18; i++) {
    const c = [(r() * 2 - 1) * xr, (r() * 2 - 1) * yr];
    if ((c[0] < -xr * 0.55 || aspect < 1) && c[1] > yr * (aspect < 1 ? 0.3 : 0.5)) continue; // 上方保留給作品標題
    let d = 9;
    for (const e of existing) d = Math.min(d, Math.hypot(c[0] - e.x, c[1] - e.y) - e.len * 0.6);
    const score = d - Math.abs(c[0]) * 0.08;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return { x: best[0], y: best[1], angle, len, maxOpen, depth, bow, open: 0, energy: E };
}

// 休止持續 elapsed 秒時的開口：短休止只留下細線，長休止才真正打開。
export const openAt = (cut, elapsed) => cut.maxOpen * (1 - Math.exp(-Math.max(0, elapsed - 0.08) / 1.35)) * (0.12 + 0.88 * clamp(elapsed / 2.2));
// 聲音恢復後的閉合：保留一道疤；深切口保持微微張開。
export const scarOf = cut => cut.peakOpen * (cut.depth > 0.75 ? 0.22 : 0.06);
