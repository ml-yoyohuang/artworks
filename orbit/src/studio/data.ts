import { closure, validateGeometry } from '../geometry';
import type { Stroke } from '../state';
import { finite, validateCurve } from './geometry';
import { blank } from './presets';
import { clone, object, type Artwork, type ArtObject, type Appearance } from './types';

const COLOR = /^#[0-9a-f]{6}$/i;
const identifier = (v: unknown) => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const bool = (v: unknown) => typeof v === 'boolean';
const fail = (): never => { throw new RangeError('作品格式不完整或參數超出安全範圍；原作品未變更。'); };
export function validateAppearance(a: Appearance): void {
  if (!a || !['archival', 'thread', 'foil', 'luminous', 'pigment', 'particle'].includes(a.brush) || !Array.isArray(a.palette) || a.palette.length < 1 || a.palette.length > 5 || a.palette.some(c => !COLOR.test(c)) ||
    !finite(a.width, .2, 8) || !finite(a.opacity, .05, 1) || !['normal', 'multiply', 'screen'].includes(a.blend) || !finite(a.texture, 0, 1) || !finite(a.cycles, .1, 8) || !Number.isSafeInteger(a.seed) || !finite(a.seed, 0, 4294967295)) fail();
}
export function validateStroke(s: Stroke): void {
  if (!s || s.version !== 1 || !text(s.id, 100) || !COLOR.test(s.color) || !finite(s.width, .1, 8) || !bool(s.complete)) fail();
  validateGeometry(s.geometry);
  const end = closure(s.geometry);
  if (!Array.isArray(s.stops) || s.stops.length < 1 || s.stops.length > 128 || s.stops.some(n => !finite(n, -end - 1e-8, end + 1e-8)) || s.stops.reduce((sum, n, i) => sum + (i ? Math.abs(n - s.stops[i - 1]) : 0), 0) > 500) fail();
}
export function validateArtwork(a: Artwork): void {
  if (!a || a.schemaVersion !== 2 || !identifier(a.id) || !text(a.title, 120) || !text(a.statement, 500) || !Number.isSafeInteger(a.seed) || !finite(a.seed, 0, 4294967295) ||
    !a.artboard || !finite(a.artboard.width, 300, 2400) || !finite(a.artboard.height, 300, 2400) || !a.paper || !['cotton', 'washi', 'riso', 'screen', 'emboss'].includes(a.paper.kind) || !COLOR.test(a.paper.color) ||
    !finite(a.paper.grain, 0, 1) || !finite(a.paper.registration, 0, 5) || !finite(a.paper.density, .1, 1) || !finite(a.paper.light, 0, 360) || !a.timeline ||
    !finite(a.timeline.duration, 4, 120) || !finite(a.timeline.time, 0, a.timeline.duration) || !finite(a.timeline.speed, .25, 4) || !bool(a.timeline.loop) ||
    !Array.isArray(a.objects) || a.objects.length > 24 || new Set(a.objects.map(o => o?.id)).size !== a.objects.length) fail();
  for (const o of a.objects) {
    if (!o || !identifier(o.id) || !text(o.name, 100) || !['curve', 'classic', 'text'].includes(o.type) || !bool(o.visible) || !bool(o.locked) || !o.transform ||
      !finite(o.transform.x, -2400, 4800) || !finite(o.transform.y, -2400, 4800) || !finite(o.transform.scale, .05, 4) || !finite(o.transform.rotation, -360, 360)) fail();
    validateCurve(o.geometry); validateAppearance(o.appearance);
    const m = o.motion, t = o.text;
    if (!m || !['still', 'breathe', 'drift', 'morph', 'echo', 'bloom'].includes(m.kind) || !finite(m.amplitude, 0, .9) || !finite(m.period, 4, 60) || !finite(m.phase, -7, 7) || !Number.isInteger(m.echoes) || !finite(m.echoes, 1, 6) ||
      !t || !text(t.content, 200) || !['Instrument Serif', 'DM Sans', 'IBM Plex Mono'].includes(t.font) || !finite(t.size, 8, 200) || ![400, 500, 600].includes(t.weight) || !['start', 'middle', 'end'].includes(t.align)) fail();
    if (o.type === 'classic') validateStroke(o.classic!);
  }
}
export function migrateClassic(strokes: Stroke[]): Artwork {
  if (!Array.isArray(strokes) || strokes.length > 24) fail();
  const a = blank(101); a.title = 'From the drawing table'; a.statement = 'Classic 的原始筆跡，帶著每一次正向與反向轉動。';
  a.artboard = { width: 760, height: 760 };
  a.objects = strokes.filter(s => { validateStroke(s); return s.stops.length > 1; }).map((s, i) => {
    const o = object(`classic-${i}`); o.type = 'classic'; o.name = `Classic stroke ${i + 1}`; o.classic = clone(s);
    o.transform.x = 380; o.transform.y = 380; o.appearance.palette = [s.color]; o.appearance.width = s.width; return o;
  }); return a;
}
export function parseProject(raw: string): Artwork {
  if (raw.length > 2_000_000) throw new RangeError('JSON 超過 2 MB，請使用較小的作品。');
  const value = JSON.parse(raw);
  if (Array.isArray(value)) return migrateClassic(value);
  if (value?.schemaVersion === 1 && Array.isArray(value.strokes)) return migrateClassic(value.strokes);
  validateArtwork(value); return clone(value);
}
export function serialize(a: Artwork): string { validateArtwork(a); return JSON.stringify(a, null, 2); }
const KEY = 'orbit.studio.library.v2';
export function readLibrary(storage: Pick<Storage, 'getItem'> = localStorage): Artwork[] {
  const raw = storage.getItem(KEY); if (!raw) return [];
  if (raw.length > 8_000_000) throw new Error('本機收藏超出容量；請先匯出備份。');
  const list: unknown = JSON.parse(raw);
  if (!Array.isArray(list) || list.length > 20) throw new Error('本機收藏損壞；未覆蓋原資料。');
  return list.map(a => { validateArtwork(a); return clone(a); });
}
export function writeLibrary(list: Artwork[], storage: Pick<Storage, 'setItem'> = localStorage): void {
  if (list.length > 20) throw new Error('最多收藏 20 件作品；可先匯出 JSON 備份。');
  list.forEach(validateArtwork); const raw = JSON.stringify(list);
  if (raw.length > 8_000_000) throw new Error('收藏空間已滿，請先匯出 JSON。');
  storage.setItem(KEY, raw);
}
export class DocumentHistory {
  undoStack: Artwork[] = []; redoStack: Artwork[] = [];
  constructor(public art: Artwork) { validateArtwork(art); }
  commit(change: (a: Artwork) => void): void {
    const next = clone(this.art); change(next); validateArtwork(next);
    this.undoStack.push(clone(this.art)); if (this.undoStack.length > 40) this.undoStack.shift();
    this.redoStack = []; this.art = next;
  }
  undo(): void { const next = this.undoStack.pop(); if (next) { this.redoStack.push(this.art); this.art = next; } }
  redo(): void { const next = this.redoStack.pop(); if (next) { this.undoStack.push(this.art); this.art = next; } }
}
export function align(art: Artwork, ids: string[], direction: string): void {
  const selected = art.objects.filter(o => ids.includes(o.id) && !o.locked);
  const margin = 80, { width, height } = art.artboard;
  if (direction === 'distribute') {
    selected.sort((a, b) => a.transform.x - b.transform.x).forEach((o, i) => o.transform.x = margin + (width - margin * 2) * (selected.length <= 1 ? .5 : i / (selected.length - 1))); return;
  }
  for (const o of selected) {
    if (direction === 'center') { o.transform.x = width / 2; o.transform.y = height / 2; }
    if (direction === 'left') o.transform.x = margin + (o.type === 'text' ? 0 : 290 * o.transform.scale);
    if (direction === 'right') o.transform.x = width - margin - (o.type === 'text' ? 0 : 290 * o.transform.scale);
    if (direction === 'top') o.transform.y = margin + (o.type === 'text' ? o.text.size : 290 * o.transform.scale);
    if (direction === 'bottom') o.transform.y = height - margin - (o.type === 'text' ? 0 : 290 * o.transform.scale);
  }
}
export function duplicate(a: Artwork, id: string): ArtObject | undefined {
  const original = a.objects.find(o => o.id === id); if (!original || a.objects.length >= 24) return;
  const copy = clone(original); copy.id = crypto.randomUUID(); copy.name += ' copy'; copy.transform.x += 25; copy.transform.y += 25; copy.locked = false; a.objects.push(copy); return copy;
}
