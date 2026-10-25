// 按壓自動筆: tap the end button to click out lead; after 6–12 clicks the lead snaps,
// and the broken piece falls, bounces on the desk and slides away.

import { createStage, startLoop, listen, theme, sketch, wline, wpoly, wrect, deskPath } from '../main.js';
import { createBus, noiseBurst, tone } from '../audio.js';
import { buzz } from '../haptics.js';

export const help = {
  touch: ['點筆尾：喀一下出筆芯'],
  mouse: ['點擊筆尾：喀一下出筆芯'],
};

// Lengths along the pencil are fractions of its length L.
const STUB = 0.008;
const STEP = 0.016;

const newThreshold = () => 6 + Math.floor(Math.random() * 7);

// Kept between visits.
const state = {
  clicks: 0,
  threshold: newThreshold(),
  lead: STUB, // target lead length
  leadShown: STUB,
  press: 0, pressV: 0, // button travel, spring
  kick: 0, kickV: 0, // whole-pencil jolt, spring
  breakIn: -1, // seconds until the pending snap
  pieces: [],
};

let stage, bus, stopLoop, stopListening;
const held = new Set();
const g = { L: 0, T: 0, x: 0, y: 0, desk: 0, gravity: 0 };

function layout(s) {
  const area = s.bottom;
  g.L = Math.min(s.w * (s.w < 600 ? 0.76 : 0.7), 540, area * 1.1);
  g.T = Math.max(16, Math.min(30, g.L * 0.058));
  g.x = (s.w - g.L) / 2 + g.L * 0.1; // the tip of the sleeve
  g.y = area * 0.44;
  g.desk = area * 0.72;
  g.gravity = area * 2.6;
}

export function mount(container) {
  stage = createStage(container, layout);
  bus = createBus();
  stopListening = listen(stage.canvas, { down, up });
  stopLoop = startLoop(frame);
}

export function unmount() {
  stopLoop();
  stopListening();
  bus.stop();
  stage.destroy();
  held.clear();
}

// ---------- input ----------

function onButton(p) {
  const pad = p.touch ? 30 : 10;
  const lx = p.x - g.x, ly = p.y - g.y;
  return lx > g.L * 0.58 - pad && lx < g.L + pad && Math.abs(ly) < g.T * 0.9 + pad;
}

function down(p) {
  if (!onButton(p)) return;
  if (held.size === 0) click();
  held.add(p.id);
}

function up(p) {
  if (held.delete(p.id) && held.size === 0) releaseSound();
}

function click() {
  state.pressV += 14;
  state.kickV -= 120;
  state.clicks++;
  state.lead += STEP;
  clickSound();
  buzz(10);
  if (state.clicks >= state.threshold && state.breakIn < 0) state.breakIn = 0.12;
}

function snap() {
  const len = (state.leadShown - STUB) * g.L;
  state.pieces.push({
    x: g.x - STUB * g.L - len / 2, y: g.y,
    vx: -(30 + Math.random() * 40), vy: -(60 + Math.random() * 90),
    a: 0, va: (Math.random() - 0.5) * 14, len, resting: false,
  });
  state.lead = state.leadShown = STUB;
  state.clicks = 0;
  state.threshold = newThreshold();
  state.kickV += 60;
  snapSound();
  buzz([14, 40, 22]);
}

// ---------- sound ----------

function clickSound() {
  const r = Math.random();
  noiseBurst(bus, { dur: 0.03, freq: 3000 + r * 500, q: 3, gain: 0.6 });
  tone(bus, { type: 'triangle', f0: 2200 + r * 200, f1: 900, dur: 0.03, gain: 0.3 });
}

function releaseSound() {
  noiseBurst(bus, { dur: 0.02, freq: 4400, q: 4, gain: 0.25 });
}

function snapSound() {
  noiseBurst(bus, { dur: 0.05, type: 'highpass', freq: 2000, gain: 0.8 });
  tone(bus, { type: 'square', f0: 3600, f1: 1500, dur: 0.02, gain: 0.1 });
  tone(bus, { type: 'sine', f0: 500, f1: 180, dur: 0.06, gain: 0.25 });
}

function tapSound(speed) {
  const gain = Math.min(0.35, speed / 1800);
  noiseBurst(bus, { dur: 0.012, freq: 5200, q: 5, gain });
  tone(bus, { f0: 2700 + Math.random() * 300, dur: 0.025, gain: gain * 0.5 });
}

// ---------- simulation ----------

function frame(dt) {
  const s = state;
  const target = held.size > 0 ? 1 : 0;
  s.pressV += (1200 * (target - s.press) - 24 * s.pressV) * dt;
  s.press += s.pressV * dt;
  s.kickV += (700 * -s.kick - 12 * s.kickV) * dt;
  s.kick += s.kickV * dt;
  s.leadShown += (s.lead - s.leadShown) * (1 - Math.exp(-dt * 28));
  if (s.breakIn >= 0) {
    s.breakIn -= dt;
    if (s.breakIn < 0) snap();
  }
  updatePieces(dt);
  draw();
}

function updatePieces(dt) {
  const thick = leadThickness();
  for (const p of state.pieces) {
    p.vy += g.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.a += p.va * dt;
    const low = p.y + Math.abs(Math.sin(p.a)) * p.len / 2 + thick / 2;
    if (low > g.desk) {
      p.y -= low - g.desk;
      if (p.vy > 0) {
        const impact = p.vy;
        p.vy = impact > 60 ? -impact * 0.38 : 0;
        p.va = p.va * 0.5 + (Math.random() - 0.5) * impact * 0.02;
        p.vx *= 0.85;
        if (impact > 60) tapSound(impact);
      }
      if (p.vy === 0) {
        // lying on the desk: settle flat and keep sliding out
        const flat = Math.round(p.a / Math.PI) * Math.PI;
        p.a += (flat - p.a) * Math.min(1, dt * 12);
        p.va *= 0.8;
        p.vx = Math.min(p.vx * (1 - dt * 0.8), -45);
      }
    }
  }
  state.pieces = state.pieces.filter((p) => p.x + p.len > -40 && p.x - p.len < stage.w + 40);
}

// ---------- drawing ----------

const leadThickness = () => Math.max(2, g.T * 0.1);

function draw() {
  stage.clear();
  const ctx = stage.ctx;
  drawDesk(ctx);

  ctx.save();
  ctx.translate(g.x + state.kick * 0.05, g.y);
  ctx.rotate(state.kick * 0.0006);
  drawPencil(ctx);
  ctx.restore();

  ctx.lineCap = 'round';
  ctx.strokeStyle = theme.lead;
  ctx.lineWidth = leadThickness();
  for (const p of state.pieces) {
    const dx = Math.cos(p.a) * p.len / 2, dy = Math.sin(p.a) * p.len / 2;
    ctx.beginPath();
    ctx.moveTo(p.x - dx, p.y - dy);
    ctx.lineTo(p.x + dx, p.y + dy);
    ctx.stroke();
  }
}

function drawDesk(ctx) {
  sketch(ctx, deskPath(-10, stage.w + 10, g.desk), { width: 1.6, alpha: 0.7 });
}

function drawPencil(ctx) {
  const { L, T } = g;
  const s = state;

  // lead
  ctx.lineCap = 'round';
  ctx.strokeStyle = theme.lead;
  ctx.lineWidth = leadThickness();
  ctx.beginPath();
  ctx.moveTo(-s.leadShown * L, 0);
  ctx.lineTo(2, 0);
  ctx.stroke();

  // sleeve and cone
  let p = new Path2D();
  wrect(p, 0, -T * 0.09, L * 0.05, T * 0.18, 0, 1);
  sketch(ctx, p, { fill: theme.metal, width: 1.6 });
  p = new Path2D();
  wpoly(p, [L * 0.05, -T * 0.16, L * 0.15, -T * 0.5, L * 0.15, T * 0.5, L * 0.05, T * 0.16], true, 2);
  sketch(ctx, p, { fill: theme.metal });

  // end button, sliding into the barrel when pressed
  const push = Math.max(-0.2, s.press) * L * 0.035;
  p = new Path2D();
  wrect(p, L * 0.88 - push, -T * 0.36, L * 0.12, T * 0.72, T * 0.18, 3);
  for (let k = 1; k <= 2; k++) {
    const x = L * (0.93 + k * 0.018) - push;
    p.moveTo(x, -T * 0.36);
    p.lineTo(x, T * 0.36);
  }
  sketch(ctx, p, { fill: theme.metal });

  // barrel with a soft highlight
  p = new Path2D();
  wrect(p, L * 0.38, -T * 0.5, L * 0.5, T, T * 0.12, 4);
  sketch(ctx, p, { fill: theme.fill1 });
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, T * 0.12);
  ctx.beginPath();
  ctx.moveTo(L * 0.42, -T * 0.24);
  ctx.lineTo(L * 0.6, -T * 0.24);
  ctx.stroke();
  ctx.restore();

  // ring between barrel and button
  p = new Path2D();
  wrect(p, L * 0.865, -T * 0.44, L * 0.035, T * 0.88, 2, 5);
  sketch(ctx, p, { fill: theme.metal, width: 1.6 });

  // grip with rings
  p = new Path2D();
  wrect(p, L * 0.15, -T * 0.55, L * 0.25, T * 1.1, T * 0.25, 6);
  for (let x = L * 0.19; x < L * 0.38; x += T * 0.42) {
    p.moveTo(x, -T * 0.5);
    wline(p, x, -T * 0.5, x, T * 0.5, x);
  }
  sketch(ctx, p, { fill: theme.fill2 });

  // clip
  p = new Path2D();
  wpoly(p, [L * 0.62, -T * 0.5, L * 0.64, -T * 0.82, L * 0.85, -T * 0.82, L * 0.85, -T * 0.62, L * 0.66, -T * 0.62, L * 0.65, -T * 0.5], false, 7);
  sketch(ctx, p, { fill: theme.metal, width: 1.8 });
}
