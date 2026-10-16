import { TAU, type Point } from '../geometry';
import { point, domain } from './geometry';
import { clone, type ArtObject, type Artwork, type Motion } from './types';

export function advanceTime(t: number, dt: number, timeline: Artwork['timeline']): number {
  const value = t + Math.max(0, dt) * timeline.speed;
  return timeline.loop ? value % timeline.duration : Math.min(timeline.duration, value);
}
export function phaseAt(m: Motion, time: number): number { return TAU * time / m.period + m.phase; }
export function animatedGeometry(o: ArtObject, time: number) {
  const g = clone(o.geometry), m = o.motion, p = phaseAt(m, time);
  if (m.kind === 'breathe' || m.kind === 'echo') {
    g.d = Math.max(0, Math.min(240, g.d * (1 + m.amplitude * Math.sin(p))));
    if (g.kind === 'rose' || g.kind === 'harmonic' || g.kind === 'nested') g.phase += Math.sin(p) * m.amplitude;
  }
  if (m.kind === 'drift') g.phase += Math.sin(p) * m.amplitude * Math.PI;
  g.phase = Math.atan2(Math.sin(g.phase), Math.cos(g.phase));
  return g;
}
export function morphPoints(o: ArtObject, points: readonly Point[], time: number): Point[] {
  if (o.motion.kind !== 'morph') return [...points];
  // Correspond points on the same domain and direction; interpolate continuous
  // offsets/weights, never fractional tooth or petal counts.
  const g = clone(o.geometry); g.d *= 1 - o.motion.amplitude; g.phase += o.motion.amplitude;
  g.phase = Math.atan2(Math.sin(g.phase), Math.cos(g.phase));
  if (g.terms.length > 1) g.terms[1].amplitude *= 1 + o.motion.amplitude;
  const end = domain(o.geometry).end, mix = (1 - Math.cos(phaseAt(o.motion, time))) / 2;
  return points.map((p, i) => { const q = point(g, end * i / (points.length - 1)); return { x: p.x + (q.x - p.x) * mix, y: p.y + (q.y - p.y) * mix }; });
}
export function reveal(o: ArtObject, time: number, index: number): number {
  if (o.motion.kind !== 'bloom') return 1;
  const position = ((time / o.motion.period - index * .1 + o.motion.phase / TAU) % 1 + 1) % 1;
  return position < .7 ? .5 - .5 * Math.cos(Math.PI * position / .7) : 1;
}
