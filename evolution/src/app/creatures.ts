/**
 * Organism rendering. Every visible feature is read from the organism:
 *   body area            size                       elongation      maxSpeed
 *   side notch (bean)    offspringInvest            outline ripples first controller weights
 *                                                    (relatives inherit them, so kin look alike)
 *   cool / warm hues     markerB / markerA (neutral: lineage colour, no effect on survival)
 *   nucleus size         current energy / capacity
 *   antennae             the three sensor rays; length = senseRange
 *   tail beat            current speed
 *   birth / dissolution  actual birth and death events of the simulation
 * Bodies are cached as sprites per organism (genome is fixed for life).
 */
import {
  Rng, TRAITS, N_TRAITS, T_SPEED, T_SENSE, T_INVEST,
  type Simulation, type Organism,
} from '../sim';
import type { Camera } from './camera';
import { coloursOf, pigmentCss } from './palette';
import { particleCounts } from './anatomy';

const TAU = Math.PI * 2;
const INK = '#2a1745';

interface Shape { a: number; b: number; ext: number; pts: number[]; polygon?: boolean }
interface Sprite { c: HTMLCanvasElement; res: number; key: number; ext: number }
interface Vis {
  px: number; py: number; ph: number; // pose before the last tick
  lx: number; ly: number; lh: number; // last drawn pose
  phase: number;
  born: number; ox: number; oy: number;
  stamp: number;
  sprite?: Sprite;
  shape: Shape;
}
interface Ghost { x: number; y: number; h: number; sprite: Sprite; t0: number }

/** Radius is enlarged for legibility; displayed area also varies with the decorative silhouette. */
export const BODY_SCALE = 1.5;

const norm = (i: number, v: number) => (v - TRAITS[i].min) / (TRAITS[i].max - TRAITS[i].min);
const wrap = (a: number) => (a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a);

export function shapeOf(o: Organism): Shape {
  const t = o.ph.traits, R = o.ph.radius * BODY_SCALE;
  if (o.type === 1 || o.type === 2) {
    const count = o.type === 1 ? o.corners : o.lobes;
    const n = o.type === 1 ? count : count * 24;
    const pts: number[] = [];
    for (let i = 0; i < n; i++) {
      const th = i / n * TAU;
      const r = o.type === 1 ? R : R * (1 + .24 * Math.cos(count * th));
      pts.push(Math.cos(th) * r, Math.sin(th) * r);
    }
    let area = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += pts[i * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[i * 2 + 1]; }
    const scale = Math.sqrt(Math.PI * R * R / (Math.abs(area) / 2));
    for (let i = 0; i < pts.length; i++) pts[i] *= scale;
    const ext = Math.max(...pts.map(Math.abs)) * 1.2 + 1;
    return { a: R, b: R, ext, pts, polygon: o.type === 1 };
  }
  const sp = norm(T_SPEED, t[T_SPEED]);
  const a = R * (1 + 0.5 * sp), b = R * (1 - 0.15 * sp);
  const notch = 0.05 + 0.34 * norm(T_INVEST, t[T_INVEST]);
  const g = o.genome, k = N_TRAITS;
  const h2 = 0.07 * Math.tanh(g[k + 1]), h3 = 0.06 * Math.tanh(g[k + 2]), h4 = 0.035 * Math.tanh(g[k + 5]);
  const p2 = g[k + 3], p3 = g[k + 4];
  const pts: number[] = [];
  const N = 44;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * TAU;
    let r = 1 + h2 * Math.cos(2 * th + p2) + h3 * Math.cos(3 * th + p3) + h4 * Math.cos(4 * th);
    const d = wrap(th - Math.PI / 2);
    r *= 1 - notch * Math.exp((-d * d) / 0.32);
    pts.push(Math.cos(th) * a * r, Math.sin(th) * b * r);
  }
  return { a, b, ext: Math.max(a, b) * 1.3 + 0.8, pts };
}

function outline(ctx: CanvasRenderingContext2D, pts: number[], polygon = false): void {
  const n = pts.length / 2;
  ctx.beginPath();
  if (polygon) {
    for (let i = 0; i < n; i++) {
      const p = ((i + n - 1) % n) * 2, v = i * 2, q = ((i + 1) % n) * 2;
      const x = pts[v] * .82 + pts[p] * .18, y = pts[v + 1] * .82 + pts[p + 1] * .18;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      ctx.quadraticCurveTo(pts[v], pts[v + 1], pts[v] * .82 + pts[q] * .18, pts[v + 1] * .82 + pts[q + 1] * .18);
    }
    ctx.closePath(); return;
  }
  for (let i = 0; i <= n; i++) {
    const j = (i % n) * 2, k = ((i + 1) % n) * 2;
    const mx = (pts[j] + pts[k]) / 2, my = (pts[j + 1] + pts[k + 1]) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(pts[j], pts[j + 1], mx, my);
  }
  ctx.closePath();
}

/** Paint a body (no nucleus) in local coordinates: +x = heading. */
function paintBody(ctx: CanvasRenderingContext2D, o: Organism, sh: Shape, pxPerUnit: number): void {
  const { cool, warm } = coloursOf(o.ph.traits, o.type);
  const { a, b, pts } = sh;
  // pale membrane halo, as in the concept art
  outline(ctx, pts, sh.polygon);
  ctx.lineWidth = Math.max(0.9, a * 0.28);
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.stroke();
  const g = ctx.createLinearGradient(a, -b * 0.6, -a, b * 0.6);
  g.addColorStop(0, pigmentCss(cool));
  g.addColorStop(0.42, pigmentCss({ ...cool, s: cool.s - 4, l: cool.l + 7 }));
  const hueDelta = ((warm.h - cool.h + 540) % 360) - 180;
  g.addColorStop(0.62, `hsl(${(cool.h + hueDelta * .5 + 360) % 360},40%,80%)`);
  g.addColorStop(1, pigmentCss(warm));
  ctx.fillStyle = g;
  ctx.fill();
  // granular pigment, seeded by the genome so a clone always looks identical
  ctx.save();
  ctx.clip();
  const rng = new Rng(((o.genome[N_TRAITS] * 1e6) ^ (o.genome[N_TRAITS + 7] * 1e6)) | 0);
  const dots = Math.min(700, Math.round(a * b * pxPerUnit * pxPerUnit * 0.35));
  const dot = 1 / pxPerUnit;
  for (let i = 0; i < dots; i++) {
    const x = (rng.next() * 2 - 1) * a, y = (rng.next() * 2 - 1) * b;
    const warmSide = (a - x) / (2 * a);
    ctx.fillStyle = rng.next() < warmSide * 0.8
      ? `hsla(${warm.h},${warm.s + 2}%,${warm.l - 7}%,${0.25 + rng.next() * 0.35})`
      : `hsla(${cool.h},${cool.s + 8}%,${cool.l - 16 + rng.next() * 35}%,${0.2 + rng.next() * 0.35})`;
    ctx.fillRect(x, y, dot * (1 + rng.next()), dot * (1 + rng.next()));
  }
  const rg = ctx.createRadialGradient(0, 0, Math.min(a, b) * 0.3, 0, 0, a * 1.05);
  rg.addColorStop(0, 'rgba(255,255,255,0)');
  rg.addColorStop(1, 'rgba(42,23,69,.13)');
  ctx.fillStyle = rg;
  ctx.fillRect(-a * 1.2, -b * 1.2, a * 2.4, b * 2.4);
  ctx.restore();
  // Internal structures are clipped to the membrane and cached with the inherited body.
  if (o.type !== 0) {
    ctx.save(); outline(ctx, pts, sh.polygon); ctx.clip();
    if (o.type === 1) {
      ctx.beginPath();
      for (let i = 0; i < o.corners; i++) {
        ctx.moveTo(-a * .1, -b * .05);
        ctx.lineTo(pts[i * 2] * .73, pts[i * 2 + 1] * .73);
      }
      ctx.lineWidth = Math.max(.5 / pxPerUnit, a * .035);
      ctx.strokeStyle = `hsla(${cool.h},45%,42%,.46)`; ctx.stroke();
      ctx.fillStyle = `hsla(${cool.h},50%,42%,.65)`;
      ctx.beginPath();
      for (let i = 0; i < o.corners; i++) {
        const x = pts[i * 2] * .73, y = pts[i * 2 + 1] * .73, r = a * .065;
        ctx.moveTo(x + r,y); ctx.arc(x,y,r,0,TAU);
      }
      ctx.fill();
    } else {
      const counts = particleCounts(o);
      ctx.fillStyle = `hsla(${cool.h},48%,39%,.67)`;
      ctx.beginPath();
      for (let lobe = 0; lobe < counts.length; lobe++) {
        const angle = lobe / o.lobes * TAU, c = Math.cos(angle), s = Math.sin(angle);
        for (let j = 0; j < counts[lobe]; j++) {
          const radial = a * (.68 + (j % 2) * .16), side = a * (j === 0 ? 0 : j === 1 ? -.16 : .16);
          const x = c * radial - s * side, y = s * radial + c * side, r = a * .055;
          ctx.moveTo(x+r,y); ctx.arc(x,y,r,0,TAU);
        }
      }
      ctx.fill();
    }
    ctx.restore();
  }
  outline(ctx, pts, sh.polygon);
  ctx.lineWidth = Math.max(0.6 / pxPerUnit * 1.5, a * 0.06);
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.stroke();
}

function buildSprite(o: Organism, sh: Shape, res: number): Sprite {
  const c = document.createElement('canvas');
  const size = Math.max(4, Math.ceil(sh.ext * 2 * res));
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, size / 2, size / 2);
  paintBody(ctx, o, sh, res);
  return { c, res, key: res, ext: sh.ext };
}

/** Nucleus: a dark bean whose size follows the energy reserve. */
function nucleus(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, sh: Shape, e: number, sc: number): void {
  const k = (0.32 + 0.68 * Math.min(1, e)) * sc;
  const c = Math.cos(h), s = Math.sin(h);
  const ox = -sh.a * 0.1 * sc, oy = -sh.b * 0.05 * sc;
  const cx = x + c * ox - s * oy, cy = y + s * ox + c * oy;
  ctx.moveTo(cx + Math.cos(h + 0.35) * sh.a * 0.46 * k, cy + Math.sin(h + 0.35) * sh.a * 0.46 * k);
  ctx.ellipse(cx, cy, sh.a * 0.46 * k, sh.b * 0.36 * k, h + 0.35, 0, TAU);
}

export class Creatures {
  vis = new Map<number, Vis>();
  private ghosts: Ghost[] = [];
  private frame = 0;
  private time = 0;

  constructor(private canvas: HTMLCanvasElement) {}

  reset(): void {
    this.vis.clear();
    this.ghosts = [];
    this.time = 0;
  }

  /** Call right before the last sim tick of a frame. */
  capturePrev(sim: Simulation): void {
    for (const o of sim.orgs) {
      const v = this.vis.get(o.id);
      if (v) { v.px = o.x; v.py = o.y; v.ph = o.heading; }
    }
  }

  /** Detect births and deaths since the last frame. */
  sync(sim: Simulation, fx: boolean, dt: number): void {
    this.time += dt;
    if (!fx) this.ghosts = [];
    const f = ++this.frame;
    for (const o of sim.orgs) {
      let v = this.vis.get(o.id);
      if (!v) {
        v = { px: o.x, py: o.y, ph: o.heading, lx: o.x, ly: o.y, lh: o.heading, phase: o.id, born: -1e9, ox: o.x, oy: o.y, stamp: f, shape: shapeOf(o) };
        const p = fx ? this.vis.get(o.parentId) : undefined;
        if (p) { v.born = this.time; v.ox = p.lx; v.oy = p.ly; }
        this.vis.set(o.id, v);
      }
      if (!fx) v.born = -1e9;
      v.stamp = f;
    }
    for (const [id, v] of this.vis) {
      if (v.stamp === f) continue;
      if (fx && v.sprite && this.ghosts.length < 300) this.ghosts.push({ x: v.lx, y: v.ly, h: v.lh, sprite: v.sprite, t0: this.time });
      this.vis.delete(id);
    }
  }

  render(sim: Simulation, cam: Camera, alpha: number, t: number, dt: number, dpr: number, selected: number, hover: number): void {
    const cv = this.canvas;
    const w = Math.round(cam.vw * dpr), h = Math.round(cam.vh * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const k = cam.s * dpr;
    const tx = (dpr * cam.vw) / 2 - cam.x * k, ty = (dpr * cam.vh) / 2 - cam.y * k;
    const res = Math.min(48, Math.pow(2, Math.ceil(Math.log2(Math.max(1, k)))));
    const f = this.time;
    const margin = 40;
    const [x0, y0] = cam.toWorld(0, 0), [x1, y1] = cam.toWorld(cam.vw, cam.vh);

    // poses
    const poses: { o: Organism; v: Vis; x: number; y: number; h: number; sc: number; al: number }[] = [];
    for (const o of sim.orgs) {
      const v = this.vis.get(o.id);
      if (!v) continue;
      let x = v.px + (o.x - v.px) * alpha, y = v.py + (o.y - v.py) * alpha;
      const hh = v.ph + wrap(o.heading - v.ph) * alpha;
      let sc = 1, al = 1;
      const g = (f - v.born) / (2 / 3);
      if (g < 1) {
        const e = 1 - (1 - g) * (1 - g) * (1 - g);
        sc = 0.35 + 0.65 * e;
        al = Math.min(1, g * 2.5);
        x = v.ox + (x - v.ox) * e;
        y = v.oy + (y - v.oy) * e;
      }
      v.lx = x; v.ly = y; v.lh = hh;
      v.phase += dt * (1.2 + 9 * o.speed);
      if (x < x0 - margin || x > x1 + margin || y < y0 - margin || y > y1 + margin) continue;
      poses.push({ o, v, x, y, h: hh, sc, al });
    }

    ctx.setTransform(k, 0, 0, k, tx, ty);
    ctx.lineCap = 'round';

    // Presentation-only death fade. No particles implying nutrient recycling.
    this.ghosts = this.ghosts.filter((gh) => f - gh.t0 < 0.9);
    for (const gh of this.ghosts) {
      const g = (f - gh.t0) / 0.9;
      ctx.globalAlpha = (1 - g) * (1 - g) * 0.7;
      const sc = 1 + 0.12 * g, c = Math.cos(gh.h) * sc, s = Math.sin(gh.h) * sc;
      ctx.setTransform(k * c, k * s, -k * s, k * c, tx + gh.x * k, ty + gh.y * k);
      const sp = gh.sprite;
      ctx.drawImage(sp.c, -sp.ext, -sp.ext, sp.ext * 2, sp.ext * 2);
      ctx.setTransform(k, 0, 0, k, tx, ty);
    }
    ctx.globalAlpha = 1;

    // antennae (sensor rays) and tails, batched into one stroke
    const sa = sim.cfg.sensorAngle;
    const fine = cam.s > 1.6; // CSS px per world unit
    const segs = fine ? 6 : 3;
    const tips: number[] = [];
    ctx.beginPath();
    for (const p of poses) {
      const { o, v, x, y, h, sc } = p;
      if (o.type !== 0) continue;
      const sh = v.shape;
      const len = o.ph.traits[T_SENSE] * 0.26 * sc;
      const sway = Math.sin(t * 1.3 + o.id) * 0.1;
      for (const an of [-sa, 0, sa]) {
        const bx = x + (Math.cos(h) * Math.cos(an) * sh.a - Math.sin(h) * Math.sin(an) * sh.b) * 0.85 * sc;
        const by = y + (Math.sin(h) * Math.cos(an) * sh.a + Math.cos(h) * Math.sin(an) * sh.b) * 0.85 * sc;
        const d = h + an * 1.15 + sway;
        const ex = bx + Math.cos(d) * len, ey = by + Math.sin(d) * len;
        const curl = 0.22 * len * (an === 0 ? Math.sin(t + o.id) : Math.sign(an));
        ctx.moveTo(bx, by);
        if (fine) ctx.quadraticCurveTo((bx + ex) / 2 - Math.sin(d) * curl, (by + ey) / 2 + Math.cos(d) * curl, ex, ey);
        else ctx.lineTo(ex, ey);
        tips.push(ex, ey);
      }
      if (o.type !== 0) continue; // polygon / lobes are not extra locomotion organs
      // tail: beats with current speed
      const tl = sh.a * (0.8 + 0.9 * norm(T_SPEED, o.ph.traits[T_SPEED])) * sc;
      const amp = sh.b * 0.45 * sc * Math.min(1, o.speed);
      for (const off of fine ? [-0.28, 0.28] : [0]) {
        const bx = x - Math.cos(h + off) * sh.a * 0.9 * sc, by = y - Math.sin(h + off) * sh.a * 0.9 * sc;
        ctx.moveTo(bx, by);
        for (let j = 1; j <= segs; j++) {
          const u = j / segs, lat = Math.sin(v.phase - j * 1.1 + off * 4) * amp * u;
          ctx.lineTo(bx - Math.cos(h + off * 0.5) * tl * u - Math.sin(h) * lat, by - Math.sin(h + off * 0.5) * tl * u + Math.cos(h) * lat);
        }
      }
    }
    ctx.lineWidth = Math.max(0.28, 0.9 / k);
    ctx.strokeStyle = 'rgba(58,104,140,.6)';
    ctx.stroke();
    ctx.fillStyle = '#ef8b45';
    if (fine) {
      ctx.beginPath();
      for (let i = 0; i < tips.length; i += 2) {
        ctx.moveTo(tips[i] + 0.7, tips[i + 1]);
        ctx.arc(tips[i], tips[i + 1], 0.7, 0, TAU);
      }
      ctx.fill();
    } else {
      for (let i = 0; i < tips.length; i += 2) ctx.fillRect(tips[i] - 0.6, tips[i + 1] - 0.6, 1.2, 1.2);
    }

    // bodies
    for (const p of poses) {
      const { o, v, x, y, h, sc, al } = p;
      if (!v.sprite || v.sprite.key !== res) { v.sprite = buildSprite(o, v.shape, Math.min(res, 512 / (v.shape.ext * 2))); v.sprite.key = res; }
      const c = Math.cos(h) * sc * k, s = Math.sin(h) * sc * k;
      ctx.globalAlpha = al;
      ctx.setTransform(c, s, -s, c, tx + x * k, ty + y * k);
      const sp = v.sprite;
      ctx.drawImage(sp.c, -sp.ext, -sp.ext, sp.ext * 2, sp.ext * 2);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(k, 0, 0, k, tx, ty);

    // nuclei
    ctx.beginPath();
    for (const p of poses) nucleus(ctx, p.x, p.y, p.h, p.v.shape, p.o.energy / p.o.ph.capacity, p.sc);
    ctx.fillStyle = INK;
    ctx.fill();

    // division tethers: dots between parent and child while the child separates
    ctx.fillStyle = '#ef8b45';
    ctx.beginPath();
    for (const p of poses) {
      const g = (f - p.v.born) / (2 / 3);
      if (g >= 1) continue;
      for (let i = 1; i < 5; i++) {
        const u = i / 5, px = p.v.ox + (p.x - p.v.ox) * u, py = p.v.oy + (p.y - p.v.oy) * u;
        const r = 0.55 * (1 - g);
        ctx.moveTo(px + r, py);
        ctx.arc(px, py, r, 0, TAU);
      }
    }
    ctx.fill();

    // selection and hover
    for (const id of [hover, selected]) {
      const p = poses.find((q) => q.o.id === id);
      if (!p) continue;
      const R = p.v.shape.ext * 1.25 + 2;
      ctx.lineWidth = 1.2 / k * dpr;
      ctx.strokeStyle = id === selected ? 'rgba(42,23,69,.75)' : 'rgba(42,23,69,.3)';
      ctx.setLineDash(id === selected ? [3 / k * dpr, 4 / k * dpr] : []);
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, TAU);
      ctx.stroke();
      if (id === selected) {
        // true sensor reach
        ctx.setLineDash([1 / k * dpr, 5 / k * dpr]);
        ctx.strokeStyle = 'rgba(42,23,69,.35)';
        ctx.beginPath();
        for (const an of [-sa, 0, sa]) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(p.h + an) * p.o.ph.traits[T_SENSE], p.y + Math.sin(p.h + an) * p.o.ph.traits[T_SENSE]);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }
}

const portraits = new WeakMap<Organism, { shape: Shape; sprite?: Sprite }>();

/** Specimen portrait; cache immutable geometry and pigment instead of repainting grain each frame. */
export function portrait(cv: HTMLCanvasElement, o: Organism, sensorAngle: number, t: number): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  let cached = portraits.get(o);
  if (!cached) { cached = { shape: shapeOf(o) }; portraits.set(o, cached); }
  const sh = cached.shape;
  const len = o.type === 0 ? o.ph.traits[T_SENSE] * 0.26 : 0;
  const span = sh.a * 2.1 + len;
  const k = Math.min((W * 0.86) / span, (H * 0.8) / (sh.ext * 2 + len * 0.9)) * dpr;
  const cx = (W * dpr) / 2 - len * 0.45 * k, cy = (H * dpr) / 2;
  ctx.setTransform(k, 0, 0, k, cx, cy);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const an of o.type === 0 ? [-sensorAngle, 0, sensorAngle] : []) {
    const bx = Math.cos(an) * sh.a * 0.85, by = Math.sin(an) * sh.b * 0.85;
    const d = an * 1.15 + Math.sin(t * 1.3) * 0.08;
    const ex = bx + Math.cos(d) * len, ey = by + Math.sin(d) * len;
    const curl = 0.22 * len * (an === 0 ? Math.sin(t) : Math.sign(an));
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo((bx + ex) / 2 - Math.sin(d) * curl, (by + ey) / 2 + Math.cos(d) * curl, ex, ey);
  }
  const tl = sh.a * (0.8 + 0.9 * norm(T_SPEED, o.ph.traits[T_SPEED]));
  for (const off of o.type === 0 ? [-0.28, 0.28] : []) {
    const bx = -Math.cos(off) * sh.a * 0.9, by = -Math.sin(off) * sh.a * 0.9;
    ctx.moveTo(bx, by);
    for (let j = 1; j <= 8; j++) {
      const u = j / 8;
      ctx.lineTo(bx - Math.cos(off * 0.5) * tl * u, by - Math.sin(off * 0.5) * tl * u + Math.sin(t * (1.2 + 9 * o.speed) - j + off * 4) * sh.b * 0.3 * Math.min(1, o.speed) * u);
    }
  }
  ctx.lineWidth = 1.1 / k * dpr;
  ctx.strokeStyle = 'rgba(58,104,140,.65)';
  ctx.stroke();
  const res = Math.min(48, Math.pow(2, Math.ceil(Math.log2(Math.max(1, k)))));
  if (!cached.sprite || cached.sprite.key !== res) {
    cached.sprite = buildSprite(o, sh, Math.min(res, 512 / (sh.ext * 2)));
    cached.sprite.key = res;
  }
  ctx.drawImage(cached.sprite.c, -sh.ext, -sh.ext, sh.ext * 2, sh.ext * 2);
  ctx.beginPath();
  nucleus(ctx, 0, 0, 0, sh, o.energy / o.ph.capacity, 1);
  ctx.fillStyle = INK;
  ctx.fill();
}
