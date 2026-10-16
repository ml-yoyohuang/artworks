import { pathData, sampleSegment, type Point } from '../geometry';
import { sample, path, lengthPositions } from './geometry';
import { animatedGeometry, morphPoints, reveal } from './temporal';
import { random } from './random';
import type { Appearance, Artwork, ArtObject } from './types';

export const escapeXML = (s: string): string => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
const num = (n: number) => Number(n.toFixed(3));
export function paletteColor(palette: string[], position: number): string {
  if (palette.length === 1) return palette[0];
  const p = Math.max(0, Math.min(.999999, position)) * (palette.length - 1), index = Math.floor(p), t = (1 - Math.cos((p - index) * Math.PI)) / 2;
  const channels = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const a = channels(palette[index]), b = channels(palette[index + 1]);
  // Interpolate in linear-light RGB, avoiding muddy midpoints.
  return '#' + a.map((v, i) => Math.round((Math.pow(v / 255, 2.2) * (1 - t) + Math.pow(b[i] / 255, 2.2) * t) ** (1 / 2.2) * 255).toString(16).padStart(2, '0')).join('');
}
export interface BrushRenderer { draw(points: readonly Point[], style: Appearance, id: string, quick: boolean): string }
const line = (d: string, color: string, width: number, opacity = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${num(width)}" opacity="${num(opacity)}" stroke-linecap="round" stroke-linejoin="round"/>`;
const segments = (points: readonly Point[], max: number, draw: (part: readonly Point[], position: number, i: number) => string) => {
  const distances = lengthPositions(points), step = Math.max(1, Math.ceil((points.length - 1) / max)); let result = '';
  for (let i = 0; i < points.length - 1; i += step) result += draw(points.slice(i, Math.min(points.length, i + step + 1)), distances[i], i);
  return result;
};
export const brushes: Record<Appearance['brush'], BrushRenderer> = {
  archival: { draw: (p, a) => line(path(p), a.palette[0], a.width * 1.6, a.texture * .045) + line(path(p), a.palette[0], a.width) },
  thread: { draw: (p, a, _id, quick) => segments(p, quick ? 70 : 220, (part, position) => line(path(part), paletteColor(a.palette, (1 - Math.cos(position * Math.PI * 2 * a.cycles)) / 2), a.width)) },
  foil: { draw: (p, a, _id, quick) => segments(p, quick ? 90 : 240, (part, position) => {
    const first = part[0], last = part[part.length - 1], angle = Math.atan2(last.y - first.y, last.x - first.x);
    const light = Math.pow(Math.abs(Math.sin(angle - .65)), 8) * .7 + .15 + .15 * Math.sin(position * Math.PI * 20 * a.texture);
    return line(path(part), paletteColor(a.palette, Math.min(1, Math.max(0, light))), a.width) + line(path(part), a.palette[1] || '#f2e5c4', a.width * .22, .35 * light);
  }) },
  luminous: { draw: (p, a) => line(path(p), a.palette[0], a.width * (4 + a.texture * 3), .055) + line(path(p), a.palette[0], a.width * 2.4, .15) + line(path(p), a.palette[0], a.width) + line(path(p), a.palette[1] || '#fff7df', a.width * .35, .9) },
  pigment: { draw: (p, a) => line(path(p), a.palette[0], a.width, .72) + `<g transform="translate(${num(a.texture * 1.2)} ${num(a.texture * .6)})">${line(path(p), a.palette[1] || a.palette[0], a.width * .62, .6)}</g>` },
  particle: { draw: (p, a, _id, quick) => {
    const rng = random(a.seed), count = quick ? 650 : 1800, positions = lengthPositions(p); let result = line(path(p), a.palette[0], a.width * .5, .35), cursor = 1;
    for (let i = 0; i < count; i++) {
      const target = i / count; while (cursor < p.length - 1 && positions[cursor] < target) cursor++;
      const before = p[cursor - 1], after = p[cursor], t = (target - positions[cursor - 1]) / (positions[cursor] - positions[cursor - 1] || 1);
      const spread = 1 + a.texture * 6, x = before.x + (after.x - before.x) * t + (rng() - .5) * spread, y = before.y + (after.y - before.y) * t + (rng() - .5) * spread;
      result += `<circle cx="${num(x)}" cy="${num(y)}" r="${num((.2 + rng() * .75) * a.width)}" fill="${a.palette[i % a.palette.length]}" opacity="${num(.25 + rng() * .65)}"/>`;
    } return result;
  } },
};
const layerCache = new Map<string, string>();
function geometryPoints(o: ArtObject, time: number, quick: boolean): Point[] {
  if (o.type === 'classic' && o.classic) {
    const s = o.classic;
    return s.stops.slice(1).flatMap((to, i) => sampleSegment(s.geometry, s.stops[i], to, quick ? .2 : .03).slice(i ? 1 : 0));
  }
  return morphPoints(o, sample(animatedGeometry(o, time), quick ? 'preview' : 'full'), time);
}
function material(o: ArtObject, points: readonly Point[], art: Artwork, quick: boolean): string {
  const { paper } = art, a = o.appearance, id = o.id.replace(/[^a-zA-Z0-9-]/g, '');
  if (paper.kind === 'emboss') {
    const x = Math.cos(paper.light * Math.PI / 180) * 1.1, y = Math.sin(paper.light * Math.PI / 180) * 1.1, d = path(points);
    return `<g transform="translate(${num(x)} ${num(y)})">${line(d, '#665c4a', a.width + .65, .34)}</g><g transform="translate(${-num(x)} ${-num(y)})">${line(d, '#ffffff', a.width + .45, .92)}</g>${line(d, paper.color, a.width * .65)}`;
  }
  if (paper.kind === 'riso') {
    const d = path(points), shift = paper.registration;
    return `<g style="mix-blend-mode:multiply" opacity="${paper.density}">${line(d, a.palette[0], a.width * 1.5, .78)}<g transform="translate(${shift} ${num(shift * .55)})">${line(d, a.palette[1] || '#b25f42', a.width, .6)}</g>${brushes.particle.draw(points, { ...a, width: .4, texture: paper.grain, opacity: .3 }, id, true)}</g>`;
  }
  return brushes[a.brush].draw(points, paper.kind === 'screen' ? { ...a, width: a.width * 1.8, opacity: 1 } : a, id, quick);
}
function objectContent(o: ArtObject, art: Artwork, index: number, quick: boolean): string {
  const time = art.timeline.time, key = JSON.stringify([o, art.paper, o.motion.kind === 'still' ? 0 : time, index, quick]);
  const cached = layerCache.get(key); if (cached) return cached;
  let content: string;
  if (o.type === 'text') content = `<text fill="${o.appearance.palette[0]}" font-family="${o.text.font}" font-size="${o.text.size}" font-weight="${o.text.weight}" text-anchor="${o.text.align}">${escapeXML(o.text.content)}</text>`;
  else {
    const points = geometryPoints(o, time, quick), fraction = reveal(o, time, index);
    content = material(o, points.slice(0, Math.max(2, Math.ceil(points.length * fraction))), art, quick);
    if (o.motion.kind === 'echo') {
      for (let i = 1; i <= o.motion.echoes; i++) content = `<g opacity="${num(.26 * (1 - i / (o.motion.echoes + 1)))}">${material(o, geometryPoints(o, time - i * o.motion.period / 18, true), art, true)}</g>` + content;
    }
  }
  layerCache.set(key, content); if (layerCache.size > 80) layerCache.delete(layerCache.keys().next().value!);
  return content;
}
function paperTexture(a: Artwork): string {
  if (!a.paper.grain) return '';
  const rng = random(a.seed), w = a.artboard.width, h = a.artboard.height, washi = a.paper.kind === 'washi'; let d = '';
  for (let i = 0; i < (washi ? 270 : 180); i++) { const x = rng() * w, y = rng() * h, length = washi ? 3 + rng() * 22 : .5 + rng() * 2; d += `M${num(x)},${num(y)}l${num(length)},${num((rng() - .5) * length * .5)} `; }
  return `<path d="${d}" fill="none" stroke="#655a42" stroke-width="${washi ? .65 : 1}" opacity="${num(a.paper.grain * (washi ? .24 : .17))}"/>`;
}
export type RenderOptions = { paper?: boolean; quick?: boolean; interactive?: boolean; guides?: boolean; selected?: string[]; fonts?: string };
export function renderSVG(a: Artwork, options: RenderOptions = {}): string {
  const { width, height } = a.artboard;
  const body = a.objects.filter(o => o.visible).map((o, i) => {
    const t = o.transform, transform = `translate(${num(t.x)} ${num(t.y)}) rotate(${num(t.rotation)}) scale(${num(t.scale)})`;
    const selected = options.interactive && options.selected?.includes(o.id);
    const selection = selected ? `<rect x="-300" y="${o.type === 'text' ? -o.text.size : -300}" width="600" height="${o.type === 'text' ? o.text.size * 1.4 : 600}" fill="none" stroke="#bc4e36" stroke-width="1" stroke-dasharray="6 6" vector-effect="non-scaling-stroke" pointer-events="none"/>` : '';
    return `<g ${options.interactive ? `data-object="${escapeXML(o.id)}"` : ''} transform="${transform}" opacity="${o.appearance.opacity}" style="mix-blend-mode:${o.appearance.blend}">${objectContent(o, a, i, !!options.quick)}</g>${selected ? `<g transform="${transform}">${selection}</g>` : ''}`;
  }).join('');
  const guides = options.guides ? `<defs><pattern id="studio-guides" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#6b7969" stroke-width=".5" opacity=".22"/></pattern></defs><rect width="100%" height="100%" fill="url(#studio-guides)" pointer-events="none"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXML(a.title)}"><title>${escapeXML(a.title)}</title><desc>${escapeXML(a.statement)}</desc>${options.fonts ? `<defs><style>${options.fonts}</style></defs>` : ''}<g style="isolation:isolate">${options.paper === false ? '' : `<rect width="100%" height="100%" fill="${a.paper.color}"/>${paperTexture(a)}`}${guides}${body}</g></svg>`;
}
// Keep Classic's exported path available for compatibility checks without
// passing its data through Studio's normalized geometry.
export const classicPath = (o: ArtObject): string => o.classic ? pathData(o.classic.geometry, o.classic.stops) : '';
