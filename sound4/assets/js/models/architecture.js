// 01 共振建築：和弦 → 空間的規則（純函式，可在 Node 測試）。
import { clamp } from '../core/rng.js';

export const BAR = 8; // 每個和弦 8 秒
export const SETS = [
  { name: '中殿', chords: [
    { name: 'Cmaj7', v: [36, 55, 64, 71] }, { name: 'Am9', v: [33, 55, 64, 71] }, { name: 'Fmaj7♯11', v: [41, 57, 64, 71] }, { name: 'G6sus', v: [43, 57, 62, 69] },
    { name: 'Em7', v: [40, 55, 62, 71] }, { name: 'Am7', v: [45, 55, 60, 67] }, { name: 'Dm9', v: [38, 57, 60, 64] }, { name: 'Gsus4', v: [43, 55, 60, 62] }] },
  { name: '迴廊', chords: [
    { name: 'Dm(add9)', v: [38, 57, 64, 65] }, { name: 'B♭maj7', v: [34, 53, 62, 69] }, { name: 'Gm9', v: [43, 58, 62, 69] }, { name: 'A7sus4', v: [45, 55, 62, 64] },
    { name: 'A7♭9', v: [45, 55, 61, 70] }, { name: 'Dm/F', v: [41, 57, 62, 69] }, { name: 'E♭maj7♯11', v: [39, 55, 62, 69] }, { name: 'Asus2', v: [45, 57, 59, 64] }] },
  { name: '高塔', chords: [
    { name: 'C5add9', v: [36, 50, 57, 64] }, { name: 'Dsus', v: [38, 50, 57, 67] }, { name: 'G/D', v: [31, 50, 59, 66] }, { name: 'Am11', v: [33, 52, 59, 69] },
    { name: 'Fmaj9', v: [29, 48, 57, 67] }, { name: 'B♭6/9', v: [34, 53, 60, 67] }, { name: 'G13sus', v: [31, 48, 57, 64] }, { name: 'C(open)', v: [36, 48, 55, 76] }] }
];

// ---- 和弦 → 空間的規則（純函式，可測試）----
export function features(v) {
  const iv = [v[1] - v[0], v[2] - v[1], v[3] - v[2]];
  let tension = 0;
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
    const d = (v[b] - v[a]) % 12;
    if (d === 1 || d === 11) tension += 1; else if (d === 6) tension += 0.8; else if (d === 2 || d === 10) tension += 0.35;
  }
  const pcs = v.map(n => n % 12), root = pcs[0];
  const rel = pcs.map(p => (p - root + 12) % 12);
  const seventh = rel.includes(10) || rel.includes(11);
  const color = rel.includes(2) || rel.includes(5) || rel.includes(6);
  return { iv, tension: clamp(tension / 2.2), seventh, color, spread: v[3] - v[0] };
}

export const pitchX = n => (n - 56) * 0.34;
export function layout(v, mode) {
  const f = features(v), out = { walls: [], arches: [], plates: [], cols: [] };
  const H = n => 2.4 + (n - 33) * 0.068;
  const turn = (v[0] - 40) * 0.018;
  const lean = [0, 0.32, -0.36, 0.5];
  if (mode === 'court') {
    const radius = n => 1.7 + (n - 30) * 0.105;
    v.forEach((n, i) => {
      const th = i * Math.PI / 2 + turn * 2 + f.tension * 0.25 * (i % 2 ? 1 : -1), r = radius(n);
      out.walls.push({ x: Math.cos(th) * r, z: Math.sin(th) * r, ry: -th + Math.PI / 2 + f.tension * lean[i] * 0.6, w: [0.55, 0.38, 0.3, 0.24][i], h: H(n), d: 4.2 + r * 0.55 });
    });
    for (let i = 0; i < 3; i++) {
      const a = out.walls[i], b = out.walls[i + 1], mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, th = Math.atan2(mz, mx);
      out.arches.push({ x: mx * 1.05, z: mz * 1.05, ry: -th + Math.PI / 2, w: clamp(f.iv[i] * 0.36, 1.2, 5.2), h: Math.min(a.h, b.h) * 0.82, d: 0.42, on: f.iv[i] >= 3 });
    }
  } else {
    const xs = []; v.forEach((n, i) => { let x = pitchX(n); if (i && x - xs[i - 1] < 1.0) x = xs[i - 1] + 1.0; xs.push(x); });
    const zc = [0, -1.3, 0.7, -2.1];
    v.forEach((n, i) => out.walls.push({ x: xs[i], z: zc[i], ry: turn + f.tension * lean[i], w: [0.6, 0.38, 0.3, 0.24][i], h: H(n), d: [11, 8.8, 7.2, 6.2][i] }));
    for (let i = 0; i < 3; i++) {
      const a = out.walls[i], b = out.walls[i + 1], span = Math.abs(b.x - a.x);
      out.arches.push({ x: (a.x + b.x) / 2, z: [3.1, -0.4, 1.9][i] - (f.iv[i] % 5) * 0.35, ry: turn, w: clamp(span - 0.2, 0.9, 6.6), h: Math.min(a.h, b.h) * clamp(0.62 + f.iv[i] * 0.022, 0.6, 0.95), d: 0.42, on: f.iv[i] >= 3 && span > 1.2 });
    }
  }
  const W = out.walls;
  // 夾層：七和弦；天篷：最高聲部；橋：掛留或延伸音。
  out.plates.push({ x: (W[0].x + W[1].x) / 2, z: (W[0].z + W[1].z) / 2 + 0.5, y: W[1].h * 0.52, ry: W[1].ry, w: Math.max(1.4, Math.hypot(W[1].x - W[0].x, W[1].z - W[0].z) - 0.2), d: 3.4, on: f.seventh });
  out.plates.push({ x: (W[2].x + W[3].x) / 2 + 0.3, z: (W[2].z + W[3].z) / 2 - 0.4, y: W[3].h + 0.55, ry: W[3].ry * 0.5, w: Math.max(2.2, Math.hypot(W[3].x - W[2].x, W[3].z - W[2].z) + 1.6), d: 4.2, on: true });
  out.plates.push({ x: (W[1].x + W[2].x) / 2, z: (W[1].z + W[2].z) / 2 + 2.4, y: Math.min(W[1].h, W[2].h) * 0.74, ry: W[2].ry, w: Math.max(1.2, Math.hypot(W[2].x - W[1].x, W[2].z - W[1].z) + 0.4), d: 1.5, on: f.color });
  W.forEach((w, i) => out.cols.push({ x: w.x + Math.sin(w.ry) * (w.d / 2 + 0.5), z: w.z + Math.cos(w.ry) * (w.d / 2 + 0.5), h: w.h * 1.12 }));
  return out;
}

