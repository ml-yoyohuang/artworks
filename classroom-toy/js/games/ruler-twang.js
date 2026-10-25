// 彈尺: a ruler pinned to the desk edge under a book. Slide it to change the overhang,
// pull the free end and let go: y = A·e^(−kt)·cos(ωt), with ω ∝ 1 / overhang.

import { createStage, startLoop, listen, theme, sketch, wline, wrect } from '../main.js';
import { createBus, audio, fadeOut, noiseBurst, tone } from '../audio.js';
import { buzz } from '../haptics.js';

export const help = {
  touch: ['按住尺左右滑：調整懸空長度', '按住懸空端往下拉，放開：彈尺'],
  mouse: ['左右拖曳尺：調整懸空長度', '把懸空端往下拖，放開：彈尺'],
};

const MIN_U = 0.22, MAX_U = 0.75; // overhang as a fraction of the ruler's length
const DECAY = 2.4; // k in e^(−kt)
const VISUAL_HZ = 4.2; // vibration frequency at a full-length overhang, scaled by 1/u
const AUDIO_HZ = 68; // hum pitch at a full-length overhang, scaled by 1/u

// Kept between visits.
const state = {
  u: 0.45,
  bend: 0, // tip deflection while held, px (down is positive)
  amp: 0, // tip amplitude at release, px
  t: 0, // seconds since release
  twanging: false,
};

let stage, bus, stopLoop, stopListening;
let voice = null; // gain node carrying the current twang's hum and slaps
let drag = null;
const g = { R: 0, edge: 0, top: 0, th: 0, area: 0 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const shape = (xi) => (xi * xi * (3 - xi)) / 2; // static cantilever profile, 1 at the tip
const slope = (xi) => (3 * xi * (2 - xi)) / 2;
const overhang = () => state.u * g.R;
const omega = () => (2 * Math.PI * VISUAL_HZ) / state.u;
const maxBend = () => Math.min(overhang() * 0.32, g.area * 0.3);
const envelope = () => Math.abs(state.amp) * Math.exp(-DECAY * state.t);

function tip() {
  return state.twanging ? state.amp * Math.exp(-DECAY * state.t) * Math.cos(omega() * state.t) : state.bend;
}

function layout(s) {
  g.area = s.bottom;
  g.edge = s.w * (s.w < 600 ? 0.26 : 0.32);
  g.R = Math.min((s.w - g.edge - 20) / MAX_U, 900);
  g.th = clamp(g.R * 0.022, 7, 12);
  g.top = g.area * 0.46;
}

export function mount(container) {
  stage = createStage(container, layout);
  bus = createBus();
  stopListening = listen(stage.canvas, { down, move, up });
  stopLoop = startLoop(frame);
  if (state.twanging) startSound();
}

export function unmount() {
  stopLoop();
  stopListening();
  stopSound();
  bus.stop();
  stage.destroy();
  drag = null;
  state.bend = 0;
}

// ---------- input ----------

function onRuler(p) {
  const pad = p.touch ? 30 : 10;
  const o = overhang();
  if (p.x < g.edge - (g.R - o) - pad || p.x > g.edge + o + pad) return false;
  const xi = clamp((p.x - g.edge) / o, 0, 1);
  const y = g.top - g.th / 2 + tip() * shape(xi);
  return Math.abs(p.y - y) < g.th / 2 + pad;
}

function down(p) {
  if (drag || !onRuler(p)) return;
  if (state.twanging) {
    // the finger catches the ruler
    state.twanging = false;
    stopSound();
  }
  drag = { id: p.id, mode: 'pending', x0: p.x, y0: p.y, u0: state.u, scraped: 0 };
}

function move(p) {
  if (!drag || p.id !== drag.id) return;
  const dx = p.x - drag.x0, dy = p.y - drag.y0;
  if (drag.mode === 'pending') {
    if (Math.hypot(dx, dy) < 6) return;
    const xi = (drag.x0 - g.edge) / overhang();
    if (Math.abs(dy) > Math.abs(dx) && xi > 0.15) {
      drag.mode = 'bend';
      drag.xi = Math.min(1, xi);
    } else {
      drag.mode = 'slide';
    }
  }
  if (drag.mode === 'slide') {
    const before = state.u;
    state.u = clamp(drag.u0 + dx / g.R, MIN_U, MAX_U);
    drag.scraped += Math.abs(state.u - before) * g.R;
    if (drag.scraped > 12) {
      drag.scraped = 0;
      noiseBurst(bus, { dur: 0.035, freq: 900 + Math.random() * 300, q: 0.8, gain: 0.12 });
    }
  } else {
    const m = maxBend();
    state.bend = clamp(dy / shape(drag.xi), -m * 0.6, m);
  }
}

function up(p) {
  if (!drag || p.id !== drag.id) return;
  if (drag.mode === 'bend' && Math.abs(state.bend) > 3) twang(state.bend);
  state.bend = 0;
  drag = null;
}

function twang(amp) {
  state.amp = amp;
  state.t = 0;
  state.twanging = true;
  startSound();
  const strength = Math.min(1, Math.abs(amp) / maxBend());
  buzz([Math.round(10 + 20 * strength), 25, 12, 25, 8]);
}

// ---------- sound ----------
// A low-passed sawtooth hum whose gain follows e^(−kt), plus a short knock each period
// where the ruler slaps the desk edge.

function startSound() {
  stopSound();
  const ctx = audio();
  const out = bus.node;
  if (!ctx || !out) return;
  const level = Math.min(1, Math.abs(state.amp) / (overhang() * 0.22)) * Math.exp(-DECAY * state.t);
  if (level < 0.02) return;
  const now = ctx.currentTime;
  voice = ctx.createGain();
  voice.connect(out);

  const f = AUDIO_HZ / state.u;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f * 0.9, now);
  osc.frequency.setTargetAtTime(f, now, 0.4);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 2;
  lowpass.frequency.setValueAtTime(2000, now);
  lowpass.frequency.setTargetAtTime(500, now, 1 / DECAY);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.3 * level, now + 0.008);
  env.gain.setTargetAtTime(0.0001, now + 0.008, 1 / DECAY);
  osc.connect(lowpass).connect(env).connect(voice);
  const life = Math.log(level / 0.01) / DECAY;
  osc.start(now);
  osc.stop(now + life + 0.1);

  const period = (2 * Math.PI) / omega();
  const slapBus = { node: voice };
  for (let n = Math.ceil(state.t / period - 0.5); n < 200; n++) {
    const at = (n + 0.5) * period - state.t;
    if (at < 0) continue;
    const lvl = level * Math.exp(-DECAY * at);
    if (lvl < 0.04) break;
    noiseBurst(slapBus, { at, dur: 0.018, freq: 1500, q: 1.2, gain: 0.5 * lvl });
    tone(slapBus, { at, f0: 190, f1: 120, dur: 0.03, gain: 0.3 * lvl });
  }
}

function stopSound() {
  fadeOut(voice);
  voice = null;
}

// ---------- loop ----------

function frame(dt) {
  if (state.twanging) {
    state.t += dt;
    if (envelope() < 0.3) state.twanging = false;
  }
  draw();
}

function draw() {
  stage.clear();
  const ctx = stage.ctx;
  drawDesk(ctx);
  drawRuler(ctx);
  drawBook(ctx);
}

function drawDesk(ctx) {
  const slab = Math.max(18, g.area * 0.05);
  const p = new Path2D();
  p.moveTo(-10, g.top);
  wline(p, -10, g.top, g.edge, g.top, 11);
  wline(p, g.edge, g.top, g.edge, g.top + slab, 12);
  wline(p, g.edge, g.top + slab, -10, g.top + slab, 13);
  for (let x = g.edge - 10; x > -10; x -= 14) {
    p.moveTo(x, g.top + 4);
    p.lineTo(x - 8, g.top + slab - 4);
  }
  // a leg
  const legX = g.edge - 34;
  p.moveTo(legX, g.top + slab);
  wline(p, legX, g.top + slab, legX, g.area - 8, 14);
  p.moveTo(legX + 14, g.top + slab);
  wline(p, legX + 14, g.top + slab, legX + 14, g.area - 8, 15);
  sketch(ctx, p, { width: 1.8, alpha: 0.8 });
}

/** Centre-line point and unit normal at distance x along the ruler from its desk end. */
function along(x, d, o) {
  const y0 = g.top - g.th / 2;
  if (x <= g.edge) return { x, y: y0, nx: 0, ny: -1 };
  const xi = Math.min(1, (x - g.edge) / o);
  const s = (d * slope(xi)) / o;
  const len = Math.hypot(1, s);
  return { x, y: y0 + d * shape(xi), nx: s / len, ny: -1 / len };
}

function rulerOutline(d) {
  const o = overhang(), left = g.edge - (g.R - o), h = g.th / 2;
  const pts = [left, g.edge];
  for (let i = 1; i <= 36; i++) pts.push(g.edge + (o * i) / 36);
  const top = pts.map((x) => along(x, d, o));
  const path = new Path2D();
  top.forEach((q, i) => (i ? path.lineTo(q.x + q.nx * h, q.y + q.ny * h) : path.moveTo(q.x + q.nx * h, q.y + q.ny * h)));
  for (let i = top.length - 1; i >= 0; i--) path.lineTo(top[i].x - top[i].nx * h, top[i].y - top[i].ny * h);
  path.closePath();
  return path;
}

function drawRuler(ctx) {
  const d = tip();
  const o = overhang(), left = g.edge - (g.R - o);

  // a faint blur at the extremes of the swing
  if (state.twanging && envelope() > 2) {
    const e = envelope() * Math.exp(-DECAY * 0.02);
    for (const side of [-1, 1]) sketch(ctx, rulerOutline(side * e), { stroke: theme.ink, width: 1.2, alpha: 0.18 });
  }

  sketch(ctx, rulerOutline(d), { fill: theme.fill3, width: 1.8 });

  // centimetre ticks from the upper edge
  const ticks = new Path2D();
  const step = g.R / 30;
  for (let k = 1; k < 30; k++) {
    const q = along(left + k * step, d, o);
    const h = g.th / 2, len = g.th * (k % 5 === 0 ? 0.7 : 0.38);
    ticks.moveTo(q.x + q.nx * h, q.y + q.ny * h);
    ticks.lineTo(q.x + q.nx * (h - len), q.y + q.ny * (h - len));
  }
  sketch(ctx, ticks, { width: 1.2, alpha: 0.8 });
}

function drawBook(ctx) {
  const w = Math.min(g.edge - 8, g.R * 0.32), h = Math.max(26, g.th * 3.6);
  const x = g.edge - 6 - w, y = g.top - g.th - h;
  const p = new Path2D();
  wrect(p, x, y, w, h, 3, 21);
  sketch(ctx, p, { fill: theme.fill1 });
  const pages = new Path2D();
  for (let k = 1; k <= 3; k++) {
    const py = y + h * (0.25 + k * 0.16);
    pages.moveTo(x + w * 0.08, py);
    wline(pages, x + w * 0.08, py, x + w - 3, py, 22 + k);
  }
  sketch(ctx, pages, { width: 1.1, alpha: 0.6 });
}
