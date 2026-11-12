/**
 * Diagnostic viewer. Reads simulation state, never writes it except through
 * the public intervention API (setEnvironment / introduce / restore).
 * Everything drawn is data:
 *   field  blue = resource present, peach = fertile but grazed, cream = barren
 *   body   radius = size, elongation = maxSpeed, antennae = senseRange,
 *          warm / cool colours = neutral markers A / B, nucleus = energy reserve
 */
import {
  Simulation, makeConfig, Clock, TRAITS, T_SPEED, T_SENSE, T_MARKER_A, T_MARKER_B,
  randomGenome, Rng, type Organism,
} from '../sim';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('world');
const ctx = canvas.getContext('2d')!;
const TAU = Math.PI * 2;

let sim = new Simulation(makeConfig({ seed: (Date.now() % 100000) | 0 }));
const clock = new Clock(60, 4000);
let selectedId = -1;
let scale = 1;

// --- resource field -------------------------------------------------------
const field = document.createElement('canvas');
let fieldCtx = field.getContext('2d')!;
let fieldImg: ImageData;
function initField() {
  field.width = sim.cols;
  field.height = sim.rows;
  fieldCtx = field.getContext('2d')!;
  fieldImg = fieldCtx.createImageData(sim.cols, sim.rows);
}
const CREAM = [249, 244, 234], PEACH = [246, 205, 166], BLUE = [150, 213, 228], DEEP = [104, 190, 214];
function drawField() {
  const d = fieldImg.data, res = sim.resource, fert = sim.fertility, cap = sim.env.cellCapacity;
  for (let i = 0; i < res.length; i++) {
    const f = Math.max(0, (fert[i] - 0.2) / 0.8);
    const w = Math.min(1, res[i] / cap);
    const k = Math.min(1, w * 1.6), k2 = Math.max(0, w - 0.55) / 0.45;
    for (let c = 0; c < 3; c++) {
      let v = CREAM[c] + (PEACH[c] - CREAM[c]) * f;
      v += (BLUE[c] - v) * k;
      v += (DEEP[c] - v) * k2;
      d[i * 4 + c] = v;
    }
    d[i * 4 + 3] = 255;
  }
  fieldCtx.putImageData(fieldImg, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(field, 0, 0, sim.cfg.width, sim.cfg.height);
}

// --- organisms ------------------------------------------------------------
function drawOrganism(o: Organism, selected: boolean) {
  const t = o.ph.traits;
  const sp = t[T_SPEED] / TRAITS[T_SPEED].max;
  const a = o.ph.radius * (1 + 0.55 * sp), b = o.ph.radius * (1 - 0.2 * sp);
  const e = Math.min(1, o.energy / o.ph.capacity);
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.heading);
  // antennae: the three sensor rays, drawn at 30% of their true length
  const len = t[T_SENSE] * 0.3, sa = sim.cfg.sensorAngle;
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = 'rgba(70,110,150,.6)';
  ctx.fillStyle = '#ef8a45';
  for (const ang of [-sa, 0, sa]) {
    const cx = Math.cos(ang), cy = Math.sin(ang);
    const x0 = cx * a * 0.85, y0 = cy * b * 0.85, x1 = x0 + cx * len, y1 = y0 + cy * len;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 - cy * len * 0.18, (y0 + y1) / 2 + cx * len * 0.18, x1, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x1, y1, 0.9, 0, TAU);
    ctx.fill();
  }
  if (selected) {
    // true sensor reach
    ctx.strokeStyle = 'rgba(46,26,71,.35)';
    ctx.setLineDash([2, 3]);
    for (const ang of [-sa, 0, sa]) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * t[T_SENSE], Math.sin(ang) * t[T_SENSE]); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  const g = ctx.createLinearGradient(-a, -b, a, b);
  g.addColorStop(0, `hsl(${196 + t[T_MARKER_B] * 40},62%,68%)`);
  g.addColorStop(0.45, `hsl(${196 + t[T_MARKER_B] * 40},62%,72%)`);
  g.addColorStop(1, `hsl(${14 + t[T_MARKER_A] * 28},86%,63%)`);
  ctx.beginPath();
  ctx.ellipse(0, 0, a, b, 0, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = selected ? 1.6 : 0.8;
  ctx.strokeStyle = selected ? '#2e1a47' : 'rgba(255,255,255,.85)';
  ctx.stroke();
  // nucleus grows with the energy reserve
  const k = 0.3 + 0.7 * e;
  ctx.beginPath();
  ctx.ellipse(-a * 0.08, 0, a * 0.5 * k, b * 0.42 * k, 0.5, 0, TAU);
  ctx.fillStyle = '#2e1a47';
  ctx.fill();
  ctx.restore();
}

function resize() {
  const stage = canvas.parentElement!;
  const pw = stage.clientWidth - 36, phh = stage.clientHeight - 36;
  const s = Math.max(0.1, Math.min(pw / sim.cfg.width, phh / sim.cfg.height));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = `${sim.cfg.width * s}px`;
  canvas.style.height = `${sim.cfg.height * s}px`;
  canvas.width = Math.round(sim.cfg.width * s * dpr);
  canvas.height = Math.round(sim.cfg.height * s * dpr);
  scale = s * dpr;
}

function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawField();
  for (const o of sim.orgs) if (o.id !== selectedId) drawOrganism(o, false);
  const sel = sim.orgs.find((o) => o.id === selectedId);
  if (sel) drawOrganism(sel, true);
}

// --- panel ----------------------------------------------------------------
const TRAIT_COLORS = ['#2e1a47', '#f0924a', '#4fa9c9', '#b58bd6', '#8fb56a'];
$('trait-legend').innerHTML = TRAIT_COLORS.map((c, i) => `<span><i style="background:${c}"></i>${TRAITS[i].name}</span>`).join('');

function chart(id: string, series: { color: string; values: number[]; min: number; max: number }[]) {
  const c = $<HTMLCanvasElement>(id);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
  const g = c.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  g.lineWidth = 1.4;
  g.lineJoin = 'round';
  for (const s of series) {
    const n = s.values.length;
    if (n < 2) continue;
    g.strokeStyle = s.color;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * (w - 2) + 1;
      const y = h - 3 - ((s.values[i] - s.min) / (s.max - s.min || 1)) * (h - 6);
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
}

function updatePanel() {
  const h = sim.history, last = h[h.length - 1];
  $('s-pop').textContent = String(sim.orgs.length);
  $('s-tick').textContent = sim.tick.toLocaleString();
  $('s-gen').textContent = last.meanGeneration.toFixed(1);
  $('s-res').textContent = last.resourceFrac.toFixed(2);
  const pops = h.map((s) => s.population);
  chart('c-pop', [
    { color: '#7cc6dc', values: h.map((s) => s.resourceFrac), min: 0, max: 1 },
    { color: '#2e1a47', values: pops, min: 0, max: Math.max(50, ...pops) },
  ]);
  chart('c-traits', TRAIT_COLORS.map((color, i) => ({ color, values: h.map((s) => s.traitMean[i]), min: TRAITS[i].min, max: TRAITS[i].max })));
  const o = sim.orgs.find((x) => x.id === selectedId);
  if (o) {
    const rows: [string, string][] = [
      ['id / parent', `${o.id} / ${o.parentId < 0 ? 'founder' : o.parentId}`],
      ['generation · founder', `${o.generation} · ${o.founderId}`],
      ['age · offspring', `${o.age} · ${o.offspring}`],
      ['energy', `${o.energy.toFixed(1)} / ${o.ph.capacity.toFixed(1)}`],
      ['speed now', o.speed.toFixed(2)],
      ...TRAITS.map((t, i) => [t.name, o.ph.traits[i].toFixed(2)] as [string, string]),
    ];
    $('inspect').innerHTML = '<table>' + rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('') + '</table>';
  } else if (selectedId >= 0) {
    $('inspect').innerHTML = `<span class="hint">Organism ${selectedId} has died.</span>`;
  }
  if (!sim.orgs.length) $('s-pop').textContent = 'extinct';
}

function syncControls() {
  const r = $<HTMLInputElement>('i-regrow'), c = $<HTMLInputElement>('i-cap');
  r.value = String(sim.env.regrowthRate); c.value = String(sim.env.cellCapacity);
  $('o-regrow').textContent = sim.env.regrowthRate.toFixed(4);
  $('o-cap').textContent = sim.env.cellCapacity.toFixed(1);
  $('seed').textContent = `seed ${sim.cfg.seed} · ${sim.cfg.width}×${sim.cfg.height}`;
}
$<HTMLInputElement>('i-regrow').addEventListener('change', (e) => {
  // influx scales with regrowth so the two stay in the default 3:1 proportion
  const v = Number((e.target as HTMLInputElement).value);
  sim.setEnvironment({ regrowthRate: v, influx: v / 3 });
  syncControls();
});
$<HTMLInputElement>('i-cap').addEventListener('change', (e) => {
  sim.setEnvironment({ cellCapacity: Number((e.target as HTMLInputElement).value) });
  syncControls();
});

const SPEEDS: [string, number][] = [['Pause', 0], ['1×', 60], ['4×', 240], ['16×', 960], ['Max', 60000]];
let speedIdx = 1;
SPEEDS.forEach(([label], i) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => { speedIdx = i; applySpeed(); };
  $('speeds').appendChild(b);
});
function applySpeed() {
  clock.paused = SPEEDS[speedIdx][1] === 0;
  if (!clock.paused) clock.ticksPerSecond = SPEEDS[speedIdx][1];
  Array.from($("speeds").children).forEach((b, i) => b.classList.toggle('on', i === speedIdx));
}

function load(next: Simulation) {
  sim = next;
  selectedId = -1;
  initField();
  resize();
  syncControls();
  $('inspect').innerHTML = '<span class="hint">Click an organism to inspect it. Shift-click the chamber to introduce a copy of the inspected organism (or a random one).</span>';
}
$('b-new').onclick = () => load(new Simulation(makeConfig({ seed: (Math.random() * 1e6) | 0 })));
$('b-save').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(sim.snapshot())], { type: 'application/json' }));
  a.download = `evolution-seed${sim.cfg.seed}-tick${sim.tick}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};
$('b-load').onclick = () => $('f-load').click();
$<HTMLInputElement>('f-load').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try { load(Simulation.restore(JSON.parse(await file.text()))); }
  catch (err) { alert('Could not load snapshot: ' + err); }
};

canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * sim.cfg.width, y = ((e.clientY - r.top) / r.height) * sim.cfg.height;
  if (e.shiftKey) {
    const src = sim.orgs.find((o) => o.id === selectedId);
    const o = sim.introduce(src ? src.genome : randomGenome(new Rng((Math.random() * 1e9) | 0), 0.5, 1), x, y);
    selectedId = o.id;
  } else {
    selectedId = sim.organismAt(x, y, 24)?.id ?? -1;
  }
  updatePanel();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { speedIdx = speedIdx === 0 ? 1 : 0; applySpeed(); e.preventDefault(); }
});
window.addEventListener('resize', resize);

// --- main loop ------------------------------------------------------------
let lastT = performance.now(), lastPanel = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  let n = clock.advance(dt);
  const deadline = performance.now() + 12; // keep rendering responsive at high speeds
  while (n > 0 && performance.now() < deadline) { const k = Math.min(n, 8); sim.step(k); n -= k; }
  render();
  if (now - lastPanel > 250) { updatePanel(); lastPanel = now; }
  requestAnimationFrame(frame);
}
(window as any).__sim = () => sim; // console access for researchers
load(sim);
applySpeed();
requestAnimationFrame(frame);
