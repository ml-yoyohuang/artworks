// Game switching plus the canvas, loop, pointer, theme and hand-drawn line helpers every game shares.

import { isMuted, setMuted } from './audio.js';

// ---------- theme ----------
// Colours live in style.css (exercise book in light mode, chalkboard in dark) and are
// read back here so the canvases use the same values.

export const theme = {};
const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function readTheme() {
  const css = getComputedStyle(document.documentElement);
  for (const name of ['paper', 'ink', 'rule', 'margin', 'lead', 'metal', 'fill1', 'fill2', 'fill3', 'fill4', 'fill5']) {
    theme[name] = css.getPropertyValue(`--${name}`).trim();
  }
  theme.dark = darkScheme.matches;
  document.querySelector('meta[name="theme-color"]').content = theme.paper;
}
darkScheme.addEventListener('change', readTheme);
readTheme();

// ---------- stage ----------

/**
 * A full-screen canvas sized for devicePixelRatio. Drawing uses CSS pixels; `bottom`
 * is where the icon bar begins, so games keep their objects above it.
 */
export function createStage(container, onResize) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const stage = { canvas, ctx, w: 0, h: 0, dpr: 1, bottom: 0 };
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    Object.assign(stage, { w, h, dpr, bottom: h - nav.offsetHeight });
    onResize?.(stage);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  /** Clears the canvas and resets the transform to CSS pixels. */
  stage.clear = () => {
    ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
    ctx.clearRect(0, 0, stage.w, stage.h);
  };
  stage.destroy = () => {
    observer.disconnect();
    canvas.remove();
  };
  return stage;
}

/** Calls fn(dt, t) every frame, dt in seconds and capped so a stalled tab doesn't explode the physics. */
export function startLoop(fn) {
  let id = 0, last = performance.now();
  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    fn(dt, now / 1000);
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}

/**
 * Tracks every pointer on the canvas separately (several fingers at once). Handlers get
 * { id, x, y, touch, t } in CSS pixels; returns a function that removes the listeners.
 */
export function listen(canvas, { down, move, up }) {
  const active = new Set();
  const info = (ev) => ({ id: ev.pointerId, x: ev.clientX, y: ev.clientY, touch: ev.pointerType !== 'mouse', t: ev.timeStamp / 1000 });
  const onDown = (ev) => {
    try { canvas.setPointerCapture(ev.pointerId); } catch {}
    active.add(ev.pointerId);
    down?.(info(ev));
  };
  const onMove = (ev) => {
    if (!active.has(ev.pointerId) && ev.pointerType !== 'mouse') return;
    move?.(info(ev), active.has(ev.pointerId));
  };
  const onUp = (ev) => {
    if (!active.delete(ev.pointerId)) return;
    up?.(info(ev));
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
  };
}

// ---------- hand-drawn lines ----------

/** Deterministic 0..1 noise, so a shape's wobble stays the same from frame to frame. */
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Adds a slightly bowed straight line to a path. */
export function wline(p, x1, y1, x2, y2, seed = 0, amount = 1) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const bow = (hash(seed) - 0.5) * Math.min(3, len * 0.03) * amount;
  p.quadraticCurveTo((x1 + x2) / 2 - (dy / len) * bow, (y1 + y2) / 2 + (dx / len) * bow, x2, y2);
}

/** Adds a polygon made of bowed lines. */
export function wpoly(p, pts, closed = true, seed = 0) {
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) wline(p, pts[i - 2], pts[i - 1], pts[i], pts[i + 1], seed + i);
  if (closed) wline(p, pts[pts.length - 2], pts[pts.length - 1], pts[0], pts[1], seed + 99);
}

/** Adds a rounded rectangle with bowed sides. */
export function wrect(p, x, y, w, h, r = 0, seed = 0) {
  r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y);
  wline(p, x + r, y, x + w - r, y, seed + 1);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  wline(p, x + w, y + r, x + w, y + h - r, seed + 2);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  wline(p, x + w - r, y + h, x + r, y + h, seed + 3);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  wline(p, x, y + h - r, x, y + r, seed + 4);
  p.quadraticCurveTo(x, y, x + r, y);
  p.closePath();
}

/**
 * Fills and outlines a Path2D like a quick sketch: the colour sits a touch off the
 * outline, and a faint second stroke doubles the line.
 */
export function sketch(ctx, path, { fill = null, stroke = theme.ink, width = 2, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (fill) {
    ctx.save();
    ctx.translate(1.2, 1);
    ctx.fillStyle = fill;
    ctx.fill(path);
    ctx.restore();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke(path);
    ctx.translate(0.8, 0.6);
    ctx.globalAlpha *= 0.3;
    ctx.stroke(path);
  }
  ctx.restore();
}

/** A side-view desk top: a bowed line from x0 to x1 at y with hatching under it. */
export function deskPath(x0, x1, y, seed = 40) {
  const path = new Path2D();
  const n = Math.max(1, Math.ceil((x1 - x0) / 120));
  const step = (x1 - x0) / n;
  path.moveTo(x0, y);
  for (let i = 0; i < n; i++) wline(path, x0 + i * step, y, x0 + (i + 1) * step, y, seed + i);
  for (let x = x0 + 16; x < x1; x += 16) {
    path.moveTo(x, y + 5);
    path.lineTo(x - 9, y + 16);
  }
  return path;
}

// ---------- help ----------

const COMMON_HELP = {
  touch: ['點底部圖示：換遊戲', '右上按鈕：聲音開關'],
  mouse: ['點擊底部圖示：換遊戲', '右上按鈕：聲音開關'],
};
const helpEl = document.getElementById('help');
let helpTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

function renderHelp() {
  const key = helpTouch ? 'touch' : 'mouse';
  const lines = [...(current?.help?.[key] ?? []), ...COMMON_HELP[key]];
  helpEl.replaceChildren(...lines.map((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    return li;
  }));
}
document.addEventListener('pointerdown', (ev) => {
  const touch = ev.pointerType !== 'mouse';
  if (touch === helpTouch) return;
  helpTouch = touch;
  renderHelp();
}, { capture: true, passive: true });

// ---------- sound button ----------

const soundButton = document.getElementById('sound');
function syncSoundButton() {
  soundButton.setAttribute('aria-pressed', String(isMuted()));
  soundButton.setAttribute('aria-label', isMuted() ? '開啟聲音' : '靜音');
}
syncSoundButton();
soundButton.addEventListener('click', () => {
  setMuted(!isMuted());
  syncSoundButton();
});

// ---------- switching ----------
// Modules are loaded on first visit and kept, so each game's state survives switching.

const stageEl = document.getElementById('stage');
const nav = document.getElementById('games');
const modules = new Map();
let current = null;
let request = 0;

async function show(id) {
  const ticket = ++request;
  for (const button of nav.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.game === id));
  }
  if (!modules.has(id)) modules.set(id, import(`./games/${id}.js`));
  const game = await modules.get(id);
  if (ticket !== request || game === current) return;
  current?.unmount();
  current = game;
  game.mount(stageEl);
  renderHelp();
}

nav.addEventListener('click', (ev) => {
  const button = ev.target.closest('button[data-game]');
  if (button) show(button.dataset.game);
});
document.addEventListener('gesturestart', (ev) => ev.preventDefault());
document.addEventListener('contextmenu', (ev) => ev.preventDefault());

show(nav.querySelector('button[data-game]').dataset.game);
