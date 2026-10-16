import { closure, type Geometry } from './geometry';
import { HOLES, INKS } from './catalog';
export type Stroke = {
  id: string; version: 1; geometry: Geometry; color: string; width: number;
  stops: number[]; complete: boolean;
};
type Snapshot = { strokes: Stroke[]; active: Stroke | null; t: number; tool: Tool };
export type Tool = { ring: number; gear: number; hole: number; ink: number };
const copy = <T>(value: T): T => structuredClone(value);
export class Atelier {
  tool: Tool = { ring: 120, gear: 52, hole: 3, ink: 0 };
  strokes: Stroke[] = [];
  active: Stroke | null = null;
  t = 0;
  running = false;
  mode: 'auto' | 'manual' = 'auto';
  speed = 1;
  redoStack: Snapshot[] = [];
  get geometry(): Geometry { return { ring: this.tool.ring, gear: this.tool.gear, hole: HOLES[this.tool.hole] }; }
  get end(): number { return closure(this.geometry); }
  get progress(): number { return Math.min(1, Math.abs(this.t) / this.end); }
  get all(): Stroke[] { return [...this.strokes, ...(this.active ? [this.active] : [])]; }
  get hasInk(): boolean { return this.all.some(s => s.stops.length > 1); }
  private snapshot(): Snapshot { return copy({ strokes: this.strokes, active: this.active, t: this.t, tool: this.tool }); }
  private restore(s: Snapshot): void { Object.assign(this, copy(s)); this.running = false; }
  begin(): void {
    if (this.active) return;
    if (this.progress >= 1) this.t = 0;
    this.active = { id: crypto.randomUUID(), version: 1, geometry: this.geometry,
      color: INKS[this.tool.ink].color, width: 0.78, stops: [this.t], complete: false };
  }
  advance(delta: number): { from: number; to: number; stroke: Stroke } | null {
    if (!Number.isFinite(delta) || delta === 0) return null;
    this.begin();
    const stroke = this.active!, from = this.t;
    this.t = Math.max(-this.end, Math.min(this.end, this.t + delta));
    if (this.t === from) return null;
    this.redoStack = [];
    // Keep reversal points, coalesce monotonic intervals: compact exact geometry history.
    const stops = stroke.stops, last = stops.length - 1;
    if (last > 0 && Math.sign(stops[last] - stops[last - 1]) === Math.sign(this.t - from)) stops[last] = this.t;
    else stops.push(this.t);
    if (this.progress >= 1 - 1e-10) {
      stroke.complete = true; this.strokes.push(stroke); this.active = null; this.running = false;
    }
    return { from, to: this.t, stroke };
  }
  stop(): void {
    this.running = false;
    if (this.active && this.active.stops.length > 1) this.strokes.push(this.active);
    this.active = null;
    this.t = 0;
  }
  select(patch: Partial<Tool>): void { this.stop(); this.tool = { ...this.tool, ...patch }; }
  undo(): boolean {
    if (!this.hasInk) return false;
    this.redoStack.push(this.snapshot()); this.running = false;
    if (this.active && this.active.stops.length > 1) this.active = null;
    else { this.active = null; this.strokes.pop(); }
    this.t = 0; return true;
  }
  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    const rest = this.redoStack;
    this.restore(next); this.redoStack = rest; return true;
  }
  clear(): void { this.strokes = []; this.active = null; this.t = 0; this.running = false; this.redoStack = []; }
  example(): void {
    this.clear();
    const geometry = { ...this.geometry, hole: .84 };
    this.strokes = [{ id: crypto.randomUUID(), version: 1, geometry,
      color: INKS[1].color, width: 0.72, stops: [0, closure(geometry)], complete: true }];
  }
}
