// 原子筆拆彈簧: tap the pen to unscrew it and pop the spring out onto the desk. Drag
// either end to stretch or squash it; let go and the mass–spring chain boings back.
// Tap the open pen to send the spring home and screw the pen shut.

import { createStage, startLoop, listen, theme, sketch, wline, wpoly, wrect, deskPath } from '../main.js';
import { createBus, audio, noiseBurst, tone } from '../audio.js';
import { buzz } from '../haptics.js';

export const help = {
  touch: ['點筆身：旋開筆、彈出彈簧', '按住彈簧一端拉長或壓扁，放手回彈', '兩指可各拉一端', '筆打開時點筆身：彈簧飛回'],
  mouse: ['點擊筆身：旋開筆、彈出彈簧', '拖曳彈簧一端拉長或壓扁，放開回彈', '筆打開時點擊筆身：彈簧飛回'],
};

const N = 8; // masses along the spring
const TURNS = 11;
const K = 900; // neighbour stiffness
const K_BEND = 400; // next-neighbour stiffness, keeps the coil from folding
const DAMP = 0.3;
const SUBSTEPS = 6;
const TWIST_TIME = 0.28;
const RETURN_TIME = 0.45;

// Kept between visits.
const state = {
  phase: 'closed', // closed | twisting | open | returning | closing
  timer: 0,
  gap: 0, gapV: 0,
  nodes: null, // [{ x, y, vx, vy }] while the spring is out of the pen
  from: null, // node positions when the return flight began
};

let stage, bus, stopLoop, stopListening;
const drags = new Map(); // pointerId → { node, x, y }
let anchor = null; // the far end, held still while a single finger stretches the spring
let lastTick = 0;
const g = { P: 0, T: 0, x: 0, y: 0, G: 0, desk: 0, Ls: 0, D: 0, gravity: 0 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const seg = () => g.Ls / (N - 1);
const floorY = () => g.desk - g.D / 2;
const joint = () => g.x + g.P * 0.45; // where the halves screw together (closed)

function layout(s) {
  const area = s.bottom;
  g.P = Math.min(s.w * 0.72, 520, area * 1.1);
  g.T = clamp(g.P * 0.06, 16, 30);
  g.G = g.P * 0.24;
  g.x = (s.w - g.P - g.G) / 2;
  g.y = area * 0.34;
  g.desk = area * 0.74;
  g.Ls = g.P * 0.16;
  g.D = clamp(g.P * 0.07, 16, 28);
  g.gravity = area * 2.4;
}

export function mount(container) {
  stage = createStage(container, layout);
  bus = createBus();
  stopListening = listen(stage.canvas, { down, move, up });
  stopLoop = startLoop(frame);
}

export function unmount() {
  stopLoop();
  stopListening();
  bus.stop();
  stage.destroy();
  drags.clear();
  anchor = null;
}

// ---------- input ----------

function onPen(p) {
  const pad = p.touch ? 24 : 8;
  return p.x > g.x - pad && p.x < g.x + g.P + state.gap + pad && Math.abs(p.y - g.y) < g.T * 0.9 + pad;
}

/** The spring end nearest the pointer, if the pointer is on or near the spring. */
function springEnd(p) {
  const nodes = state.nodes;
  if (!nodes || state.phase !== 'open') return -1;
  const pad = (p.touch ? 34 : 14) + g.D / 2;
  if (!nodes.some((n) => Math.hypot(n.x - p.x, n.y - p.y) < pad)) return -1;
  const a = nodes[0], b = nodes[N - 1];
  const end = Math.hypot(a.x - p.x, a.y - p.y) <= Math.hypot(b.x - p.x, b.y - p.y) ? 0 : N - 1;
  return [...drags.values()].some((d) => d.node === end) ? (end === 0 ? N - 1 : 0) : end;
}

function down(p) {
  const end = springEnd(p);
  if (end >= 0 && drags.size < 2) {
    const n = state.nodes[end];
    drags.set(p.id, { node: end, x: n.x, y: n.y, dx: n.x - p.x, dy: n.y - p.y });
    const other = state.nodes[end === 0 ? N - 1 : 0];
    anchor = drags.size === 1 ? { node: end === 0 ? N - 1 : 0, x: other.x, y: other.y } : null;
    return;
  }
  if (drags.size || !onPen(p)) return;
  if (state.phase === 'closed') {
    state.phase = 'twisting';
    state.timer = 0;
  } else if (state.phase === 'open' && state.nodes) {
    state.phase = 'returning';
    state.timer = 0;
    state.from = state.nodes.map((n) => ({ x: n.x, y: n.y }));
    noiseBurst(bus, { dur: 0.3, attack: 0.12, freq: 700, q: 0.7, gain: 0.15 });
  }
}

function move(p) {
  const d = drags.get(p.id);
  if (!d) return;
  // keep the length within reach of the other end
  const otherDrag = [...drags.values()].find((o) => o !== d);
  const q = otherDrag ?? anchor ?? state.nodes[d.node === 0 ? N - 1 : 0];
  let x = p.x + d.dx, y = clamp(p.y + d.dy, g.D, floorY());
  const vx = x - q.x, vy = y - q.y, len = Math.hypot(vx, vy) || 1;
  const want = clamp(len, g.Ls * 0.3, g.Ls * 3.4);
  d.x = q.x + (vx / len) * want;
  d.y = clamp(q.y + (vy / len) * want, g.D, floorY());
}

function up(p) {
  if (!drags.delete(p.id)) return;
  if (drags.size === 1) {
    const [rest] = drags.values();
    const n = state.nodes[rest.node === 0 ? N - 1 : 0];
    anchor = { node: rest.node === 0 ? N - 1 : 0, x: n.x, y: n.y };
    return;
  }
  anchor = null;
  const a = state.nodes[0], b = state.nodes[N - 1];
  const strain = Math.abs(Math.hypot(a.x - b.x, a.y - b.y) / g.Ls - 1);
  if (strain > 0.08) boing(strain);
}

// ---------- sound ----------

function popSound() {
  tone(bus, { f0: 760, f1: 240, dur: 0.08, gain: 0.4 });
  noiseBurst(bus, { dur: 0.02, freq: 3000, q: 1, gain: 0.3 });
}

function tickSound(speed) {
  const gain = Math.min(0.22, speed / 3500);
  tone(bus, { type: 'triangle', f0: 2400 + Math.random() * 900, dur: 0.05, gain });
  tone(bus, { f0: 3900 + Math.random() * 500, dur: 0.03, gain: gain * 0.5 });
}

function clickSound() {
  noiseBurst(bus, { dur: 0.03, freq: 3000, q: 3, gain: 0.5 });
  tone(bus, { type: 'triangle', f0: 1800, f1: 800, dur: 0.03, gain: 0.3 });
}

/** 啵嚶: a sine with a decaying wobble; tighter springs sing higher. */
function boing(strain) {
  buzz([8, 30, 8]);
  const ctx = audio();
  const out = bus.node;
  if (!ctx || !out) return;
  const s = Math.min(strain, 1.6) / 1.6;
  const f0 = 240 + 640 * s;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(f0 * 1.2, now);
  osc.frequency.exponentialRampToValueAtTime(f0, now + 0.12);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 7 + 7 * s;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(f0 * 0.35, now);
  depth.gain.exponentialRampToValueAtTime(f0 * 0.02, now + 0.7);
  lfo.connect(depth).connect(osc.frequency);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.32 + 0.1 * s, now + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
  osc.connect(env).connect(out);
  for (const o of [osc, lfo]) {
    o.start(now);
    o.stop(now + 0.8);
  }
  noiseBurst(bus, { dur: 0.015, freq: 2500, q: 1, gain: 0.25 });
}

// ---------- simulation ----------

function launch() {
  const cx = joint(), r = seg();
  const vx = (Math.random() - 0.5) * 260, vy = -g.gravity * (0.55 + Math.random() * 0.15);
  const spin = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 5);
  state.nodes = Array.from({ length: N }, (_, i) => {
    const off = (i - (N - 1) / 2) * r;
    return { x: cx + off, y: g.y, vx, vy: vy + spin * off };
  });
  popSound();
  buzz(15);
}

function frame(dt, now) {
  const s = state;
  s.timer += dt;
  if (s.phase === 'twisting' && s.timer >= TWIST_TIME) {
    s.phase = 'open';
    s.gapV = g.G * 14;
    launch();
  } else if (s.phase === 'twisting' && Math.floor(s.timer / 0.07) !== Math.floor((s.timer - dt) / 0.07)) {
    noiseBurst(bus, { dur: 0.012, freq: 3500, q: 4, gain: 0.25 });
  }
  // the gap between the halves springs open, or closes again
  const target = s.phase === 'open' || s.phase === 'returning' ? g.G : 0;
  if (s.phase === 'closing') {
    s.gap = Math.max(0, s.gap - g.G * dt * 7);
    if (s.gap === 0) {
      s.phase = 'closed';
      s.gapV = 0;
      clickSound();
      buzz(12);
    }
  } else {
    s.gapV += (420 * (target - s.gap) - 20 * s.gapV) * dt;
    s.gap += s.gapV * dt;
  }

  if (s.phase === 'returning') {
    const e = ease(s.timer / RETURN_TIME);
    const len = g.Ls * 0.7, cx = joint() + s.gap * 0.5;
    s.nodes.forEach((n, i) => {
      const tx = cx - len / 2 + (len * i) / (N - 1);
      n.x = s.from[i].x + (tx - s.from[i].x) * e;
      n.y = s.from[i].y + (g.y - s.from[i].y) * e - Math.sin(Math.PI * e) * stage.bottom * 0.18;
    });
    if (s.timer >= RETURN_TIME) {
      s.phase = 'closing';
      s.nodes = null;
    }
  } else if (s.nodes) {
    for (let k = 0; k < SUBSTEPS; k++) step(dt / SUBSTEPS, now);
  }
  draw();
}

/**
 * A damped spring between two masses. With an axis given, a pair that has swapped
 * order along it counts as a negative length, so a coil squashed past itself unfolds
 * instead of settling folded (plain distance springs can't tell the two apart).
 */
function spring(a, b, rest, k, axis) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let len = Math.hypot(dx, dy) || 1e-6, ux = dx / len, uy = dy / len;
  if (axis && dx * axis.x + dy * axis.y < 0) {
    len = -len;
    ux = -ux; uy = -uy;
  }
  const rel = (b.vx - a.vx) * ux + (b.vy - a.vy) * uy;
  const f = k * (len - rest) + DAMP * rel * Math.sqrt(k);
  a.fx += f * ux; a.fy += f * uy;
  b.fx -= f * ux; b.fy -= f * uy;
}

function step(h, now) {
  const nodes = state.nodes;
  const r = seg();
  const ax = nodes[N - 1].x - nodes[0].x, ay = nodes[N - 1].y - nodes[0].y, al = Math.hypot(ax, ay);
  const axis = al > 1 ? { x: ax / al, y: ay / al } : null;
  for (const n of nodes) { n.fx = 0; n.fy = g.gravity; }
  for (let i = 0; i < N - 1; i++) spring(nodes[i], nodes[i + 1], r, K, axis);
  for (let i = 0; i < N - 2; i++) spring(nodes[i], nodes[i + 2], 2 * r, K_BEND, axis);

  const pins = [...drags.values()];
  if (anchor) pins.push(anchor);
  const fy = floorY(), wall = g.D;
  let impact = 0;
  for (let i = 0; i < N; i++) {
    const n = nodes[i];
    const pin = pins.find((p) => p.node === i);
    if (pin) {
      n.vx = (pin.x - n.x) / h * 0.5;
      n.vy = (pin.y - n.y) / h * 0.5;
      n.x = pin.x;
      n.y = pin.y;
      continue;
    }
    n.vx += n.fx * h;
    n.vy += n.fy * h;
    n.x += n.vx * h;
    n.y += n.vy * h;
    if (n.y > fy) {
      n.y = fy;
      if (n.vy > 0) {
        impact = Math.max(impact, n.vy);
        n.vy = n.vy > 50 ? -n.vy * 0.3 : 0;
      }
      n.vx *= Math.exp(-h * 3);
    }
    if (n.y < wall) { n.y = wall; n.vy = Math.abs(n.vy) * 0.5; }
    if (n.x < wall) { n.x = wall; n.vx = Math.abs(n.vx) * 0.5; }
    if (n.x > stage.w - wall) { n.x = stage.w - wall; n.vx = -Math.abs(n.vx) * 0.5; }
  }
  if (impact > 160 && now - lastTick > 0.06) {
    lastTick = now;
    tickSound(impact);
  }
}

// ---------- drawing ----------

function draw() {
  stage.clear();
  const ctx = stage.ctx;
  sketch(ctx, deskPath(-10, stage.w + 10, g.desk), { width: 1.6, alpha: 0.7 });
  drawPen(ctx);
  if (state.nodes) drawSpring(ctx, state.nodes);
}

function drawPen(ctx) {
  const { P, T } = g;
  const s = state;
  const front = -s.gap * 0.45, back = s.gap * 0.55;
  const wobble = s.phase === 'twisting' ? Math.sin(s.timer * 90) * 0.01 : 0;

  ctx.save();
  ctx.translate(g.x, g.y);

  // front half: tip, barrel, grip, and the thread that shows when open
  ctx.save();
  ctx.translate(front, 0);
  let p = new Path2D();
  wpoly(p, [0, 0, P * 0.08, -T * 0.32, P * 0.08, T * 0.32], true, 1);
  sketch(ctx, p, { fill: theme.metal, width: 1.6 });
  if (s.gap > 2) {
    p = new Path2D();
    wrect(p, P * 0.44, -T * 0.32, P * 0.035, T * 0.64, 1, 2);
    for (let x = P * 0.448; x < P * 0.472; x += 4) {
      p.moveTo(x, -T * 0.32);
      p.lineTo(x + 3, T * 0.32);
    }
    sketch(ctx, p, { fill: theme.metal, width: 1.4 });
  }
  p = new Path2D();
  wrect(p, P * 0.08, -T * 0.5, P * 0.37, T, T * 0.3, 3);
  sketch(ctx, p, { fill: theme.fill4 });
  p = new Path2D();
  for (let x = P * 0.12; x < P * 0.3; x += T * 0.32) {
    p.moveTo(x, -T * 0.42);
    wline(p, x, -T * 0.42, x, T * 0.42, x);
  }
  sketch(ctx, p, { width: 1.3, alpha: 0.7 });
  ctx.restore();

  // back half: barrel with print that slides while it unscrews, clip, clicker
  ctx.save();
  ctx.translate(back, 0);
  ctx.rotate(wobble);
  p = new Path2D();
  wrect(p, P * 0.9, -T * 0.32, P * 0.1, T * 0.64, T * 0.2, 4);
  sketch(ctx, p, { fill: theme.fill2 });
  p = new Path2D();
  wrect(p, P * 0.45, -T * 0.5, P * 0.46, T, T * 0.2, 5);
  sketch(ctx, p, { fill: theme.fill4 });
  const turn = s.phase === 'twisting' ? s.timer / TWIST_TIME : s.phase === 'closed' ? 0 : 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(P * 0.45, -T * 0.5, P * 0.46, T);
  ctx.clip();
  p = new Path2D();
  for (let k = 0; k < 4; k++) {
    const yy = -T * 0.5 + ((k / 4 + turn * 1.5) % 1) * T;
    p.moveTo(P * 0.5, yy);
    p.lineTo(P * 0.56, yy + T * 0.2);
  }
  sketch(ctx, p, { width: 1.4, alpha: 0.6 });
  ctx.restore();
  p = new Path2D();
  wpoly(p, [P * 0.62, -T * 0.5, P * 0.64, -T * 0.85, P * 0.88, -T * 0.85, P * 0.88, -T * 0.64, P * 0.66, -T * 0.64, P * 0.65, -T * 0.5], false, 6);
  sketch(ctx, p, { fill: theme.metal, width: 1.8 });
  ctx.restore();

  ctx.restore();
}

/** Point and unit tangent at arc length s along the polyline through the nodes. */
function pointAt(nodes, lens, s) {
  let i = 0;
  while (i < N - 2 && lens[i + 1] < s) i++;
  const a = nodes[i], b = nodes[i + 1];
  const l = lens[i + 1] - lens[i] || 1e-6;
  const t = clamp((s - lens[i]) / l, 0, 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: (b.x - a.x) / l, ty: (b.y - a.y) / l };
}

function drawSpring(ctx, nodes) {
  const lens = [0];
  for (let i = 1; i < N; i++) lens.push(lens[i - 1] + Math.hypot(nodes[i].x - nodes[i - 1].x, nodes[i].y - nodes[i - 1].y));
  const total = lens[N - 1];
  const r = g.D / 2, samples = TURNS * 14;
  const back = new Path2D(), front = new Path2D();
  let prev = null;
  for (let k = 0; k <= samples; k++) {
    const s = (total * k) / samples;
    const th = (2 * Math.PI * TURNS * k) / samples;
    const q = pointAt(nodes, lens, s);
    const along = Math.sin(th) * r * 0.45;
    const x = q.x + q.tx * along - q.ty * Math.cos(th) * r;
    const y = q.y + q.ty * along + q.tx * Math.cos(th) * r;
    if (prev) {
      const path = Math.sin(th) >= 0 ? front : back;
      path.moveTo(prev.x, prev.y);
      path.lineTo(x, y);
    }
    prev = { x, y };
  }
  sketch(ctx, back, { width: 1.5, alpha: 0.45 });
  sketch(ctx, front, { width: 2 });
}
