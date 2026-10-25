// 紙團投籃: rub the sheet until it crumples into a ball, then fling the ball at the bin
// across the room. Balls that miss stay on the floor (30 at most).

import { createStage, startLoop, listen, theme, sketch, hash } from '../main.js';
import { createBus, noiseBurst, tone } from '../audio.js';
import { buzz } from '../haptics.js';

export const help = {
  touch: ['在紙上按住搓揉：揉成紙團', '按住紙團往垃圾桶甩出去'],
  mouse: ['在紙上按住來回拖曳：揉成紙團', '拖住紙團往垃圾桶甩出去'],
};

const COLS = 8, ROWS = 10; // sheet mesh cells
const MAX_FLOOR = 30;
const COLLAPSE_TIME = 0.32;

const newSheet = () => ({
  crumple: 0,
  offsets: Array.from({ length: (COLS + 1) * (ROWS + 1) }, () => ({ x: 0, y: 0 })),
});

// Kept between visits. World units: x across, d into the room, h height; px at d = 0.
const state = {
  phase: 'sheet', // sheet | collapsing | ball | flying | next
  sheet: newSheet(),
  timer: 0,
  ball: null, // { x, d, h, vx, vd, vh, spin, a, seed, sinking }
  floor: [], // missed balls
  seed: 1,
  enterY: 0, // slide-in offset for a new sheet, px
};

let stage, bus, stopLoop, stopListening;
let grab = null; // pointer holding the sheet or the ball
let lastRustle = 0;
const g = { cx: 0, sy: 0, W: 0, H: 0, horizon: 0, ground: 0, D0: 0, binD: 0, binR: 0, binH: 0, rb: 0, gravity: 0 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const scaleAt = (d) => g.D0 / (g.D0 + d);

/** World → screen. */
function project(x, d, h) {
  const s = scaleAt(d);
  return { x: g.cx + x * s, y: g.horizon + (g.ground - g.horizon) * s - h * s, s };
}

function layout(st) {
  const area = st.bottom;
  g.cx = st.w / 2;
  g.W = Math.min(st.w * 0.62, area * 0.42, 340);
  g.H = g.W * 1.3;
  g.sy = area * 0.66; // sheet centre
  g.horizon = area * 0.1;
  g.ground = area * 0.86;
  g.D0 = area * 0.6;
  g.binD = g.D0 * 1.5;
  g.binR = Math.max(70, area * 0.14);
  g.binH = area * 0.17;
  g.rb = g.W * 0.15;
  g.gravity = area * 2.6;
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
  if (grab?.kind === 'ball') restBall();
  grab = null;
}

// ---------- sheet ----------

function nodePos(i, j) {
  const s = state.sheet;
  const shrink = 1 - 0.45 * s.crumple;
  const o = s.offsets[j * (COLS + 1) + i];
  return {
    x: g.cx + (i / COLS - 0.5) * g.W * shrink + o.x,
    y: g.sy + state.enterY + (j / ROWS - 0.5) * g.H * shrink + o.y,
  };
}

function onSheet(p) {
  const shrink = 1 - 0.45 * state.sheet.crumple;
  const pad = p.touch ? 24 : 6;
  return Math.abs(p.x - g.cx) < (g.W * shrink) / 2 + pad && Math.abs(p.y - g.sy - state.enterY) < (g.H * shrink) / 2 + pad;
}

function rub(p, dist) {
  const s = state.sheet;
  const R = g.W * 0.3, limit = g.W * 0.14;
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      const q = nodePos(i, j);
      const dx = p.x - q.x, dy = p.y - q.y, r = Math.hypot(dx, dy);
      if (r > R) continue;
      const fall = 1 - r / R;
      const o = s.offsets[j * (COLS + 1) + i];
      o.x = clamp(o.x + ((Math.random() - 0.5) * 0.9 * dist + dx * 0.02) * fall, -limit, limit);
      o.y = clamp(o.y + ((Math.random() - 0.5) * 0.9 * dist + dy * 0.02) * fall, -limit, limit);
    }
  }
  s.crumple = Math.min(1, s.crumple + dist / (g.W * 22)); // about three seconds of rubbing
  if (s.crumple >= 1) {
    state.phase = 'collapsing';
    state.timer = 0;
    grab = null;
    noiseBurst(bus, { dur: 0.25, type: 'highpass', freq: 1800, gain: 0.35, attack: 0.02 });
    tone(bus, { f0: 220, f1: 120, dur: 0.08, gain: 0.2, at: 0.2 });
    buzz(20);
  }
}

function rustle(speed, now) {
  if (now - lastRustle < 0.035) return;
  lastRustle = now;
  const gain = Math.min(0.32, 0.05 + speed / 3500);
  noiseBurst(bus, { dur: 0.025 + Math.random() * 0.04, type: 'highpass', freq: 2200 + Math.random() * 3000, gain });
  if (Math.random() < 0.25) buzz(4);
}

// ---------- ball ----------

function restBall() {
  const b = state.ball;
  Object.assign(b, { x: 0, d: 0, h: g.ground - g.sy, vx: 0, vd: 0, vh: 0 });
}

function onBall(p) {
  const b = state.ball;
  const q = project(b.x, b.d, b.h);
  return Math.hypot(p.x - q.x, p.y - q.y) < g.rb * q.s + (p.touch ? 34 : 10);
}

function fling() {
  const b = state.ball;
  const samples = grab.samples;
  const first = samples[0], last = samples[samples.length - 1];
  const dt = Math.max(last.t - first.t, 1 / 120);
  const vx = (last.x - first.x) / dt, vy = (last.y - first.y) / dt;
  if (vy > -250) {
    // not really a throw: the ball drops back into the hand
    restBall();
    return;
  }
  const v = Math.min(-vy, stage.bottom * 4);
  b.vx = clamp(vx * 0.4, -v, v);
  b.vd = v * 0.75 + stage.bottom * 0.25;
  b.vh = stage.bottom * 0.75 + v * 0.1; // a steady arc, so distance follows speed
  b.spin = (Math.random() - 0.5) * 12 + vx * 0.01;
  state.phase = 'flying';
  noiseBurst(bus, { dur: 0.18, freq: 700, q: 0.8, gain: Math.min(0.3, v / 6000), attack: 0.03 });
}

function updateBall(dt, b) {
  b.vh -= g.gravity * dt;
  b.x += b.vx * dt;
  b.d += b.vd * dt;
  const prevH = b.h;
  b.h += b.vh * dt;
  b.a += b.spin * dt;

  // the bin: a cylinder at (0, binD) whose open top is at binH
  const dx = b.x, dd = b.d - g.binD, r = Math.hypot(dx, dd) || 1e-6;
  const rb = g.rb;
  if (!b.sinking && prevH >= g.binH && b.h < g.binH && b.vh < 0) {
    if (r < g.binR) {
      b.sinking = true;
      b.vx *= 0.2; b.vd *= 0.2;
      return 'in';
    }
    if (r < g.binR + rb * 0.5) {
      // clipped the rim
      const nx = dx / r, nd = dd / r, dot = b.vx * nx + b.vd * nd;
      if (dot < 0 === r > g.binR) { b.vx -= 1.6 * dot * nx; b.vd -= 1.6 * dot * nd; }
      b.vh = Math.abs(b.vh) * 0.35;
      b.h = g.binH;
      rimSound();
    }
  }
  if (!b.sinking && b.h < g.binH && r < g.binR + rb && r > g.binR * 0.5) {
    // bounced off the side
    const nx = dx / r, nd = dd / r, dot = b.vx * nx + b.vd * nd;
    if (dot < 0) { b.vx -= 1.4 * dot * nx; b.vd -= 1.4 * dot * nd; rimSound(); }
    b.x = nx * (g.binR + rb); b.d = g.binD + nd * (g.binR + rb);
  }
  if (b.sinking) {
    b.x *= 1 - dt * 6; b.d += (g.binD - b.d) * dt * 6;
    if (b.h < g.binH * 0.2) return 'gone';
    return null;
  }
  if (b.h <= 0) {
    b.h = 0;
    if (b.vh < -120) {
      noiseBurst(bus, { dur: 0.05, type: 'lowpass', freq: 700, gain: Math.min(0.4, -b.vh / 2500) });
      b.vh = -b.vh * 0.3;
      b.vx *= 0.4; b.vd *= 0.4; // paper barely rolls
    } else {
      b.vh = 0;
    }
    b.vx *= Math.exp(-dt * 8); b.vd *= Math.exp(-dt * 8); b.spin *= Math.exp(-dt * 8);
    if (b.vh === 0 && Math.hypot(b.vx, b.vd) < 8) return 'floor';
  }
  if (b.d < 0) { b.d = 0; b.vd = Math.abs(b.vd) * 0.3; }
  return null;
}

function rimSound() {
  tone(bus, { type: 'triangle', f0: 640, f1: 520, dur: 0.08, gain: 0.25 });
  noiseBurst(bus, { dur: 0.03, freq: 1500, q: 1, gain: 0.2 });
}

function inSound() {
  noiseBurst(bus, { dur: 0.15, freq: 1200, q: 0.7, gain: 0.25 });
  tone(bus, { f0: 170, f1: 90, dur: 0.14, gain: 0.4, at: 0.03 });
  tone(bus, { type: 'triangle', f0: 330, f1: 300, dur: 0.25, gain: 0.08, at: 0.03 });
  buzz([25, 30, 15]);
}

// ---------- input ----------

function down(p) {
  if (grab) return;
  if (state.phase === 'sheet' && onSheet(p)) {
    grab = { kind: 'sheet', id: p.id, x: p.x, y: p.y, t: p.t };
  } else if (state.phase === 'ball' && onBall(p)) {
    grab = { kind: 'ball', id: p.id, samples: [{ x: p.x, y: p.y, t: p.t }] };
  }
}

function move(p) {
  if (!grab || grab.id !== p.id) return;
  if (grab.kind === 'sheet') {
    const dist = Math.hypot(p.x - grab.x, p.y - grab.y);
    const speed = dist / Math.max(p.t - grab.t, 1 / 240);
    grab.x = p.x; grab.y = p.y; grab.t = p.t;
    if (dist > 0.5) {
      rub(p, dist);
      rustle(speed, p.t);
    }
  } else {
    const b = state.ball;
    b.x = (p.x - g.cx);
    b.h = Math.max(0, g.ground - p.y);
    grab.samples.push({ x: p.x, y: p.y, t: p.t });
    while (grab.samples.length > 2 && p.t - grab.samples[0].t > 0.08) grab.samples.shift();
  }
}

function up(p) {
  if (!grab || grab.id !== p.id) return;
  if (grab.kind === 'ball') {
    grab.samples.push({ x: p.x, y: p.y, t: p.t });
    fling();
  }
  grab = null;
}

// ---------- loop ----------

function frame(dt) {
  const s = state;
  s.timer += dt;
  if (s.phase === 'collapsing' && s.timer >= COLLAPSE_TIME) {
    s.phase = 'ball';
    s.ball = { x: 0, d: 0, h: g.ground - g.sy, vx: 0, vd: 0, vh: 0, spin: 0, a: 0, seed: s.seed++, sinking: false };
  }
  if (s.phase === 'flying') {
    const result = updateBall(dt, s.ball);
    if (result === 'in') inSound();
    if (result === 'gone' || result === 'floor') {
      if (result === 'floor') {
        s.floor.push(s.ball);
        if (s.floor.length > MAX_FLOOR) s.floor.shift();
      }
      s.ball = null;
      s.phase = 'next';
      s.timer = 0;
    }
  }
  if (s.phase === 'next' && s.timer > 0.5) {
    s.phase = 'sheet';
    s.sheet = newSheet();
    s.enterY = stage.bottom * 0.5;
    noiseBurst(bus, { dur: 0.2, freq: 3000, q: 0.6, gain: 0.08, attack: 0.08 });
  }
  s.enterY *= Math.exp(-dt * 10);
  draw();
}

// ---------- drawing ----------

const sheetColor = () => (theme.dark ? '#dedbcd' : '#fffef8');

function draw() {
  stage.clear();
  const ctx = stage.ctx;
  const s = state;
  drawFloorLine(ctx);
  // far to near: balls beyond the bin, the bin, then everything in front
  const items = [...s.floor];
  if (s.phase === 'flying' && s.ball) items.push(s.ball);
  items.sort((a, b) => b.d - a.d);
  const behind = items.filter((b) => b.d > g.binD), front = items.filter((b) => b.d <= g.binD && !b.sinking);
  for (const b of behind) drawBall(ctx, b);
  drawBin(ctx, s.ball?.sinking ? s.ball : null);
  for (const b of front) drawBall(ctx, b);

  if (s.phase === 'sheet') drawSheet(ctx, 0);
  else if (s.phase === 'collapsing') drawSheet(ctx, Math.min(1, s.timer / COLLAPSE_TIME));
  else if (s.phase === 'ball') drawBall(ctx, s.ball);
}

function drawFloorLine(ctx) {
  // the back wall meets the floor where the bin stands
  const y = project(0, g.binD, 0).y;
  const p = new Path2D();
  p.moveTo(-10, y + g.binR * scaleAt(g.binD) * 0.9);
  p.lineTo(stage.w + 10, y + g.binR * scaleAt(g.binD) * 0.9);
  sketch(ctx, p, { width: 1.4, alpha: 0.45 });
}

function drawBin(ctx, sinking) {
  const top = project(0, g.binD, g.binH), base = project(0, g.binD, 0);
  const rTop = g.binR * top.s, rBase = g.binR * 0.78 * base.s, ry = rTop * 0.32;
  // back of the rim
  let p = new Path2D();
  p.ellipse(top.x, top.y, rTop, ry, 0, Math.PI, Math.PI * 2);
  sketch(ctx, p, { width: 1.8 });
  if (sinking) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(top.x - rTop * 2, 0, rTop * 4, top.y + ry * 0.2);
    ctx.ellipse(top.x, top.y, rTop, ry, 0, 0, Math.PI);
    ctx.clip();
    drawBall(ctx, sinking);
    ctx.restore();
  }
  // body
  p = new Path2D();
  p.moveTo(top.x - rTop, top.y);
  p.lineTo(base.x - rBase, base.y);
  p.ellipse(base.x, base.y, rBase, rBase * 0.32, 0, Math.PI, 0, true);
  p.lineTo(top.x + rTop, top.y);
  p.ellipse(top.x, top.y, rTop, ry, 0, 0, Math.PI);
  sketch(ctx, p, { fill: theme.fill1, width: 1.9 });
  // slats
  p = new Path2D();
  for (let k = 1; k < 5; k++) {
    const t = k / 5;
    const xt = top.x - rTop + 2 * rTop * t, xb = base.x - rBase + 2 * rBase * t;
    const yt = top.y + Math.sin(Math.PI * t) * ry, yb = base.y + Math.sin(Math.PI * t) * rBase * 0.32;
    p.moveTo(xt, yt);
    p.lineTo(xb, yb);
  }
  sketch(ctx, p, { width: 1.2, alpha: 0.5 });
}

function drawBall(ctx, b) {
  const q = project(b.x, b.d, b.h);
  const r = g.rb * q.s;
  // shadow on the floor
  if (b.h > 1 || b.d > 0) {
    const f = project(b.x, b.d, 0);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y + r * 0.9, r * 0.9, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(b.a);
  const outline = new Path2D();
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * Math.PI * 2, rr = r * (0.88 + hash(b.seed * 31 + k) * 0.2);
    k ? outline.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : outline.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  outline.closePath();
  sketch(ctx, outline, { fill: sheetColor(), width: Math.max(1.2, 1.9 * q.s) });
  const creases = new Path2D();
  for (let k = 0; k < 5; k++) {
    let a = hash(b.seed * 7 + k) * Math.PI * 2, rr = hash(b.seed * 13 + k) * r * 0.6;
    creases.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    for (let m = 0; m < 3; m++) {
      a += (hash(b.seed + k * 5 + m) - 0.5) * 2.4;
      rr = Math.min(r * 0.8, rr + r * 0.25);
      creases.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  }
  sketch(ctx, creases, { width: Math.max(0.8, 1.2 * q.s), alpha: 0.55 });
  ctx.restore();
}

/** The sheet as a mesh of shaded quads; `collapse` 0..1 pulls it into a ball. */
function drawSheet(ctx, collapse) {
  const s = state.sheet;
  const pts = [];
  const bx = g.cx, by = g.sy + state.enterY, br = g.rb;
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      const q = nodePos(i, j);
      if (collapse > 0) {
        const a = Math.atan2(j / ROWS - 0.5, i / COLS - 0.5) + hash(i * 17 + j) * 0.6;
        const rr = br * (0.4 + 0.6 * Math.max(Math.abs(i / COLS - 0.5), Math.abs(j / ROWS - 0.5)) * 2);
        const e = 1 - Math.pow(1 - collapse, 3);
        q.x += (bx + Math.cos(a) * rr - q.x) * e;
        q.y += (by + Math.sin(a) * rr - q.y) * e;
      }
      pts.push(q);
    }
  }
  const at = (i, j) => pts[j * (COLS + 1) + i];
  const shrink = 1 - 0.45 * s.crumple;
  const restArea = (g.W / COLS) * (g.H / ROWS) * shrink * shrink;
  ctx.save();
  ctx.lineJoin = 'round';
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const area = Math.abs((c.x - a.x) * (d.y - b.y) - (d.x - b.x) * (c.y - a.y)) / 2;
      const squash = clamp(1 - area / restArea, -0.5, 1);
      const shade = clamp(squash * 0.35 + (hash(i * 9 + j * 31) - 0.5) * 0.2 * s.crumple, 0, 0.45);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
      ctx.fillStyle = sheetColor();
      ctx.fill();
      ctx.strokeStyle = sheetColor();
      ctx.lineWidth = 0.8;
      ctx.stroke(); // hides seams between quads
      if (shade > 0.01) {
        ctx.globalAlpha = shade;
        ctx.fillStyle = '#5a5648';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  // ruled lines and margin, bending with the paper
  ctx.globalAlpha = 1 - collapse;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#9fbfe0';
  ctx.beginPath();
  for (let j = 1; j < ROWS; j++) {
    ctx.moveTo(at(0, j).x, at(0, j).y);
    for (let i = 1; i <= COLS; i++) ctx.lineTo(at(i, j).x, at(i, j).y);
  }
  ctx.stroke();
  ctx.strokeStyle = '#e39191';
  ctx.beginPath();
  ctx.moveTo(at(1, 0).x, at(1, 0).y);
  for (let j = 1; j <= ROWS; j++) ctx.lineTo(at(1, j).x, at(1, j).y);
  ctx.stroke();
  ctx.restore();
  // outline
  const edge = new Path2D();
  const ring = [];
  for (let i = 0; i <= COLS; i++) ring.push(at(i, 0));
  for (let j = 1; j <= ROWS; j++) ring.push(at(COLS, j));
  for (let i = COLS - 1; i >= 0; i--) ring.push(at(i, ROWS));
  for (let j = ROWS - 1; j > 0; j--) ring.push(at(0, j));
  ring.forEach((q, k) => (k ? edge.lineTo(q.x, q.y) : edge.moveTo(q.x, q.y)));
  edge.closePath();
  sketch(ctx, edge, { width: 1.8 });
}
