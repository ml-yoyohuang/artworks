// 點點連線: 7×9 dots. Drag between neighbouring dots to draw pencil lines; every box
// closed is coloured from a hidden 6×8 pixel picture. A finished picture stays for two
// seconds, then the next one begins.

import { createStage, startLoop, listen, theme, sketch, wline, hash } from '../main.js';
import { createBus, noiseBurst, tone } from '../audio.js';
import { buzz } from '../haptics.js';

export const help = {
  touch: ['從一點滑到相鄰的點：畫線', '圍出格子就會上色，拼出整張圖'],
  mouse: ['從一點拖曳到相鄰的點：畫線', '圍出格子就會上色，拼出整張圖'],
};

const COLS = 6, ROWS = 8; // boxes; dots are (COLS + 1) × (ROWS + 1)
const SHOW_TIME = 2;
const CLEAR_TIME = 0.45;

// Original 6×8 pictures. '.' is blank paper; letters pick a colour (see colorOf).
const PICTURES = [
  ['...gg.', '..n...', '.rrrr.', 'rrwrrr', 'rwrrrr', 'rrrrrr', '.rrrr.', '..rr..'], // apple
  ['..rr..', '.rrrr.', 'rrrrrr', 'rrrrrr', '.yyyy.', '.ybyy.', '.yyny.', '.yyny.'], // house
  ['......', '..b...', '.bbb.b', 'bkbbbb', 'bbbbbb', '.bbb.b', '..b...', '......'], // fish
  ['..yy..', '..yy..', 'yyyyyy', '.yyyy.', '.yyyy.', 'yy..yy', 'y....y', '......'], // star
  ['bbbbbb', 'bbwwbb', 'bwwwwb', 'wwwwww', 'bwwwwb', 'bbbbbb', 'gggggg', 'gggggg'], // cloud
  ['..rr..', '.rwrr.', 'rrrrwr', 'rwrrrr', 'rrrrrr', '..ee..', '..ee..', '.eeee.'], // mushroom
  ['.m..m.', '..m..m', '......', 'bbbbb.', 'bbbbbb', 'bbbbbb', '.bbb..', 'nnnnn.'], // cup
  ['....gg', '...ggg', '..gggg', '.ggngg', '.gnggg', 'gnggg.', 'ngg...', 'n.....'], // leaf
];

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

const blankBoxes = () => Array.from({ length: COLS * ROWS }, () => -1); // time each box was closed, −1 if open

// Kept between visits.
const state = {
  picture: 0,
  h: Array((COLS) * (ROWS + 1)).fill(false), // horizontal edges, row-major
  v: Array((COLS + 1) * ROWS).fill(false), // vertical edges
  boxes: blankBoxes(),
  phase: 'play', // play | show | clear
  timer: 0,
  clock: 0,
};

let stage, bus, stopLoop, stopListening;
let pen = null; // { id, i, j (anchor dot), x, y }
let lastScratch = 0;
const g = { s: 0, x0: 0, y0: 0 };

function layout(st) {
  g.s = Math.min((st.w - 48) / COLS, (st.bottom - 150) / ROWS, 64);
  g.x0 = (st.w - g.s * COLS) / 2;
  g.y0 = Math.max(110, (st.bottom - g.s * ROWS) / 2 + 30);
  if (g.y0 + g.s * ROWS > st.bottom - 16) g.y0 = st.bottom - 16 - g.s * ROWS;
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
  pen = null;
}

const dotX = (i) => g.x0 + i * g.s;
const dotY = (j) => g.y0 + j * g.s;

function colorOf(ch) {
  switch (ch) {
    case 'r': return theme.fill2;
    case 'g': return theme.fill4;
    case 'y': return theme.fill3;
    case 'b': return theme.fill1;
    case 'p': return theme.fill5;
    case 'm': return theme.metal;
    case 'k': return theme.ink;
    case 'n': return theme.dark ? '#a3815e' : '#b88d62';
    case 'e': return theme.dark ? '#cbb98f' : '#efd9ad';
    case 'w': return theme.dark ? '#e8e8de' : '#ffffff';
    default: return null;
  }
}

// ---------- input ----------

function nearestDot(x, y, reach) {
  const i = Math.round((x - g.x0) / g.s), j = Math.round((y - g.y0) / g.s);
  if (i < 0 || i > COLS || j < 0 || j > ROWS) return null;
  return Math.hypot(x - dotX(i), y - dotY(j)) < reach ? { i, j } : null;
}

function down(p) {
  if (pen || state.phase !== 'play') return;
  const d = nearestDot(p.x, p.y, g.s * (p.touch ? 0.5 : 0.4));
  if (d) pen = { id: p.id, i: d.i, j: d.j, x: p.x, y: p.y };
}

function move(p) {
  if (!pen || pen.id !== p.id) return;
  const dist = Math.hypot(p.x - pen.x, p.y - pen.y);
  pen.x = p.x; pen.y = p.y;
  if (dist > 2 && p.t - lastScratch > 0.05) {
    lastScratch = p.t;
    noiseBurst(bus, { dur: 0.03, type: 'highpass', freq: 3500 + Math.random() * 2000, gain: 0.05 });
  }
  const d = nearestDot(p.x, p.y, g.s * 0.32);
  if (!d || Math.abs(d.i - pen.i) + Math.abs(d.j - pen.j) !== 1) return;
  // reached a neighbour: draw that edge and keep going from there
  addEdge(pen.i, pen.j, d.i, d.j);
  pen.i = d.i; pen.j = d.j;
}

function up(p) {
  if (pen && pen.id === p.id) pen = null;
}

function addEdge(i0, j0, i1, j1) {
  const s = state;
  const i = Math.min(i0, i1), j = Math.min(j0, j1);
  const horizontal = j0 === j1;
  const list = horizontal ? s.h : s.v;
  const k = horizontal ? j * COLS + i : j * (COLS + 1) + i;
  if (list[k]) return;
  list[k] = true;
  noiseBurst(bus, { dur: 0.09, attack: 0.01, type: 'highpass', freq: 2800, gain: 0.18 });
  noiseBurst(bus, { dur: 0.05, freq: 1200, q: 1.5, gain: 0.08 });
  buzz(5);
  const closed = horizontal ? [[i, j - 1], [i, j]] : [[i - 1, j], [i, j]];
  for (const [bi, bj] of closed) if (bi >= 0 && bi < COLS && bj >= 0 && bj < ROWS) checkBox(bi, bj);
}

function checkBox(i, j) {
  const s = state;
  if (s.boxes[j * COLS + i] >= 0) return;
  if (!(s.h[j * COLS + i] && s.h[(j + 1) * COLS + i] && s.v[j * (COLS + 1) + i] && s.v[j * (COLS + 1) + i + 1])) return;
  s.boxes[j * COLS + i] = s.clock;
  const f = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
  tone(bus, { type: 'triangle', f0: f, dur: 0.22, gain: 0.2 });
  tone(bus, { f0: f * 2, dur: 0.12, gain: 0.07 });
  buzz(12);
  if (s.boxes.every((t) => t >= 0)) {
    s.phase = 'show';
    s.timer = 0;
    pen = null;
    [0, 0.1, 0.2, 0.32].forEach((at, k) => tone(bus, { type: 'triangle', f0: [523.25, 659.25, 783.99, 1046.5][k], dur: 0.3, gain: 0.18, at: at + 0.15 }));
    buzz([20, 40, 20, 40, 30]);
  }
}

// ---------- loop ----------

function frame(dt) {
  const s = state;
  s.clock += dt;
  s.timer += dt;
  if (s.phase === 'show' && s.timer >= SHOW_TIME) {
    s.phase = 'clear';
    s.timer = 0;
    noiseBurst(bus, { dur: 0.35, attack: 0.1, freq: 2500, q: 0.6, gain: 0.1 });
  } else if (s.phase === 'clear' && s.timer >= CLEAR_TIME) {
    s.phase = 'play';
    s.picture = (s.picture + 1) % PICTURES.length;
    s.h.fill(false);
    s.v.fill(false);
    s.boxes = blankBoxes();
  }
  draw();
}

function draw() {
  stage.clear();
  const ctx = stage.ctx, s = state, gs = g.s;
  const fade = s.phase === 'clear' ? 1 - s.timer / CLEAR_TIME : 1;
  const pic = PICTURES[s.picture];

  // coloured boxes, popping in when closed and bobbing once the picture is done
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const t = s.boxes[j * COLS + i];
      if (t < 0) continue;
      const age = s.clock - t;
      let k = age < 0.25 ? 1 + Math.sin((age / 0.25) * Math.PI) * 0.15 - (1 - age / 0.25) * 0.4 : 1;
      if (s.phase === 'show') k *= 1 + Math.max(0, Math.sin((s.timer * 3 - (i + j) * 0.15) * Math.PI)) * 0.08 * Math.max(0, 1 - s.timer / SHOW_TIME);
      const color = colorOf(pic[j][i]);
      const cx = dotX(i) + gs / 2, cy = dotY(j) + gs / 2, half = (gs / 2 - 2) * k;
      ctx.save();
      ctx.globalAlpha = fade;
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(cx - half + 1, cy - half + 1, half * 2, half * 2);
      } else {
        // blank cells get a light pencil hatch so they read as finished
        ctx.strokeStyle = theme.ink;
        ctx.globalAlpha = fade * 0.15;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let q = -1; q <= 1; q++) {
          const o = q * half * 0.5;
          ctx.moveTo(cx - half * 0.4 + o, cy + half * 0.4);
          ctx.lineTo(cx + half * 0.4 + o, cy - half * 0.4);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // pencil lines
  const lines = new Path2D();
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      if (!s.h[j * COLS + i]) continue;
      lines.moveTo(dotX(i), dotY(j));
      wline(lines, dotX(i), dotY(j), dotX(i + 1), dotY(j), j * 13 + i * 7 + s.picture * 101);
    }
  }
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      if (!s.v[j * (COLS + 1) + i]) continue;
      lines.moveTo(dotX(i), dotY(j));
      wline(lines, dotX(i), dotY(j), dotX(i), dotY(j + 1), j * 17 + i * 5 + s.picture * 103 + 500);
    }
  }
  sketch(ctx, lines, { width: 2, alpha: fade });

  // the line still following the finger
  if (pen) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(dotX(pen.i), dotY(pen.j));
    ctx.lineTo(pen.x, pen.y);
    ctx.stroke();
    ctx.restore();
  }

  // dots
  ctx.fillStyle = theme.ink;
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      const r = 2.6 + hash(i * 31 + j * 7) * 0.8;
      const active = pen && pen.i === i && pen.j === j;
      ctx.beginPath();
      ctx.arc(dotX(i), dotY(j), active ? r * 1.8 : r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
