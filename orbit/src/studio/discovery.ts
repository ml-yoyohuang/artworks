import { sample, validateCurve } from './geometry';
import { random } from './random';
import { clone, type Artwork } from './types';
import { ARTWORKS, GEOMETRIES, INK_PRESETS } from './presets';

export function fit(a: Artwork): boolean {
  const o = a.objects.find(o => o.type === 'curve'); if (!o) return true;
  const p = sample(o.geometry, 'preview');
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, length = 0;
  p.forEach((v, i) => { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); if (i) length += Math.hypot(v.x - p[i - 1].x, v.y - p[i - 1].y); });
  return (maxX - minX) * (maxY - minY) > 14000 && length > 500 && length < 130000;
}
export function mutate(source: Artwork, seed: number, strength: number): Artwork {
  const rand = random(seed), a = clone(source); a.seed = seed; a.id = `variation-${seed}`;
  for (const o of a.objects) {
    if (o.type !== 'curve' || o.locked) continue;
    if (strength > .7 && rand() > .35) o.geometry = clone(GEOMETRIES[Math.floor(rand() * GEOMETRIES.length)].geometry);
    o.geometry.phase = (rand() * 2 - 1) * Math.PI * strength;
    o.geometry.d = Math.max(2, Math.min(200, o.geometry.d * (1 + (rand() * 2 - 1) * strength * .7)));
    if (o.geometry.kind === 'rose' && strength > .4) o.geometry.k = Math.max(2, Math.min(16, Math.round(o.geometry.k + (rand() * 2 - 1) * strength * 6)));
    if (strength > .4) o.appearance = clone(INK_PRESETS[Math.floor(rand() * INK_PRESETS.length)].appearance);
    o.appearance.seed = seed;
    o.transform.rotation = (rand() * 2 - 1) * 35 * strength;
    validateCurve(o.geometry);
  }
  if (!fit(a)) { const o = a.objects.find(o => o.type === 'curve'); if (o) o.geometry = clone(GEOMETRIES[seed % GEOMETRIES.length].geometry); }
  a.title = `${source.title.split(' · ')[0]} · ${seed}`; return a;
}
export function variations(source: Artwork, seed: number, strength: number): Artwork[] { return Array.from({ length: 6 }, (_, i) => mutate(source, (seed + i * 7919) >>> 0, strength)); }
export function surprise(seed: number): Artwork { return mutate(ARTWORKS[Math.floor(random(seed)() * ARTWORKS.length)], seed, .58); }
