import { gcd, TAU, type Point } from '../geometry';
import type { Curve } from './types';

export function finite(n: unknown, min: number, max: number): n is number { return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max; }
export function validateCurve(g: Curve): void {
  if (!g || !['hypo', 'epi', 'rose', 'harmonic', 'nested'].includes(g.kind) || !finite(g.R, 10, 240) || !finite(g.r, 2, 120) ||
    !finite(g.d, 0, 240) || !finite(g.k, .2, 24) || !finite(g.phase, -TAU, TAU) || ![1, -1].includes(g.direction) || !finite(g.turns, .25, 32) ||
    (g.kind === 'hypo' && g.r >= g.R) || !Array.isArray(g.terms) || g.terms.length < 1 || g.terms.length > 4 ||
    g.terms.some(t => !t || !finite(t.amplitude, 0, 2) || !finite(t.frequency, -24, 24) || !finite(t.phase, -TAU, TAU)) ||
    g.terms.reduce((s, t) => s + t.amplitude, 0) < .05 || ((g.kind === 'harmonic' || g.kind === 'nested') && g.terms.every(t => t.amplitude === 0 || t.frequency === 0))) throw new RangeError('幾何超出安全範圍；內滾動的小齒輪需小於齒圈。');
}
export function rational(n: number): [number, number] | null {
  for (let q = 1; q <= 64; q++) { const p = Math.round(n * q); if (Math.abs(n - p / q) < 1e-9) return [p, q]; }
  return null;
}
export function domain(g: Curve): { end: number; closed: boolean; reason: string } {
  validateCurve(g);
  let period = TAU;
  if ((g.kind === 'hypo' || g.kind === 'epi') && g.d === 0) return { end: TAU, closed: true, reason: '閉合曲線' };
  if (g.kind === 'rose') {
    const f = rational(g.k);
    period = f ? Math.PI * f[1] * ((Math.abs(f[0]) + f[1]) % 2 === 0 ? 1 : 2) : Infinity;
  } else {
    const frequencies = g.kind === 'hypo' || g.kind === 'epi' ? [1, (g.R + (g.kind === 'hypo' ? -g.r : g.r)) / g.r] : g.terms.filter(t => t.amplitude > 0).map(t => t.frequency);
    const fractions = frequencies.map(rational);
    if (fractions.some(f => !f)) period = Infinity;
    else {
      const pairs = fractions as [number, number][];
      const denominator = pairs.reduce((d, [, q]) => d * q / gcd(d, q), 1);
      const numerator = pairs.reduce((n, [p, q]) => gcd(n, Math.abs(p * denominator / q)), 0);
      period = numerator ? TAU * denominator / numerator : TAU;
    }
  }
  const closed = Number.isFinite(period) && period <= TAU * 32;
  return { end: closed ? period : TAU * g.turns, closed, reason: closed ? '閉合曲線' : '開放軌跡 · 依指定圈數取樣' };
}
// All families use screen-space clockwise t, with phase applied to the internal
// oscillator (not an unrelated CSS rotation). The Classic sign convention is retained.
export function point(g: Curve, t: number): Point {
  t *= g.direction;
  if (g.kind === 'hypo' || g.kind === 'epi') {
    const a = g.R + (g.kind === 'hypo' ? -g.r : g.r), sign = g.kind === 'hypo' ? 1 : -1;
    const phase = (g.kind === 'hypo' ? -a / g.r : a / g.r) * t + g.phase;
    const norm = 290 / (a + g.d || 1);
    return { x: (a * Math.cos(t) + sign * g.d * Math.cos(phase)) * norm, y: (a * Math.sin(t) + sign * g.d * Math.sin(phase)) * norm };
  }
  if (g.kind === 'rose') { const r = 290 * Math.cos(g.k * t + g.phase); return { x: r * Math.cos(t), y: r * Math.sin(t) }; }
  const sum = g.terms.reduce((s, term) => s + term.amplitude, 0);
  let x = 0, y = 0;
  for (const term of g.terms) {
    const a = term.frequency * t + term.phase + g.phase;
    x += term.amplitude * Math.cos(a);
    y += term.amplitude * Math.sin(g.kind === 'harmonic' ? term.frequency * t + term.phase - g.phase : a);
  }
  return { x: x * 290 / sum, y: y * 290 / sum };
}
export function accelerationBound(g: Curve): number {
  if (g.kind === 'rose') return 290 * (g.k + 1) ** 2;
  if (g.kind === 'hypo' || g.kind === 'epi') {
    const a = g.R + (g.kind === 'hypo' ? -g.r : g.r);
    return 290 * (a + g.d * (a / g.r) ** 2) / (a + g.d);
  }
  return 290 * g.terms.reduce((s, t) => s + t.amplitude * t.frequency ** 2, 0) / g.terms.reduce((s, t) => s + t.amplitude, 0);
}
const cache = new Map<string, Point[]>();
export function sample(g: Curve, quality: 'preview' | 'full' = 'full'): Point[] {
  const key = JSON.stringify([g, quality]); const hit = cache.get(key); if (hit) return hit;
  const { end } = domain(g);
  const requested = Math.max(360, Math.ceil(end / Math.sqrt(8 * (quality === 'full' ? .06 : .3) / Math.max(1, accelerationBound(g)))));
  const count = Math.min(quality === 'full' ? 18000 : 3600, requested);
  const points = Array.from({ length: count + 1 }, (_, i) => point(g, end * i / count));
  cache.set(key, points); if (cache.size > 40) cache.delete(cache.keys().next().value!);
  return points;
}
export function path(points: readonly Point[]): string { return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '); }
export function lengthPositions(points: readonly Point[]): number[] {
  let total = 0; const distances = points.map((p, i) => { if (i) total += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y); return total; });
  return distances.map(d => total ? d / total : 0);
}
export function physical(g: Curve): boolean { return (g.kind === 'hypo' || g.kind === 'epi') && Number.isInteger(g.R) && Number.isInteger(g.r) && g.d <= g.r && (g.kind === 'epi' || g.r < g.R); }
