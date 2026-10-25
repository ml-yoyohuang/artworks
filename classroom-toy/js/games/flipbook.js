// 課本角落翻頁動畫: draw on the bottom-right corner of a textbook page, with the page
// before showing through faintly. Swipe the corner left for a new page, right to go
// back; riffle the corner back and forth to play every page as an animation (30 max).

import { createStage, startLoop, listen, theme, hash } from '../main.js';
import { createBus, noiseBurst } from '../audio.js';
import { buzz } from '../haptics.js';

export const help = {
  touch: ['在頁面上用手指畫圖', '頁角往左滑：下一頁；往右滑：上一頁', '在頁角來回快速刷：播放動畫'],
  mouse: ['在頁面上拖曳畫圖', '頁角往左拖：下一頁；往右拖：上一頁', '在頁角來回快速拖：播放動畫'],
};

const MAX_PAGES = 30;
const FLIP_TIME = 0.3;
const INK = '#3a3d48'; // pencil on paper, the same in both themes

// Kept between visits. Strokes are stored in page units (0..1 across and down).
const state = {
  pages: [[]], // page → strokes → flat [x, y, x, y, …]
  current: 0,
  flip: null, // { under, over, from, to, t }
  riffle: null, // { pos, speed, shown, start }
};

let stage, bus, stopLoop, stopListening;
let grab = null;
let lastScratch = 0;
const page = { x: 0, y: 0, r: 0, b: 0, corner: 0 };

const sheet = () => (theme.dark ? '#dedbcd' : '#fffef8');
const sheetBack = () => (theme.dark ? '#cbc8ba' : '#efeadf');

function layout(s) {
  page.x = -30;
  page.y = Math.min(132, s.bottom * 0.2); // below the help text, which is chalk-white on dark screens
  page.r = s.w - 18;
  page.b = s.bottom - 16;
  page.corner = Math.max(90, Math.min(page.r - page.x, page.b - page.y) * 0.26);
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
  if (state.riffle) endRiffle();
  state.flip = null;
  grab = null;
}

// ---------- input ----------

const toPage = (x, y) => [(x - page.x) / (page.r - page.x), (y - page.y) / (page.b - page.y)];
const inCorner = (p) => page.r - p.x + (page.b - p.y) < page.corner * 1.3 && p.x <= page.r + 20 && p.y <= page.b + 20;
const onPage = (p) => p.x >= page.x && p.x <= page.r && p.y >= page.y && p.y <= page.b;

function down(p) {
  if (grab || state.flip) return;
  if (inCorner(p)) {
    grab = { mode: 'corner', id: p.id, x0: p.x, x: p.x, t0: p.t, t: p.t, path: 0, dir: 0, turns: 0 };
  } else if (onPage(p)) {
    const stroke = toPage(p.x, p.y);
    state.pages[state.current].push(stroke);
    grab = { mode: 'draw', id: p.id, stroke, x: p.x, y: p.y };
  }
}

function move(p) {
  if (!grab || grab.id !== p.id) return;
  if (grab.mode === 'draw') {
    const d = Math.hypot(p.x - grab.x, p.y - grab.y);
    if (d < 1.5) return;
    grab.stroke.push(...toPage(p.x, p.y));
    grab.x = p.x; grab.y = p.y;
    if (p.t - lastScratch > 0.045) {
      lastScratch = p.t;
      noiseBurst(bus, { dur: 0.03, type: 'highpass', freq: 3500 + Math.random() * 2500, gain: Math.min(0.12, 0.03 + d / 300) });
    }
    return;
  }
  const dx = p.x - grab.x, dt = Math.max(p.t - grab.t, 1 / 240);
  grab.x = p.x; grab.t = p.t;
  grab.path += Math.abs(dx);
  if (Math.abs(dx) > 2) {
    const dir = Math.sign(dx);
    if (grab.dir && dir !== grab.dir) grab.turns++;
    grab.dir = dir;
  }
  if (grab.mode === 'corner' && (grab.turns >= 1 || (p.t - grab.t0 > 0.45 && grab.path > 60)) && state.pages.length > 1) {
    grab.mode = 'riffle';
    state.riffle = { pos: 0, speed: 0, shown: 0, start: state.current };
  }
  if (grab.mode === 'riffle') {
    const r = state.riffle;
    r.speed += (Math.abs(dx) / dt - r.speed) * 0.3;
  }
}

function up(p) {
  if (!grab || grab.id !== p.id) return;
  if (grab.mode === 'corner') {
    const dx = p.x - grab.x0;
    if (dx < -30) next();
    else if (dx > 30) previous();
  } else if (grab.mode === 'riffle') {
    endRiffle();
  }
  grab = null;
}

function next() {
  const s = state;
  if (s.current === s.pages.length - 1) {
    if (s.pages.length >= MAX_PAGES) {
      // the book is full
      noiseBurst(bus, { dur: 0.05, type: 'lowpass', freq: 500, gain: 0.2 });
      buzz(20);
      return;
    }
    s.pages.push([]);
  }
  s.flip = { under: s.current + 1, over: s.current, from: 0, to: 1, t: 0 };
  s.current++;
  flipSound();
}

function previous() {
  const s = state;
  if (s.current === 0) {
    noiseBurst(bus, { dur: 0.05, type: 'lowpass', freq: 500, gain: 0.2 });
    return;
  }
  s.flip = { under: s.current, over: s.current - 1, from: 1, to: 0, t: 0 };
  s.current--;
  flipSound();
}

function endRiffle() {
  state.current = state.riffle.start;
  state.riffle = null;
  flipSound();
}

function flipSound() {
  noiseBurst(bus, { dur: 0.16, attack: 0.03, freq: 2400, q: 0.6, gain: 0.22 });
  noiseBurst(bus, { dur: 0.08, type: 'lowpass', freq: 900, gain: 0.12, at: 0.05 });
  buzz(8);
}

// ---------- loop ----------

function frame(dt) {
  const s = state;
  if (s.flip) {
    s.flip.t += dt / FLIP_TIME;
    if (s.flip.t >= 1) s.flip = null;
  }
  if (s.riffle) {
    const r = s.riffle;
    r.speed *= Math.exp(-dt * 3);
    r.pos += Math.min(30, r.speed * 0.03) * dt;
    const shown = Math.floor(r.pos) % s.pages.length;
    if (shown !== r.shown) {
      r.shown = shown;
      noiseBurst(bus, { dur: 0.025, freq: 3000 + Math.random() * 800, q: 1, gain: 0.14 });
      buzz(3);
    }
  }
  draw();
}

// ---------- drawing ----------

function draw() {
  stage.clear();
  const ctx = stage.ctx, s = state;
  if (s.riffle) {
    drawPage(ctx, s.riffle.shown, false);
  } else if (s.flip) {
    const f = s.flip;
    const e = f.t < 0.5 ? 2 * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 2) / 2;
    drawCurl(ctx, f, f.from + (f.to - f.from) * e);
  } else {
    drawPage(ctx, s.current, true);
  }
}

function pagePath(ctx) {
  ctx.beginPath();
  ctx.rect(page.x, page.y, page.r - page.x, page.b - page.y);
}

/** A page: paper, a few lines of faint textbook print, the edges of the pages below, and the drawing. */
function drawPage(ctx, index, onion) {
  const s = state;
  // the stack of pages still to come peeks out at the bottom and right
  const below = Math.min(4, s.pages.length - 1 - index) + 1;
  ctx.save();
  ctx.strokeStyle = theme.ink;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  for (let k = below; k >= 1; k--) {
    ctx.fillStyle = sheet();
    ctx.fillRect(page.x + k * 2.5, page.y + k * 2.5, page.r - page.x, page.b - page.y);
    ctx.strokeRect(page.x + k * 2.5, page.y + k * 2.5, page.r - page.x, page.b - page.y);
  }
  ctx.restore();

  ctx.fillStyle = sheet();
  pagePath(ctx);
  ctx.fill();
  drawPrint(ctx);
  if (onion && index > 0) drawStrokes(ctx, s.pages[index - 1], 0.14);
  drawStrokes(ctx, s.pages[index], 1);
  drawCornerHint(ctx);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 1.8;
  pagePath(ctx);
  ctx.stroke();
}

function drawPrint(ctx) {
  const W = page.r - page.x;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.09;
  const lineH = 18, left = Math.max(24, page.x + 40);
  for (let k = 0; k < 7; k++) {
    const y = page.y + 28 + k * lineH;
    const len = (W - left - 30) * (k === 6 ? 0.45 : 0.8 + hash(k * 3) * 0.15);
    ctx.fillRect(left, y, len, 6);
  }
  ctx.restore();
}

function drawStrokes(ctx, strokes, alpha) {
  const W = page.r - page.x, H = page.b - page.y;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const st of strokes) {
    const x0 = page.x + st[0] * W, y0 = page.y + st[1] * H;
    if (st.length === 2) {
      ctx.beginPath();
      ctx.arc(x0, y0, 1.6, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let i = 2; i < st.length - 2; i += 2) {
      const xa = page.x + st[i] * W, ya = page.y + st[i + 1] * H;
      const xb = page.x + st[i + 2] * W, yb = page.y + st[i + 3] * H;
      ctx.quadraticCurveTo(xa, ya, (xa + xb) / 2, (ya + yb) / 2);
    }
    ctx.lineTo(page.x + st[st.length - 2] * W, page.y + st[st.length - 1] * H);
    ctx.stroke();
  }
  ctx.restore();
}

/** A slightly lifted corner, so it's clear where to flick. */
function drawCornerHint(ctx) {
  const c = page.corner * 0.32;
  ctx.save();
  ctx.fillStyle = sheetBack();
  ctx.beginPath();
  ctx.moveTo(page.r - c, page.b);
  ctx.quadraticCurveTo(page.r - c * 0.75, page.b - c * 0.75, page.r, page.b - c);
  ctx.lineTo(page.r, page.b);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(page.r - c, page.b);
  ctx.quadraticCurveTo(page.r - c * 0.75, page.b - c * 0.75, page.r, page.b - c);
  ctx.stroke();
  ctx.restore();
}

/** Clips a polygon to the half plane f(x, y) = x + y − c < 0 (or > 0 when `keepAbove`). */
function clipHalf(pts, c, keepAbove) {
  const f = (q) => (q[0] + q[1] - c) * (keepAbove ? -1 : 1);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b);
    if (fa < 0) out.push(a);
    if (fa < 0 !== fb < 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/**
 * The page turning: `over` is folded back from the bottom-right corner along a line
 * whose distance from the corner grows with `amount` (0 flat, 1 gone), showing `under`.
 */
function drawCurl(ctx, f, amount) {
  const W = page.r - page.x, H = page.b - page.y;
  const c = page.r + page.b - amount * (W + H); // fold line: x + y = c
  drawPage(ctx, f.under, false);
  const rect = [[page.x, page.y], [page.r, page.y], [page.r, page.b], [page.x, page.b]];

  const kept = clipHalf(rect, c, false);
  if (kept.length > 2) {
    ctx.save();
    ctx.beginPath();
    kept.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.closePath();
    ctx.clip();
    drawPage(ctx, f.over, false);
    ctx.restore();
  }
  // the folded flap: the cut-off part mirrored across the fold line, back side up
  const flap = clipHalf(rect, c, true).map(([x, y]) => [c - y, c - x]);
  if (flap.length > 2) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    flap.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.closePath();
    ctx.fillStyle = sheetBack();
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }
}
