/**
 * EVOLUTION MACHINE — observation chamber (STAGE 2 interface).
 * Reads simulation state; changes it only through setEnvironment / introduce / restore.
 */
import {
  Simulation, makeConfig, Clock, randomGenome, Rng, traitHistogram, DEFAULT_CONFIG, TRAITS,
  T_SIZE, T_SPEED, T_SENSE, T_REPRO, T_INVEST, sampleNow, type Organism,
} from '../sim';
import { Camera } from './camera';
import { Field } from './field';
import { Creatures, portrait } from './creatures';
import { parseSeed, tickPosition, extinctionTick } from './observation';
import { coloursOf, pigmentCss } from './palette';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fieldCv = $<HTMLCanvasElement>('field');
const lifeCv = $<HTMLCanvasElement>('life');
const field = new Field(fieldCv);
const life = new Creatures(lifeCv);
const cam = new Camera();
const clock = new Clock(30, 4000);

const params = new URLSearchParams(location.search);
const randomSeed = () => (Math.random() * 1e6) | 0;
let sim = new Simulation(makeConfig({ seed: parseSeed(params.get('seed'), randomSeed) }));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let selected = -1, hover = -1, following = false;
let lastSeen: Organism | null = null;
let placing: null | 'random' | 'clone' = null;
let animTime = 0;
const dpr = () => Math.min(2, window.devicePixelRatio || 1);

const FUNCTIONAL = [T_SIZE, T_SPEED, T_SENSE, T_REPRO, T_INVEST];
const LABEL: Record<number, string> = {
  [T_SIZE]: 'Size', [T_SPEED]: 'Top speed', [T_SENSE]: 'Sensing range', [T_REPRO]: 'Breeds at', [T_INVEST]: 'Gives offspring',
};
const fmt = (i: number, v: number) => (i === T_REPRO || i === T_INVEST ? `${Math.round(v * 100)}%` : v < 10 ? v.toFixed(2) : v.toFixed(0));

// ---------------------------------------------------------------- charts
function line(cv: HTMLCanvasElement, series: { v: number[]; min: number; max: number; color: string; fill?: string; width?: number }[], marks: number[] = [], ticks: number[] = []) {
  const d = dpr(), w = cv.clientWidth, h = cv.clientHeight;
  if (!w) return;
  if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
  const g = cv.getContext('2d')!;
  g.setTransform(d, 0, 0, d, 0, 0);
  g.clearRect(0, 0, w, h);
  g.strokeStyle = 'rgba(42,23,69,.1)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, h - 0.5); g.lineTo(w, h - 0.5); g.stroke();
  g.strokeStyle = 'rgba(239,139,69,.7)';
  for (const m of marks) { g.beginPath(); g.moveTo(m * w, h); g.lineTo(m * w, h - 8); g.stroke(); }
  for (const s of series) {
    const n = s.v.length;
    if (n < 2) continue;
    const y = (v: number) => h - 2 - ((v - s.min) / (s.max - s.min || 1)) * (h - 6);
    const xAt = (i: number) => (ticks.length === n ? tickPosition(ticks[i], ticks[0], ticks[n - 1]) : i / (n - 1)) * w;
    g.beginPath();
    for (let i = 0; i < n; i++) { const x = xAt(i); i ? g.lineTo(x, y(s.v[i])) : g.moveTo(x, y(s.v[i])); }
    if (s.fill) {
      g.save(); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = s.fill; g.fill(); g.restore();
      g.beginPath();
      for (let i = 0; i < n; i++) { const x = xAt(i); i ? g.lineTo(x, y(s.v[i])) : g.moveTo(x, y(s.v[i])); }
    }
    g.strokeStyle = s.color;
    g.lineWidth = s.width ?? 1.4;
    g.lineJoin = 'round';
    g.stroke();
  }
}

/** Population distribution of a trait as a soft strip, with one individual marked. */
function strip(cv: HTMLCanvasElement, trait: number, value: number) {
  const d = dpr(), w = cv.clientWidth, h = cv.clientHeight;
  if (!w) return;
  if (cv.width !== w * d) { cv.width = w * d; cv.height = h * d; }
  const g = cv.getContext('2d')!;
  g.setTransform(d, 0, 0, d, 0, 0);
  g.clearRect(0, 0, w, h);
  const t = TRAITS[trait], bins = 28;
  const hist = traitHistogram(sim, trait, bins, t.min, t.max);
  const max = Math.max(1, ...hist);
  g.fillStyle = 'rgba(111,191,214,.55)';
  for (let i = 0; i < bins; i++) {
    const bh = (hist[i] / max) * (h - 6);
    g.fillRect((i / bins) * w + 0.5, h - 3 - bh, w / bins - 1, bh);
  }
  g.fillStyle = 'rgba(42,23,69,.15)';
  g.fillRect(0, h - 2, w, 1);
  const x = ((value - t.min) / (t.max - t.min)) * w;
  g.fillStyle = '#2a1745';
  g.beginPath(); g.arc(Math.min(w - 3, Math.max(3, x)), h - 2.5, 3, 0, Math.PI * 2); g.fill();
}

// ---------------------------------------------------------------- notes panel
const traitRows = $('trait-rows');
traitRows.innerHTML = FUNCTIONAL.map((i) =>
  `<div class="trow"><div class="name">${LABEL[i]}</div><canvas id="tr-${i}"></canvas><div class="val" id="tv-${i}"></div></div>`).join('');

function updateNotes() {
  const h = sim.history, last = h[h.length - 1];
  const current = sampleNow(sim);
  const ticks = h.map(s => s.tick);
  const span = Math.max(1, last.span);
  const stats: [string, string][] = [
    [String(sim.orgs.length), 'living now'],
    [last.meanGeneration.toFixed(1), 'mean generation'],
    [Number.isFinite(last.meanParentAge) ? Math.round(last.meanParentAge).toString() : '—', 'ticks per generation'],
    [String(last.founderLineages), 'founding lineages left'],
    [`${(current.resourceFrac * 100).toFixed(1)}%`, 'resource / fertile capacity now'],
    [current.population ? `${(current.meanEnergyFrac * 100).toFixed(1)}%` : '—', 'mean energy / body capacity now'],
    [Math.round((last.births / span) * 1000).toString(), 'births per 1000 ticks'],
    [Math.round((last.deaths / span) * 1000).toString(), 'deaths per 1000 ticks'],
  ];
  $('stats').innerHTML = stats.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
  const t0 = h[0].tick, t1 = Math.max(t0 + 1, last.tick);
  const marks = sim.events.filter((e) => e.tick >= t0 && e.tick <= last.tick && e.type !== 'extinction').map((e) => tickPosition(e.tick, t0, t1));
  const pops = h.map((s) => s.population);
  line($('c-pop') as HTMLCanvasElement, [
    { v: h.map((s) => s.resourceFrac), min: 0, max: 1, color: '#6fbfd6', fill: 'rgba(111,191,214,.16)' },
    { v: pops, min: 0, max: Math.max(100, ...pops) * 1.1, color: '#2a1745', width: 1.6 },
  ], marks, ticks);
  $('pop-scale').textContent = `Ticks ${t0.toLocaleString()}–${last.tick.toLocaleString()} · population 0–${Math.ceil(Math.max(100, ...pops) * 1.1)} · resource 0–100%. Latest recorded sample: tick ${last.tick.toLocaleString()}.`;
  for (const i of FUNCTIONAL) {
    const t = TRAITS[i];
    const v = h.map((s) => s.traitMean[i]);
    // auto-range, but never narrower than 15 % of the gene's range, so noise is not drawn as a trend
    const lo = Math.min(...v), hi = Math.max(...v), mid = (lo + hi) / 2, half = Math.max((hi - lo) / 2 * 1.15, (t.max - t.min) * 0.075);
    const range = `${fmt(i, mid - half)}–${fmt(i, mid + half)}`;
    line($(`tr-${i}`) as HTMLCanvasElement, [{ v, min: mid - half, max: mid + half, color: '#2a1745' }], [], ticks);
    $(`tv-${i}`).innerHTML = last.population ? `${fmt(i, last.traitMean[i])}<small>± ${fmt(i, last.traitSd[i])} SD</small><small>scale ${range}</small>` : '—';
  }
  const tv = h.map((s) => s.traitGeneVar), bv = h.map((s) => s.brainGeneVar);
  line($('c-div') as HTMLCanvasElement, [
    { v: tv, min: 0, max: Math.max(0.05, ...tv), color: '#2a1745' },
    { v: bv, min: 0, max: Math.max(0.05, ...bv), color: '#ef8b45' },
  ], [], ticks);
  $('div-scale').textContent = `Raw gene variance; body scale 0–${Math.max(0.05, ...tv).toFixed(3)}, controller scale 0–${Math.max(0.05, ...bv).toFixed(3)}. Latest: ${last.population ? `${last.traitGeneVar.toFixed(3)} / ${last.brainGeneVar.toFixed(3)}` : 'no living population'}.`;
  const ev = sim.events.slice(-7).reverse();
  $('events').replaceChildren();
  for (const e of ev.length ? ev : [null]) {
    const li = document.createElement('li'), tick = document.createElement('span');
    tick.textContent = e ? e.tick.toLocaleString() : '—';
    li.append(tick, document.createTextNode(e ? describe(e.type, e.detail) : 'No interventions yet. The world is running on its own.'));
    $('events').appendChild(li);
  }
}
function describe(type: string, detail: string): string {
  if (type === 'extinction') return 'The last organism died.';
  if (type === 'introduction') return `A newcomer was released (${detail}).`;
  try {
    const p = JSON.parse(detail);
    const parts: string[] = [];
    if (p.regrowthRate !== undefined) parts.push(`productivity ×${(p.regrowthRate / DEFAULT_CONFIG.env.regrowthRate).toFixed(2)}`);
    if (p.cellCapacity !== undefined) parts.push(`richness ${p.cellCapacity}`);
    return `Climate changed: ${parts.join(', ')}.`;
  } catch { return detail; }
}

// ---------------------------------------------------------------- specimen card
const specTraits = $('spec-traits');
specTraits.innerHTML = FUNCTIONAL.map((i) =>
  `<div class="trait"><span>${LABEL[i]}</span><canvas id="st-${i}"></canvas><span class="v" id="sv-${i}"></span></div>`).join('') +
  `<div class="trait"><span>Lineage colour</span><span id="st-hue"></span><span class="v">neutral</span></div>`;

function select(id: number) {
  selected = id;
  following = following && id >= 0;
  $('specimen').hidden = id < 0;
  $('specimen').classList.remove('dead');
  lastSeen = sim.orgs.find((o) => o.id === id) ?? null;
  updateSpecimen();
}
function updateSpecimen() {
  if (selected < 0) return;
  const o = sim.orgs.find((x) => x.id === selected);
  const dead = !o;
  if (o) lastSeen = o;
  const s = lastSeen;
  if (!s) return;
  $('specimen').classList.toggle('dead', dead);
  $('spec-kicker').textContent = dead ? 'Specimen · deceased' : s.parentId < 0 ? 'Specimen · founder' : 'Specimen';
  $('spec-title').textContent = `No. ${s.id.toLocaleString()}`;
  $('spec-lineage').textContent = s.parentId < 0
    ? (s.founderId === s.id && s.birthTick > 0 ? 'Released into the chamber' : 'One of the founders')
    : `Generation ${s.generation} of founder ${s.founderId} · child of ${s.parentId}`;
  const e = s.energy / s.ph.capacity;
  $('spec-vitals').innerHTML = [
    [`${s.age.toLocaleString()}`, 'ticks old'],
    [`${s.offspring}`, 'offspring'],
    [`${(o ? o.speed : 0).toFixed(2)}`, 'world units / tick'],
    [`${Math.round(e * 100)}%<div class="bar"><i style="width:${Math.min(100, e * 100)}%"></i></div>`, 'energy reserve'],
  ].map(([b, l]) => `<div><b>${b}</b><span>${l}</span></div>`).join('');
  for (const i of FUNCTIONAL) {
    strip($(`st-${i}`) as HTMLCanvasElement, i, s.ph.traits[i]);
    $(`sv-${i}`).textContent = fmt(i, s.ph.traits[i]);
  }
  const { warm, cool } = coloursOf(s.ph.traits);
  $('st-hue').innerHTML = `<i class="swatch" style="background:${pigmentCss(cool)}"></i><i class="swatch" style="background:${pigmentCss(warm)}"></i>`;
  ($('spec-follow') as HTMLButtonElement).classList.toggle('on', following);
  ($('spec-follow') as HTMLButtonElement).disabled = dead;
  if (dead) { $('spec-lineage').textContent += ` · died at ${s.age.toLocaleString()} ticks`; following = false; }
}
$('spec-close').onclick = () => select(-1);
$('spec-follow').onclick = () => { following = !following; if (!following) cam.zoom = Math.max(1, cam.zoom); updateSpecimen(); };
$('spec-clone').onclick = () => setPlacing('clone');

// ---------------------------------------------------------------- climate, placement, files
const prod = $<HTMLInputElement>('i-prod'), rich = $<HTMLInputElement>('i-rich');
function syncClimate() {
  const p = sim.env.regrowthRate / DEFAULT_CONFIG.env.regrowthRate;
  prod.value = String(p);
  rich.value = String(sim.env.cellCapacity);
  $('o-prod').textContent = `×${p.toFixed(2)}`;
  $('o-rich').textContent = sim.env.cellCapacity.toFixed(1);
}
prod.oninput = () => { $('o-prod').textContent = `×${Number(prod.value).toFixed(2)}`; };
rich.oninput = () => { $('o-rich').textContent = Number(rich.value).toFixed(1); };
prod.onchange = () => {
  const p = Number(prod.value);
  sim.setEnvironment({ regrowthRate: DEFAULT_CONFIG.env.regrowthRate * p, influx: DEFAULT_CONFIG.env.influx * p });
  updateNotes();
};
rich.onchange = () => { sim.setEnvironment({ cellCapacity: Number(rich.value) }); updateNotes(); };

function setPlacing(mode: typeof placing) {
  placing = mode;
  lifeCv.classList.toggle('placing', !!mode);
  const t = $('toast');
  t.hidden = !mode;
  if (mode) t.textContent = mode === 'clone' ? `Click to place a clone of No. ${selected} · Esc to cancel` : 'Click to release a random newcomer · Esc to cancel';
}
$('b-release').onclick = () => setPlacing('random');

function load(next: Simulation) {
  sim = next;
  clock.reset();
  setPlacing(null);
  hover = -1;
  animTime = 0;
  life.reset();
  select(-1);
  following = false;
  cam.reset();
  resize();
  syncClimate();
  updateNotes();
  history.replaceState(null, '', `?seed=${sim.cfg.seed}`);
}
const confirmReplace = () => window.confirm('Replace this world? Unsaved progress and interventions will be lost. Save first if you want to continue this experiment later.');
function newWorld() { if (confirmReplace()) load(new Simulation(makeConfig({ seed: randomSeed() }))); }
$('b-new').onclick = newWorld;
$('b-ext-new').onclick = newWorld;
$('b-ext-release').onclick = () => {
  const rng = new Rng(randomSeed());
  for (let i = 0; i < 40; i++) sim.introduce(randomGenome(rng, 0.5, 1), rng.next() * sim.cfg.width, rng.next() * sim.cfg.height);
};
$('b-save').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(sim.snapshot())], { type: 'application/json' }));
  a.download = `evolution-seed${sim.cfg.seed}-tick${sim.tick}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('b-load').onclick = () => $('f-load').click();
$<HTMLInputElement>('f-load').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const next = Simulation.restore(JSON.parse(await file.text()));
    if (!next.history.length || !Number.isFinite(next.tick)) throw new Error('Missing observation history or tick');
    if (confirmReplace()) load(next);
  }
  catch (err) { alert('Could not open this snapshot: ' + err); }
  finally { (e.target as HTMLInputElement).value = ''; }
};

// ---------------------------------------------------------------- transport
const SPEEDS = [1, 4, 16, 64];
let speed = 1, paused = false;
SPEEDS.forEach((s) => {
  const b = document.createElement('button');
  b.textContent = `×${s}`;
  b.setAttribute('aria-label', `Target speed ${s} times (${30 * s} ticks per second)`);
  b.onclick = () => { speed = s; paused = false; applySpeed(); };
  $('speeds').appendChild(b);
});
function applySpeed() {
  clock.paused = paused;
  clock.ticksPerSecond = 30 * speed;
  Array.from($('speeds').children).forEach((b, i) => { b.classList.toggle('on', SPEEDS[i] === speed && !paused); b.setAttribute('aria-pressed', String(SPEEDS[i] === speed && !paused)); });
  $('b-play').textContent = paused ? '▶' : '❚❚';
  $('b-play').setAttribute('aria-label', paused ? 'Play' : 'Pause');
}
$('b-play').onclick = () => { paused = !paused; applySpeed(); };
$('b-zin').onclick = () => cam.zoomAt(cam.vw / 2, cam.vh / 2, cam.zoom * 1.5);
$('b-zout').onclick = () => cam.zoomAt(cam.vw / 2, cam.vh / 2, cam.zoom / 1.5);

const climate = $('climate');
$('climate-toggle').onclick = () => { const open = climate.classList.toggle('open'); $('climate-toggle').setAttribute('aria-expanded', String(open)); };

const notes = $('notes');
function toggleNotes(open = !notes.classList.contains('open')) {
  notes.classList.toggle('open', open);
  notes.setAttribute('aria-hidden', String(!open));
  notes.inert = !open;
  $('notes-toggle').setAttribute('aria-expanded', String(open));
  if (open) updateNotes();
  (open ? $('notes-close') : $('notes-toggle')).focus();
}
$('notes-toggle').onclick = () => toggleNotes();
$('notes-close').onclick = () => toggleNotes(false);

// ---------------------------------------------------------------- pointer
let down: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
const local = (e: PointerEvent | WheelEvent) => { const r = lifeCv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const pickRadius = () => Math.max(6, 16 / cam.s);
lifeCv.addEventListener('pointerdown', (e) => {
  const [x, y] = local(e);
  down = { x, y, cx: cam.x, cy: cam.y, moved: false };
  lifeCv.setPointerCapture(e.pointerId);
});
lifeCv.addEventListener('pointermove', (e) => {
  const [x, y] = local(e);
  if (down) {
    if (!down.moved && Math.hypot(x - down.x, y - down.y) > 5) { down.moved = true; following = false; lifeCv.classList.add('dragging'); }
    if (down.moved) { cam.x = down.cx - (x - down.x) / cam.s; cam.y = down.cy - (y - down.y) / cam.s; cam.clamp(); }
    return;
  }
  const [wx, wy] = cam.toWorld(x, y);
  hover = sim.organismAt(wx, wy, pickRadius())?.id ?? -1;
  lifeCv.classList.toggle('over', hover >= 0 && !placing);
});
lifeCv.addEventListener('pointerup', (e) => {
  lifeCv.classList.remove('dragging');
  if (!down) return;
  const moved = down.moved;
  down = null;
  if (moved) return;
  const [x, y] = local(e);
  const [wx, wy] = cam.toWorld(x, y);
  if (wx < 0 || wy < 0 || wx > sim.cfg.width || wy > sim.cfg.height) { if (!placing) select(-1); return; }
  if (placing) {
    const src = placing === 'clone' ? (sim.orgs.find((o) => o.id === selected) ?? lastSeen) : null;
    const o = sim.introduce(src ? src.genome : randomGenome(new Rng(randomSeed()), 0.5, 1), wx, wy);
    setPlacing(null);
    select(o.id);
    return;
  }
  select(sim.organismAt(wx, wy, pickRadius())?.id ?? -1);
});
lifeCv.addEventListener('pointerleave', () => { hover = -1; });
lifeCv.addEventListener('pointercancel', () => { down = null; lifeCv.classList.remove('dragging'); });
lifeCv.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [x, y] = local(e);
  following = false;
  cam.zoomAt(x, y, cam.zoom * Math.exp(-e.deltaY * 0.0015));
}, { passive: false });

window.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('input, textarea, select, [contenteditable="true"]') || e.altKey || e.ctrlKey || e.metaKey) return;
  // Preserve native Space/Enter activation on focused controls.
  if (e.code === 'Space' && target.closest('button, a')) return;
  if (e.code === 'Space') { paused = !paused; applySpeed(); e.preventDefault(); }
  else if (e.key >= '1' && e.key <= '4') { speed = SPEEDS[Number(e.key) - 1]; paused = false; applySpeed(); }
  else if (e.key === 'n' || e.key === 'N') toggleNotes();
  else if ((e.key === 'f' || e.key === 'F') && selected >= 0 && sim.orgs.some(o => o.id === selected)) { following = !following; updateSpecimen(); }
  else if (e.key === '[' || e.key === ']') {
    const i = sim.orgs.findIndex(o => o.id === selected), n = sim.orgs.length;
    if (n) { const o = sim.orgs[(i + (e.key === ']' ? 1 : n - 1) + n) % n]; select(o.id); cam.x = o.x; cam.y = o.y; cam.clamp(); }
    e.preventDefault();
  }
  else if (e.key === 'Escape') { if (placing) setPlacing(null); else if (notes.classList.contains('open')) toggleNotes(false); else select(-1); }
  wake();
});

// idle: chrome fades away while the visitor just watches
let idleTimer = 0;
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (!notes.classList.contains('open') && !placing && !document.activeElement?.closest('button, a, input, #notes')) document.body.classList.add('idle');
  }, 7000);
}
['pointermove', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
window.addEventListener('focusin', wake);

function resize() {
  cam.resize(window.innerWidth, window.innerHeight, sim.cfg.width, sim.cfg.height);
}
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- main loop
let lastT = performance.now(), lastPanel = 0, frameMs = 0;
let rateStart = lastT, rateTicks = 0, actualRate = 0;
document.addEventListener('visibilitychange', () => { lastT = performance.now(); rateStart = lastT; rateTicks = 0; });
function frame(now: number) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  if (document.hidden) { requestAnimationFrame(frame); return; }
  const before = sim.tick;
  let n = clock.advance(dt);
  const deadline = performance.now() + 11;
  while (n > 1 && performance.now() < deadline) { const k = Math.min(n - 1, 8); sim.step(k); n -= k; }
  if (n >= 1) { life.capturePrev(sim); sim.step(1); }
  const live = paused ? 0 : dt;
  life.sync(sim, speed <= 16 && !reducedMotion.matches, live);
  animTime += live;
  rateTicks += sim.tick - before;
  if (now - rateStart >= 1000) { actualRate = rateTicks * 1000 / (now - rateStart); rateTicks = 0; rateStart = now; }

  if (following && selected >= 0) {
    const v = life.vis.get(selected);
    if (v) {
      const z = Math.max(cam.zoom, 2.6);
      cam.zoom += (z - cam.zoom) * 0.06;
      cam.x += (v.lx - cam.x) * 0.08;
      cam.y += (v.ly - cam.y) * 0.08;
      cam.clamp();
    }
  }
  const alpha = paused ? 1 : Math.min(1, clock.phase);
  const visualTime = reducedMotion.matches ? 0 : animTime;
  field.render(sim, cam, visualTime, dpr());
  life.render(sim, cam, alpha, visualTime, reducedMotion.matches ? 0 : live, dpr(), selected, hover);

  if (now - lastPanel > 300) {
    lastPanel = now;
    $('caption').textContent = `Chamber ${sim.cfg.seed} · ${sim.tick.toLocaleString()} ticks · ${sim.orgs.length} living`;
    $('clock').textContent = `${sim.tick.toLocaleString()} t`;
    $('pace').textContent = `${paused ? 'Paused' : `Target ${30 * speed} ticks/s · actual ${Math.round(actualRate)} ticks/s`} · frame CPU ${frameMs.toFixed(1)} ms (smoothed, excludes GPU / display wait)`;
    if (notes.classList.contains('open')) updateNotes();
    updateSpecimen();
    const extinct = sim.orgs.length === 0;
    $('extinct').hidden = !extinct;
    if (extinct) { const tick = extinctionTick(sim.events); $('extinct-title').textContent = tick === undefined ? 'No living organisms' : `Extinct at tick ${tick.toLocaleString()}`; }
  }
  if (selected >= 0 && lastSeen) portrait($('spec-portrait') as HTMLCanvasElement, lastSeen, sim.cfg.sensorAngle, lastSeen.alive ? visualTime : 0);
  frameMs = frameMs * 0.9 + (performance.now() - now) * 0.1;
  requestAnimationFrame(frame);
}

(window as any).__sim = () => sim; // researcher console access
(window as any).__frameMs = () => frameMs;
load(sim);
applySpeed();
wake();
requestAnimationFrame(frame);
