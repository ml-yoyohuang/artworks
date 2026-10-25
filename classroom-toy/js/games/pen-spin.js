// 轉筆: top view of a pen spinning on a fingertip. Swipe along the spin to speed it up;
// flicks while the tail passes the thumb are clean, others add wobble. Too much wobble
// and the pen flies off, slides, rolls to a stop, and a new one lands in the hand.

import { createStage, startLoop, listen, theme, sketch, wline, wpoly, wrect } from '../main.js';
import { createBus, audio, noiseBurst, noiseLoop, tone } from '../audio.js';
import { buzz } from '../haptics.js';

export const help = {
  touch: ['順著旋轉方向快速滑動：加速轉筆', '筆尾經過拇指時撥最順，其他時候會晃', '晃太多筆會脫手'],
  mouse: ['順著旋轉方向快速拖曳：加速轉筆', '筆尾經過拇指時撥最順，其他時候會晃', '晃太多筆會脫手'],
};

const THUMB_ANGLE = Math.PI * 0.75; // where the thumb sits around the fingertip (screen angle)
const THUMB_WINDOW = 0.55; // rad either side of the thumb that counts as a clean flick
const MAX_SPIN = 32; // rad/s
const RESPAWN_DELAY = 2;
const MAX_DROPPED = 5;
const COLORS = ['fill1', 'fill4', 'fill5', 'fill3']; // not fill2, the colour of the fingers

// Kept between visits.
const state = {
  angle: -0.4, spin: 0, wobble: 0, phase: 0,
  color: 0,
  grow: 1, growV: 0, // scale of the pen in hand; springs up when a new one arrives
  flying: null, // { x, y, vx, vy, angle, spin, roll, rollV, rolling, color, stoppedAt }
  dropped: [], // pens resting on the desk
  waitUntil: 0, // time a new pen arrives, while one is flying or resting
  clock: 0,
};

let stage, bus, stopLoop, stopListening, wind = null;
const fingers = new Map(); // pointerId → { a, t } last angle around the pivot
const g = { cx: 0, cy: 0, L: 0, T: 0 };

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function layout(s) {
  g.cx = s.w / 2;
  g.cy = s.bottom * 0.52;
  g.L = Math.min(s.w * 0.78, s.bottom * 0.6, 460);
  g.T = Math.max(12, g.L * 0.045);
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
  wind?.stop();
  wind = null;
  bus.stop();
  stage.destroy();
  fingers.clear();
}

// ---------- input ----------

function down(p) {
  fingers.set(p.id, { a: Math.atan2(p.y - g.cy, p.x - g.cx), t: p.t });
}

function up(p) {
  fingers.delete(p.id);
}

function move(p) {
  const f = fingers.get(p.id);
  if (!f) return;
  const a = Math.atan2(p.y - g.cy, p.x - g.cx);
  const dt = Math.max(p.t - f.t, 1 / 240);
  const da = wrap(a - f.a);
  f.a = a;
  f.t = p.t;
  // a finger right on the pivot has no sensible angle
  if (Math.hypot(p.x - g.cx, p.y - g.cy) < g.T * 2 || state.flying || state.grow < 0.9) return;
  const fingerSpin = da / dt;
  if (Math.abs(fingerSpin) < 3) return;
  const s = state;
  // only a finger moving faster than the pen, in its direction, pushes it
  if (Math.sign(fingerSpin) !== Math.sign(s.spin) && Math.abs(s.spin) > 1.5) {
    s.spin *= 0.85;
    s.wobble += 0.04;
    return;
  }
  if (Math.abs(fingerSpin) <= Math.abs(s.spin)) return;
  const tail = s.angle + Math.PI;
  const clean = Math.abs(wrap(tail - THUMB_ANGLE)) < THUMB_WINDOW;
  const push = (fingerSpin - s.spin) * Math.min(1, dt * 7) * (clean ? 1 : 0.6);
  const before = s.spin;
  s.spin = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, s.spin + push));
  const gained = Math.abs(s.spin - before);
  if (clean) {
    s.wobble = Math.max(0, s.wobble - gained * 0.01);
    if (gained > 1.5) flickSound(true);
  } else {
    s.wobble += gained * 0.035;
    if (gained > 1.5) flickSound(false);
  }
}

// ---------- sound ----------

function flickSound(clean) {
  if (clean) {
    noiseBurst(bus, { dur: 0.06, freq: 1800, q: 1.5, gain: 0.18, attack: 0.01 });
    buzz(6);
  } else {
    noiseBurst(bus, { dur: 0.02, freq: 2400, q: 3, gain: 0.35 });
    tone(bus, { type: 'triangle', f0: 900, f1: 500, dur: 0.04, gain: 0.25 });
    buzz(14);
  }
}

function clatter(speed) {
  const n = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const at = i * (0.07 + Math.random() * 0.06);
    const gain = Math.min(0.5, speed / 1400) * Math.pow(0.6, i);
    noiseBurst(bus, { at, dur: 0.025, freq: 1600 + Math.random() * 1500, q: 2, gain });
    tone(bus, { at, type: 'triangle', f0: 700 + Math.random() * 400, dur: 0.05, gain: gain * 0.6 });
  }
  buzz([20, 40, 12]);
}

/** The whoosh: a band of noise that brightens with speed and pulses each time the pen sweeps past. */
function updateWind() {
  const s = state;
  if (!wind && audio()) wind = noiseLoop(bus, { freq: 600, q: 0.9 });
  if (!wind) return;
  const speed = Math.abs(s.flying ? s.flying.spin : s.spin);
  const pulse = 0.55 + 0.45 * Math.pow(Math.abs(Math.cos((s.flying ? s.flying.angle : s.angle) * 2)), 3);
  const level = Math.min(1, speed / 24) ** 2 * 0.3 * pulse;
  const t = wind.ctx.currentTime;
  wind.gain.gain.setTargetAtTime(level, t, 0.03);
  wind.filter.frequency.setTargetAtTime(350 + speed * 45, t, 0.05);
}

// ---------- simulation ----------

function frame(dt) {
  const s = state;
  s.clock += dt;
  if (!s.flying) {
    s.angle += s.spin * dt;
    s.spin *= Math.exp(-dt * 0.3);
    s.spin -= Math.sign(s.spin) * Math.min(Math.abs(s.spin), 0.5 * dt);
    s.wobble *= Math.exp(-dt * 0.5);
    s.phase += dt * (4 + Math.abs(s.spin) * 0.3);
    if (s.wobble > 1) drop();
  }
  s.growV += (260 * (1 - s.grow) - 16 * s.growV) * dt;
  s.grow += s.growV * dt;
  if (s.flying) updateFlying(dt);
  updateWind();
  draw();
}

function drop() {
  const s = state;
  const dir = Math.sign(s.spin) || 1;
  // thrown sideways from the pivot, perpendicular to the pen
  const speed = Math.min(650, 150 + Math.abs(s.spin) * g.L * 0.03);
  const out = s.angle + (Math.random() - 0.5) * 1.2 + dir * Math.PI / 2;
  s.flying = {
    x: g.cx, y: g.cy, vx: Math.cos(out) * speed, vy: Math.sin(out) * speed,
    angle: s.angle, spin: s.spin, roll: 0, rollV: 0, rolling: false, color: s.color, stoppedAt: -1,
  };
  s.spin = 0;
  s.wobble = 0;
  clatter(speed);
}

function updateFlying(dt) {
  const s = state, f = s.flying;
  if (!f.rolling) {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.angle += f.spin * dt;
    f.vx *= Math.exp(-dt * 1.6);
    f.vy *= Math.exp(-dt * 1.6);
    f.spin *= Math.exp(-dt * 2.2);
    if (Math.hypot(f.vx, f.vy) < 30 && Math.abs(f.spin) < 0.8) {
      // the pen settles onto its side and rolls across its axis
      f.rolling = true;
      f.rollV = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 30);
      noiseBurst(bus, { dur: 0.5, attack: 0.05, type: 'lowpass', freq: 500, gain: 0.12 });
    }
  } else if (f.stoppedAt < 0) {
    const nx = -Math.sin(f.angle), ny = Math.cos(f.angle);
    f.x += nx * f.rollV * dt;
    f.y += ny * f.rollV * dt;
    f.roll += f.rollV * dt;
    f.rollV *= Math.exp(-dt * 2.4);
    if (Math.abs(f.rollV) < 3) {
      f.stoppedAt = s.clock;
      s.waitUntil = s.clock + RESPAWN_DELAY;
    }
  }
  // the desk ends at the screen edges
  const m = g.T * 2;
  if (f.x < m || f.x > stage.w - m) { f.x = Math.max(m, Math.min(stage.w - m, f.x)); f.vx *= -0.5; f.rollV *= -0.5; }
  if (f.y < m || f.y > stage.bottom - m) { f.y = Math.max(m, Math.min(stage.bottom - m, f.y)); f.vy *= -0.5; f.rollV *= -0.5; }

  if (f.stoppedAt >= 0 && s.clock >= s.waitUntil) {
    s.dropped.push(f);
    if (s.dropped.length > MAX_DROPPED) s.dropped.shift();
    s.flying = null;
    s.color = (s.color + 1) % COLORS.length;
    s.angle = -0.4;
    s.grow = 0.5;
    s.growV = 0;
    tone(bus, { f0: 520, f1: 380, dur: 0.06, gain: 0.25 });
    buzz(8);
  }
}

// ---------- drawing ----------

function draw() {
  stage.clear();
  const ctx = stage.ctx;
  const s = state;
  for (const d of s.dropped) drawPen(ctx, d.x, d.y, d.angle, 1, theme[COLORS[d.color]], d.roll);

  drawHand(ctx);
  if (s.flying) {
    const f = s.flying;
    drawPen(ctx, f.x, f.y, f.angle, 1, theme[COLORS[f.color]], f.roll);
  } else {
    const r = s.wobble * g.T * 1.6;
    const ox = Math.cos(s.phase) * r, oy = Math.sin(s.phase * 1.3) * r;
    const jitter = Math.sin(s.clock * 13) * s.wobble * 0.12;
    drawPen(ctx, g.cx + ox, g.cy + oy, s.angle + jitter, s.grow, theme[COLORS[s.color]], 0);
  }
  // fingertip on top of the pen
  const tip = new Path2D();
  tip.ellipse(g.cx, g.cy + g.T * 0.3, g.T * 1.15, g.T * 1.3, 0, 0, Math.PI * 2);
  sketch(ctx, tip, { fill: theme.fill2, width: 1.8, alpha: s.flying ? 0.7 : 1 });
  const nail = new Path2D();
  wrect(nail, g.cx - g.T * 0.55, g.cy - g.T * 0.55, g.T * 1.1, g.T * 0.9, g.T * 0.4, 3);
  sketch(ctx, nail, { width: 1.3, alpha: 0.7 });
}

/** The thumb, glowing faintly while the pen's tail is in reach. */
function drawHand(ctx) {
  const s = state;
  const r = g.L * 0.5 * 0.86;
  const x = g.cx + Math.cos(THUMB_ANGLE) * r, y = g.cy + Math.sin(THUMB_ANGLE) * r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(THUMB_ANGLE + Math.PI / 2);
  const near = !s.flying && Math.abs(wrap(s.angle + Math.PI - THUMB_ANGLE)) < THUMB_WINDOW;
  const p = new Path2D();
  p.ellipse(0, 0, g.T * 1.25, g.T * 1.9, 0, 0, Math.PI * 2);
  sketch(ctx, p, { fill: theme.fill2, width: 1.8, alpha: near ? 1 : 0.75 });
  const nail = new Path2D();
  wrect(nail, -g.T * 0.6, -g.T * 1.5, g.T * 1.2, g.T * 1.1, g.T * 0.45, 9);
  sketch(ctx, nail, { width: 1.3, alpha: 0.7 });
  ctx.restore();
}

/** A ballpoint seen from above: tip toward +x, clicker toward −x. `roll` slides the print around the barrel. */
function drawPen(ctx, x, y, angle, scale, color, roll) {
  const L = g.L * scale, T = g.T * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  let p = new Path2D();
  wrect(p, -L * 0.5, -T * 0.32, L * 0.08, T * 0.64, T * 0.25, 1);
  sketch(ctx, p, { fill: theme.metal, width: 1.6 });
  p = new Path2D();
  wrect(p, -L * 0.43, -T * 0.5, L * 0.78, T, T * 0.35, 2);
  sketch(ctx, p, { fill: color });
  p = new Path2D();
  wpoly(p, [L * 0.35, -T * 0.42, L * 0.5, -T * 0.08, L * 0.5, T * 0.08, L * 0.35, T * 0.42], true, 3);
  sketch(ctx, p, { fill: theme.metal, width: 1.6 });
  // clip and grip, and a print line that rolls around the barrel
  p = new Path2D();
  wrect(p, -L * 0.38, -T * 0.16, L * 0.22, T * 0.32, T * 0.12, 4);
  for (let k = 0; k < 5; k++) {
    const gx = L * (0.16 + k * 0.035);
    p.moveTo(gx, -T * 0.42);
    wline(p, gx, -T * 0.42, gx, T * 0.42, k);
  }
  sketch(ctx, p, { width: 1.3, alpha: 0.75 });
  const band = ((roll / (Math.PI * T)) % 1 + 1) % 1;
  if (band > 0.1 && band < 0.9) {
    ctx.save();
    ctx.globalAlpha = Math.sin(band * Math.PI) * 0.6;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const by = (band - 0.5) * T * 0.9;
    ctx.moveTo(-L * 0.1, by);
    ctx.lineTo(L * 0.08, by);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
