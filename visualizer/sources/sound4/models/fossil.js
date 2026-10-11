// 04 聲音化石：決定性作曲與固定步長沉積（純函式，可在 Node 測試）。
import { rng, clamp } from '../core/rng.js';

export const K = 48;          // 截面角位
export const MAX_RINGS = 420; // 幾何預算
export const DT = 1 / 120;    // 固定模擬步長

const PENTA = [0, 2, 4, 7, 9];
// 依 seed 作曲：低音長音 → 節奏動機 A → 擦弦長音 → A 重複（沿舊痕跡）→ 動機 B＋長音 → 收尾長音。
export function compose(seed) {
  const r = rng(`fossil-score:${seed}`);
  const root = 36 + r.int(0, 7);
  const ev = [];
  const scale = deg => root + 24 + PENTA[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5);
  let t = 0.3;
  // 1 基底：三個低長音
  for (let i = 0; i < 3; i++) { ev.push({ t, dur: 2.3, midi: root + [0, 7, 5][i] - (i === 2 ? 12 : 0), vel: 0.55, kind: 'long', phrase: 'ground' }); t += 2.5; }
  t += 0.7;
  // 2 動機 A：16 分音符的節奏型
  const motif = [], hits = [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1];
  let deg = r.int(2, 5);
  for (let i = 0; i < 40; i++) { if (!hits[i % 16]) continue; deg += r.pick([-1, 1, 1, 2, -2, 0]); deg = clamp(deg, 0, 9); motif.push({ dt: i * 0.19, deg, vel: 0.42 + (i % 4 === 0 ? 0.25 : 0) + r() * 0.08 }); }
  const playMotif = (start, repeat, transpose = 0) => motif.forEach(m => ev.push({ t: start + m.dt, dur: 0.12, midi: scale(m.deg + transpose), vel: m.vel, kind: 'rhythm', phrase: 'A', repeat }));
  playMotif(t, false); t += 40 * 0.19 + 0.6;
  // 3 長音旋律
  let d2 = r.int(3, 6);
  for (let i = 0; i < 5; i++) { const dur = r.pick([1.3, 1.6, 2.0]); d2 += r.pick([-2, -1, 1, 2, 3]); d2 = clamp(d2, 0, 8); ev.push({ t, dur, midi: scale(d2) - 12, vel: 0.5 + i * 0.04, kind: 'long', phrase: 'C' }); t += dur + 0.12; }
  t += 0.8;
  // 4 動機 A 重複，下方持續低音
  ev.push({ t, dur: 40 * 0.19, midi: root + 12, vel: 0.4, kind: 'long', phrase: 'pedal' });
  playMotif(t, true); t += 40 * 0.19 + 0.5;
  // 5 動機 B：更密，漸強，夾著長音
  for (let i = 0; i < 44; i++) {
    if (i % 8 === 7) continue;
    deg = clamp(deg + r.pick([-1, 1, 2, -2, 1]), 0, 10);
    ev.push({ t: t + i * 0.16, dur: 0.1, midi: scale(deg), vel: 0.4 + (i / 44) * 0.4, kind: 'rhythm', phrase: 'B', repeat: false });
  }
  ev.push({ t: t + 1.0, dur: 2.6, midi: scale(r.int(5, 8)) - 12, vel: 0.62, kind: 'long', phrase: 'B' });
  ev.push({ t: t + 4.2, dur: 2.4, midi: scale(r.int(3, 6)) - 12, vel: 0.7, kind: 'long', phrase: 'B' });
  t += 44 * 0.16 + 0.7;
  // 6 收尾
  ev.push({ t, dur: 3.6, midi: root, vel: 0.62, kind: 'long', phrase: 'end' });
  ev.push({ t, dur: 3.6, midi: root + 19, vel: 0.35, kind: 'long', phrase: 'end' });
  ev.sort((a, b) => a.t - b.t);
  const end = Math.max(...ev.map(e => e.t + e.dur));
  return { root, events: ev, end };
}

// 沉積模擬：固定步長；每一環讀取上一環的表面（ridge）再沉積。
export function simulate(seed, score = compose(seed)) {
  const r = rng(`fossil-sim:${seed}`);
  const params = {
    b: 0.118 + r() * 0.03,          // 對數螺旋成長率
    k: 0.4 + r() * 0.08,             // 管徑／半徑
    turns: 2.6 + r() * 0.5,
    slot: r.int(0, K - 1),           // 音高 → 角位的偏移
    palette: r.int(0, 2)
  };
  const run = scale => {
    const rings = [];
    let H = new Float32Array(K), M = new Float32Array(K);
    let g = 0, energy = 0, pendingRib = 0, pendingRepeat = false, pendingSuture = false, lastSound = -1, ribAge = 9;
    const evs = score.events; let ei = 0; const active = [];
    const steps = Math.ceil((score.end + 0.2) / DT);
    for (let s = 0; s <= steps; s++) {
      const t = s * DT;
      while (ei < evs.length && evs[ei].t <= t + 1e-9) {
        const e = evs[ei++]; active.push(e);
        if (e.kind === 'rhythm') { pendingRib = Math.max(pendingRib, e.vel); pendingRepeat = pendingRepeat || !!e.repeat; }
      }
      for (let i = active.length - 1; i >= 0; i--) if (active[i].t + active[i].dur < t) active.splice(i, 1);
      let level = 0; for (const e of active) level += e.vel * (e.kind === 'long' ? 0.8 : 1);
      if (active.length) lastSound = t; else if (lastSound >= 0 && t - lastSound > 0.25 && !pendingSuture && rings.length && !rings[rings.length - 1].suture) pendingSuture = true;
      energy += (Math.min(1.4, level) - energy) * (1 - Math.exp(-DT / 0.4));
      // 長音：在固定角位持續沉積，形成連續脊線
      for (const e of active) if (e.kind === 'long') {
        const k0 = ((Math.round((e.midi - 30) / 40 * K) + params.slot) % K + K) % K;
        for (let d = -2; d <= 2; d++) H[(k0 + d + K) % K] += DT * e.vel * 0.22 * [0.25, 0.6, 1, 0.6, 0.25][d + 2];
      }
      // 沒有聲音時不生長
      const rate = active.length ? (5.2 + 8.5 * Math.min(1.2, level)) * scale : 0;
      g += rate * DT;
      while (g >= 1) {
        g -= 1;
        // 歷史：脊線緩慢延續、略為擴散
        const H2 = new Float32Array(K);
        for (let k = 0; k < K; k++) H2[k] = 0.975 * H[k] + 0.012 * (H[(k + 1) % K] + H[(k + K - 1) % K] - 2 * H[k]);
        let rib = 0, vein = false;
        if (pendingRib > 0) {
          rib = pendingRib;
          // 重複樂句：沿既有脊線再沉積並礦化
          if (pendingRepeat) {
            let mx = 1e-4; for (let k = 0; k < K; k++) mx = Math.max(mx, H2[k]);
            for (let k = 0; k < K; k++) { const w = H2[k] / mx; H2[k] += 0.05 * w * w; M[k] = Math.min(1, M[k] + 0.12 * w * w); }
            vein = true;
          }
          pendingRib = 0; pendingRepeat = false; ribAge = 0;
        } else ribAge++;
        const ring = { t, rib, suture: pendingSuture, energy, H: H2.slice(), M: M.slice(), vein, kinds: active.map(e => e.kind[0]).join('') };
        pendingSuture = false;
        rings.push(ring);
        H = H2;
      }
    }
    return rings;
  };
  let rings = run(1);
  if (rings.length > MAX_RINGS) rings = run(MAX_RINGS / rings.length * 0.995);
  if (rings.length > MAX_RINGS) rings = rings.slice(0, MAX_RINGS);
  return { params, rings, score, end: score.end };
}

// 用於比對可重現性的摘要（數值四捨五入到 1e-6）。
export function fingerprint(sim) {
  let h = 2166136261 >>> 0;
  const add = v => { const n = Math.round(v * 1e6) | 0; h ^= n; h = Math.imul(h, 16777619) >>> 0; };
  for (const ring of sim.rings) { add(ring.t); add(ring.rib); add(ring.energy); ring.H.forEach(add); ring.M.forEach(add); add(ring.suture ? 1 : 0); }
  return { rings: sim.rings.length, hash: h.toString(16) };
}
