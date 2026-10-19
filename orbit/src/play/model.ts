import { Atelier, type Stroke } from '../state';
import { GEARS, HOLES, RINGS } from '../catalog';
import { closure, validateGeometry } from '../geometry';
import { choose, type Choice } from './randomize';
import { PAPERS, PLAY_INKS, GEAR_MATERIALS } from './palette';
export type PlaySnapshot = {
  schemaVersion: 1; strokes: Stroke[];
  play: { version: 1; paper: number; seed: number; sequence: number; recent: Choice[]; choice: Choice; t: number; activeId: string | null };
};
const clone = <T>(v: T): T => structuredClone(v);
export class PlayModel {
  readonly drawing = new Atelier();
  paper = 0;
  sequence = 0;
  recent: Choice[] = [];
  choice!: Choice;
  constructor(public seed: number) { this.next(); }
  next(): void {
    this.choice = choose(this.seed, this.sequence++, this.paper, this.recent);
    this.recent = [this.choice, ...this.recent].slice(0, 4);
    this.drawing.select({ ...this.choice, ink: 0 });
  }
  advance(delta: number): ReturnType<Atelier['advance']> {
    if (this.drawing.progress >= 1) return null;
    this.drawing.begin();
    this.drawing.active!.color = PLAY_INKS[this.choice.ink];
    this.drawing.active!.width = 1.15;
    return this.drawing.advance(delta);
  }
  snapshot(): PlaySnapshot {
    return clone({ schemaVersion: 1, strokes: this.drawing.all, play: { version: 1, paper: this.paper, seed: this.seed, sequence: this.sequence, recent: this.recent, choice: this.choice, t: this.drawing.t, activeId: this.drawing.active?.id ?? null } });
  }
  restore(value: PlaySnapshot): void {
    validateSnapshot(value); const s = clone(value), p = s.play;
    this.seed = p.seed; this.paper = p.paper; this.sequence = p.sequence; this.recent = p.recent; this.choice = p.choice;
    this.drawing.clear(); this.drawing.select({ ...p.choice, ink: 0 });
    this.drawing.strokes = s.strokes.filter(stroke => stroke.id !== p.activeId);
    this.drawing.active = s.strokes.find(stroke => stroke.id === p.activeId) ?? null; this.drawing.t = p.t;
  }
  newPaper(): void { this.drawing.clear(); this.paper = (this.paper + 1) % PAPERS.length; this.next(); }
}
function validChoice(c: Choice): boolean {
  return !!c && (RINGS as readonly number[]).includes(c.ring) && GEARS.some(g => g.teeth === c.gear) && Number.isInteger(c.hole) && c.hole >= 0 && c.hole < HOLES.length && Number.isInteger(c.ink) && c.ink >= 0 && c.ink < PLAY_INKS.length && Number.isInteger(c.material) && c.material >= 0 && c.material < GEAR_MATERIALS.length;
}
export function validateSnapshot(s: PlaySnapshot): void {
  const fail = () => { throw new Error('Invalid Play snapshot'); }, p = s?.play;
  if (s?.schemaVersion !== 1 || !p || p.version !== 1 || !Number.isInteger(p.paper) || p.paper < 0 || p.paper >= PAPERS.length || !Number.isSafeInteger(p.seed) || p.seed < 0 || p.seed > 0xffffffff || !Number.isSafeInteger(p.sequence) || p.sequence < 1 || !validChoice(p.choice) || !Array.isArray(p.recent) || p.recent.length > 4 || !p.recent.every(validChoice) || !Array.isArray(s.strokes) || s.strokes.length > 500) fail();
  const ids = new Set<string>();
  for (const stroke of s.strokes) {
    validateGeometry(stroke.geometry);
    if (stroke.version !== 1 || typeof stroke.id !== 'string' || stroke.id.length > 100 || ids.has(stroke.id) || !/^#[0-9a-f]{6}$/i.test(stroke.color) || !Number.isFinite(stroke.width) || stroke.width < .1 || stroke.width > 8 || typeof stroke.complete !== 'boolean' || !Array.isArray(stroke.stops) || stroke.stops.length < 1 || stroke.stops.length > 20000 || stroke.stops.some(t => !Number.isFinite(t) || Math.abs(t) > closure(stroke.geometry) + 1e-8)) fail();
    ids.add(stroke.id);
  }
  const end = closure({ ring: p.choice.ring, gear: p.choice.gear, hole: HOLES[p.choice.hole] });
  if (!Number.isFinite(p.t) || Math.abs(p.t) > end + 1e-8 || (p.activeId !== null && !ids.has(p.activeId))) fail();
  if (p.activeId !== null) {
    const active = s.strokes.find(s => s.id === p.activeId)!;
    if (active.complete || active.geometry.ring !== p.choice.ring || active.geometry.gear !== p.choice.gear || active.geometry.hole !== HOLES[p.choice.hole] || active.stops.at(-1) !== p.t) fail();
  }
}
