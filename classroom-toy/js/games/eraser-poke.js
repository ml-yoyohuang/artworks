// 用筆戳橡皮擦: tap the rubber to poke a hole (crumbs fly), hold and drag to carve a
// groove. Grab the paper sleeve and fling the eraser off screen for a fresh one.

import { createStage, startLoop, listen, theme, sketch, wline, wpoly, wrect } from '../main.js';
import { createBus, noiseBurst, tone } from '../audio.js';
import { buzz } from '../haptics.js';

export const help = {
  touch: ['點橡皮擦：戳一個洞', '按住滑動：刻出溝槽', '按住紙套甩出畫面：換一塊新的'],
  mouse: ['點擊橡皮擦：戳一個洞', '按住拖曳：刻出溝槽', '拖住紙套甩出畫面：換一塊新的'],
};

const SLEEVE = 0.4; // share of the length covered by the paper sleeve (left end)
const MAX_HOLES = 8000;
const MAX_CRUMBS = 220;
const SLEEVE_COLORS = ['fill1', 'fill4', 'fill5', 'fill3'];

// Kept between visits. Holes are in eraser-local units: x / W and y / H from the centre.
const state = {
  holes: [], // [u, v, size]
  crumbs: [], // { x, y, vx, vy, r, age } on screen
  x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, placed: false,
  mode: 'rest', // rest | held | flying | arriving
  landed: true, // whether an arriving eraser has already thudded down
  color: 0,
};

let stage, bus, stopLoop, stopListening;
let layer = null, layerDrawn = 0; // offscreen canvas with the holes carved so far
let grab = null;
const pens = new Map(); // pointerId → { x, y, fade } pen tips shown while poking
let lastScrape = 0;
const g = { W: 0, H: 0, cx: 0, cy: 0, r: 0 };

const rubber = () => (theme.dark ? '#d8aaa3' : '#f6cfc8');
const holeRim = () => (theme.dark ? '#b9867f' : '#dba59c');
const holeDeep = () => (theme.dark ? '#9c6f69' : '#c48b82');

function layout(s) {
  g.W = Math.min(s.w * 0.64, 340, s.bottom * 0.55);
  g.H = g.W * 0.44;
  g.cx = s.w / 2;
  g.cy = s.bottom * 0.52;
  g.r = Math.max(4.5, g.W * 0.022);
  if (!state.placed || state.mode === 'rest') {
    state.x = g.cx;
    state.y = g.cy;
    state.placed = true;
  }
  layer = null; // rebuilt at the new size
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
  if (state.mode === 'held') state.mode = 'arriving';
  grab = null;
  pens.clear();
}

// ---------- geometry ----------

/** Screen point → eraser-local px (origin at the centre, unrotated). */
function toLocal(x, y) {
  const dx = x - state.x, dy = y - state.y, c = Math.cos(-state.angle), s = Math.sin(-state.angle);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

function toScreen(lx, ly) {
  const c = Math.cos(state.angle), s = Math.sin(state.angle);
  return { x: state.x + lx * c - ly * s, y: state.y + lx * s + ly * c };
}

const onRubber = (l, pad = 0) => l.x > -g.W / 2 + g.W * SLEEVE && l.x < g.W / 2 + pad && Math.abs(l.y) < g.H / 2 + pad;
const onSleeve = (l, pad = 0) => l.x >= -g.W / 2 - pad && l.x <= -g.W / 2 + g.W * SLEEVE && Math.abs(l.y) < g.H * 0.54 + pad;

// ---------- holes ----------

function ensureLayer() {
  const dpr = stage.dpr;
  if (!layer) {
    layer = document.createElement('canvas');
    layer.width = Math.ceil(g.W * dpr);
    layer.height = Math.ceil(g.H * dpr);
    layerDrawn = 0;
  }
  const ctx = layer.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, g.W / 2 * dpr, g.H / 2 * dpr);
  for (; layerDrawn < state.holes.length; layerDrawn++) {
    const [u, v, k] = state.holes[layerDrawn];
    const x = u * g.W, y = v * g.H, r = g.r * k;
    ctx.fillStyle = holeRim();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = holeDeep();
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }
}

function addHole(l, size) {
  if (state.holes.length >= MAX_HOLES) return false;
  const margin = g.r * size;
  const x = Math.max(-g.W / 2 + g.W * SLEEVE + margin, Math.min(g.W / 2 - margin, l.x));
  const y = Math.max(-g.H / 2 + margin, Math.min(g.H / 2 - margin, l.y));
  state.holes.push([x / g.W, y / g.H, size]);
  return true;
}

function spray(x, y, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
    state.crumbs.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.5 + Math.random() * 2, age: 0 });
  }
  if (state.crumbs.length > MAX_CRUMBS) state.crumbs.splice(0, state.crumbs.length - MAX_CRUMBS);
}

// ---------- input ----------

function down(p) {
  if (state.mode === 'flying' || state.mode === 'arriving') return;
  const l = toLocal(p.x, p.y);
  const pad = p.touch ? 16 : 4;
  if (onRubber(l, pad)) {
    if (addHole(l, 1)) {
      ensureLayer();
      pokeSound();
      buzz(10);
      spray(p.x, p.y, 6 + Math.floor(Math.random() * 4), 90);
    }
    pens.set(p.id, { x: p.x, y: p.y, fade: 1, last: l, held: true, travel: 0 });
  } else if (!grab && onSleeve(l, pad)) {
    grab = { id: p.id, dx: state.x - p.x, dy: state.y - p.y, samples: [{ x: p.x, y: p.y, t: p.t }] };
    state.mode = 'held';
    noiseBurst(bus, { dur: 0.04, freq: 1200, q: 1, gain: 0.1 });
  }
}

function move(p) {
  const pen = pens.get(p.id);
  if (pen?.held) {
    pen.x = p.x; pen.y = p.y;
    const l = toLocal(p.x, p.y);
    const dx = l.x - pen.last.x, dy = l.y - pen.last.y, dist = Math.hypot(dx, dy);
    const step = g.r * 0.5;
    if (dist < step) return;
    const n = Math.min(40, Math.floor(dist / step));
    for (let k = 1; k <= n; k++) addHole({ x: pen.last.x + (dx * k) / n, y: pen.last.y + (dy * k) / n }, 0.85);
    pen.last = l;
    ensureLayer();
    pen.travel += dist;
    if (pen.travel > 14) {
      pen.travel = 0;
      spray(p.x, p.y, 1 + Math.floor(Math.random() * 2), 50);
    }
    if (p.t - lastScrape > 0.04) {
      lastScrape = p.t;
      noiseBurst(bus, { dur: 0.045, freq: 650 + Math.random() * 350, q: 2, gain: Math.min(0.22, 0.06 + dist / 120) });
      if (Math.random() < 0.3) buzz(3);
    }
    return;
  }
  if (grab && grab.id === p.id) {
    const nx = p.x + grab.dx, ny = p.y + grab.dy;
    state.angle += ((nx - state.x) * 0.004 - state.angle * 0.08);
    state.x = nx; state.y = ny;
    grab.samples.push({ x: p.x, y: p.y, t: p.t });
    while (grab.samples.length > 2 && p.t - grab.samples[0].t > 0.08) grab.samples.shift();
  }
}

function up(p) {
  const pen = pens.get(p.id);
  if (pen) pen.held = false;
  if (!grab || grab.id !== p.id) return;
  const a = grab.samples[0], b = grab.samples[grab.samples.length - 1];
  const dt = Math.max(b.t - a.t, 1 / 120);
  const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt, speed = Math.hypot(vx, vy);
  const off = state.x < 0 || state.x > stage.w || state.y < 0 || state.y > stage.bottom;
  grab = null;
  if (speed > 700 || off) {
    state.mode = 'flying';
    state.vx = speed > 200 ? vx : (state.x - g.cx) * 4;
    state.vy = speed > 200 ? vy : (state.y - g.cy) * 4;
    state.spin = vx * 0.004;
    noiseBurst(bus, { dur: 0.25, attack: 0.05, freq: 500, q: 0.8, gain: Math.min(0.3, speed / 6000 + 0.08) });
    buzz(15);
  } else {
    state.mode = 'arriving';
    state.landed = true;
  }
}

// ---------- sound ----------

function pokeSound() {
  tone(bus, { f0: 210 + Math.random() * 40, f1: 90, dur: 0.07, gain: 0.4 });
  noiseBurst(bus, { dur: 0.05, type: 'lowpass', freq: 700, gain: 0.25 });
}

// ---------- loop ----------

function frame(dt) {
  const s = state;
  if (s.mode === 'flying') {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.angle += s.spin * dt;
    const m = g.W;
    if (s.x < -m || s.x > stage.w + m || s.y < -m || s.y > stage.h + m) {
      // a fresh eraser slides in from the top
      s.holes = [];
      layer = null;
      s.color = (s.color + 1) % SLEEVE_COLORS.length;
      s.x = g.cx;
      s.y = -g.H * 1.5;
      s.vx = s.vy = 0;
      s.angle = -0.3;
      s.mode = 'arriving';
      s.landed = false;
    }
  } else if (s.mode === 'arriving') {
    // spring back to the middle of the desk
    s.vx += (140 * (g.cx - s.x) - 15 * s.vx) * dt;
    s.vy += (140 * (g.cy - s.y) - 15 * s.vy) * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.angle += (0 - s.angle) * Math.min(1, dt * 8);
    if (!s.landed && s.y > g.cy - 4 && s.vy > 0) {
      s.landed = true;
      tone(bus, { f0: 150, f1: 80, dur: 0.1, gain: 0.3 });
      noiseBurst(bus, { dur: 0.06, type: 'lowpass', freq: 600, gain: 0.2 });
      buzz(8);
    }
    if (Math.hypot(g.cx - s.x, g.cy - s.y) < 0.5 && Math.hypot(s.vx, s.vy) < 5) {
      s.mode = 'rest';
      s.landed = true;
    }
  }
  for (const c of s.crumbs) {
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.vx *= Math.exp(-dt * 7);
    c.vy *= Math.exp(-dt * 7);
    c.age += dt;
  }
  s.crumbs = s.crumbs.filter((c) => c.age < 6);
  for (const [id, pen] of pens) {
    if (!pen.held) {
      pen.fade -= dt / 0.15;
      if (pen.fade <= 0) pens.delete(id);
    }
  }
  draw();
}

// ---------- drawing ----------

function draw() {
  stage.clear();
  const ctx = stage.ctx, s = state;
  if (!layer || layerDrawn < s.holes.length) ensureLayer();

  for (const c of s.crumbs) {
    ctx.globalAlpha = Math.min(1, (6 - c.age) / 1.5);
    ctx.fillStyle = holeRim();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  const { W, H } = g;
  // shadow
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.roundRect(-W / 2 + 4, -H / 2 + 6, W, H, H * 0.18);
  ctx.fill();
  ctx.restore();
  // rubber, carved
  const body = new Path2D();
  wrect(body, -W / 2, -H / 2, W, H, H * 0.18, 1);
  sketch(ctx, body, { fill: rubber(), stroke: null });
  ctx.save();
  ctx.clip(body);
  ctx.drawImage(layer, -W / 2, -H / 2, W, H);
  ctx.restore();
  sketch(ctx, body, { width: 2 });
  // paper sleeve wrapped round the left end
  const sw = W * SLEEVE;
  const sleeve = new Path2D();
  wrect(sleeve, -W / 2 - 2, -H * 0.54, sw + 2, H * 1.08, 3, 2);
  sketch(ctx, sleeve, { fill: theme[SLEEVE_COLORS[s.color]] });
  const print = new Path2D();
  wpoly(print, [-W / 2 + sw * 0.18, -H * 0.18, -W / 2 + sw * 0.5, -H * 0.3, -W / 2 + sw * 0.82, -H * 0.18], false, 3);
  print.moveTo(-W / 2 + sw * 0.18, H * 0.12);
  wline(print, -W / 2 + sw * 0.18, H * 0.12, -W / 2 + sw * 0.82, H * 0.12, 4);
  print.moveTo(-W / 2 + sw * 0.18, H * 0.26);
  wline(print, -W / 2 + sw * 0.18, H * 0.26, -W / 2 + sw * 0.6, H * 0.26, 5);
  sketch(ctx, print, { width: 1.5, alpha: 0.7 });
  ctx.restore();

  for (const pen of pens.values()) drawPen(ctx, pen);
}

/** A ballpoint coming in from the lower right with its tip on the point. */
function drawPen(ctx, pen) {
  const T = Math.max(10, g.W * 0.045), L = g.W * 0.9;
  ctx.save();
  ctx.globalAlpha = Math.max(0, pen.fade);
  ctx.translate(pen.x, pen.y);
  ctx.rotate(-Math.PI * 0.72);
  const p = new Path2D();
  wpoly(p, [0, 0, -T * 2, -T * 0.5, -T * 2, T * 0.5], true, 11);
  sketch(ctx, p, { fill: theme.metal, width: 1.6 });
  const barrel = new Path2D();
  wrect(barrel, -L, -T * 0.5, L - T * 2, T, T * 0.35, 12);
  sketch(ctx, barrel, { fill: theme.fill1 });
  ctx.restore();
}
