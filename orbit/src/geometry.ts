export const TAU = Math.PI * 2;
export const MODULE = 4;
export type Point = { x: number; y: number };
export type Geometry = { ring: number; gear: number; hole: number };

export function validateGeometry(g: Geometry): void {
  if (!Number.isSafeInteger(g.ring) || !Number.isSafeInteger(g.gear) ||
      g.gear < 8 || g.ring <= g.gear || g.ring > 500 ||
      !Number.isFinite(g.hole) || g.hole < 0 || g.hole > 0.9) {
    throw new RangeError('Invalid ring, gear, or hole geometry');
  }
}
export function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}
export function closure(g: Geometry): number {
  validateGeometry(g);
  return TAU * g.gear / gcd(g.ring, g.gear);
}
export function radii(g: Geometry) {
  return { R: g.ring * MODULE / 2, r: g.gear * MODULE / 2, d: g.gear * MODULE / 2 * g.hole };
}
export function gearPosition(g: Geometry, t: number): Point {
  const { R, r } = radii(g);
  return { x: (R - r) * Math.cos(t), y: (R - r) * Math.sin(t) };
}
export function rotation(g: Geometry, t: number): number { return -(g.ring - g.gear) / g.gear * t; }
export function penPosition(g: Geometry, t: number): Point {
  const c = gearPosition(g, t), a = rotation(g, t), { d } = radii(g);
  return { x: c.x + d * Math.cos(a), y: c.y + d * Math.sin(a) };
}
// Linear interpolation error <= max |p''| * dt² / 8, independent of FPS.
// 0.018 world units stays under 0.08 px even in a 3200px export.
export function sampleSegment(g: Geometry, from: number, to: number, tolerance = 0.018): Point[] {
  validateGeometry(g);
  if (!Number.isFinite(from) || !Number.isFinite(to) || !(tolerance > 0)) throw new RangeError('Invalid sampling interval');
  const { R, r, d } = radii(g), k = (R - r) / r;
  const step = Math.min(0.035, Math.sqrt(8 * tolerance / (R - r + d * k * k)));
  const count = Math.max(1, Math.ceil(Math.abs(to - from) / step));
  if (count > 1_000_000) throw new RangeError('Sampling interval is too large');
  return Array.from({ length: count + 1 }, (_, i) => penPosition(g, from + (to - from) * i / count));
}
export function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
export function pathData(g: Geometry, stops: readonly number[]): string {
  if (stops.length < 2) return '';
  return stops.slice(1).flatMap((to, i) => sampleSegment(g, stops[i], to).slice(i ? 1 : 0))
    .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
}
// Pitch radii remain separate from the visible addendum/dedendum.
export function toothPath(teeth: number, pitchRadius: number, internal = false): string {
  const halfDepth = MODULE * 0.48;
  const points: Point[] = [];
  for (let i = 0; i < teeth; i++) {
    for (const [phase, sign] of [[0, -1], [0.22, -1], [0.38, 1], [0.62, 1], [0.78, -1]] as const) {
      const a = (i + phase) / teeth * TAU;
      const r = pitchRadius + sign * halfDepth * (internal ? -1 : 1);
      points.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
  }
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + 'Z';
}
