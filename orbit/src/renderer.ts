import { gearPosition, pathData, penPosition, rotation, sampleSegment } from './geometry';
import { GEARS, INKS } from './catalog';
import { gearMarkup, ringMarkup } from './gears';
import type { Atelier, Stroke } from './state';
import { displayInk } from './contrast';
export const PAPER_SIZE = 760;
export class Renderer {
  private contexts: CanvasRenderingContext2D[];
  private cache = new Map<string, Path2D>();
  private signature = '';
  private highContrast = false;
  setContrast(enabled: boolean): void {
    this.highContrast = enabled; this.signature = ''; this.redraw();
  }
  constructor(private completed: HTMLCanvasElement, private active: HTMLCanvasElement,
    private svg: SVGSVGElement, private model: Atelier) {
    this.contexts = [completed.getContext('2d')!, active.getContext('2d')!];
    new ResizeObserver(() => this.resize()).observe(completed);
    this.resize();
  }
  resize(): void {
    const pixels = Math.round(this.completed.clientWidth * Math.min(window.devicePixelRatio || 1, 3));
    if (pixels < 1) return;
    [this.completed, this.active].forEach((canvas, i) => {
      canvas.width = pixels; canvas.height = pixels;
      const c = this.contexts[i], scale = pixels / PAPER_SIZE;
      c.setTransform(scale, 0, 0, scale, pixels / 2, pixels / 2);
    });
    this.redraw();
  }
  private clear(c: CanvasRenderingContext2D): void { c.clearRect(-380, -380, PAPER_SIZE, PAPER_SIZE); }
  private drawStroke(c: CanvasRenderingContext2D, s: Stroke, cache: boolean): void {
    let path = cache ? this.cache.get(s.id) : undefined;
    if (!path) { path = new Path2D(pathData(s.geometry, s.stops)); if (cache) this.cache.set(s.id, path); }
    c.strokeStyle = displayInk(s.color, this.highContrast); c.lineWidth = this.highContrast ? Math.max(1.2, s.width) : s.width;
    c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(path);
  }
  redraw(): void {
    const [done, active] = this.contexts;
    this.clear(done); this.clear(active);
    const ids = new Set(this.model.strokes.map(s => s.id));
    for (const id of this.cache.keys()) if (!ids.has(id)) this.cache.delete(id);
    this.model.strokes.forEach(s => this.drawStroke(done, s, true));
    if (this.model.active) this.drawStroke(active, this.model.active, false);
    this.tools(); this.position();
  }
  segment(s: Stroke, from: number, to: number): void {
    const c = this.contexts[1], points = sampleSegment(s.geometry, from, to);
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.strokeStyle = displayInk(s.color, this.highContrast); c.lineWidth = this.highContrast ? Math.max(1.2, s.width) : s.width;
    c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
    if (s.complete) this.redraw();
    else this.position();
  }
  private tools(): void {
    const m = this.model, signature = JSON.stringify(m.tool);
    if (signature === this.signature) return;
    this.signature = signature;
    const gear = GEARS.find(g => g.teeth === m.tool.gear)!;
    this.svg.innerHTML = `<g transform="translate(380 380)"><g class="fixed-ring">${ringMarkup(m.geometry)}</g><g id="moving-gear">${gearMarkup(gear.teeth, gear.color, 'moving', true, m.tool.hole)}</g><g id="pen-marker" pointer-events="none"><circle r="5" fill="${INKS[m.tool.ink].color}" stroke="#fffdf5" stroke-width="2"/><circle r="11" fill="none" stroke="${INKS[m.tool.ink].color}" stroke-opacity=".5" stroke-width="1"/></g></g>`;
  }
  position(): void {
    const m = this.model, p = gearPosition(m.geometry, m.t), pen = penPosition(m.geometry, m.t);
    this.svg.querySelector('#moving-gear')?.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${rotation(m.geometry, m.t) * 180 / Math.PI})`);
    this.svg.querySelector('#pen-marker')?.setAttribute('transform', `translate(${pen.x} ${pen.y})`);
  }
}
