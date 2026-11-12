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
import { coloursOf, pigmentCss, TYPE_COLOURS } from './palette';
import { Laboratory } from './laboratory';
import { confirmAction, showNotice } from './dialog';
import { ObserverPane } from './observer-ui';
import { particleCounts } from './anatomy';

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
let laboratory: Laboratory;
let researching = false;
let dialogOpen = false;
let observer: ObserverPane | undefined;
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
    const path = () => { let pen = false; for (let i = 0; i < n; i++) { if (!Number.isFinite(s.v[i])) { pen = false; continue; } const x = xAt(i); if (pen) g.lineTo(x,y(s.v[i])); else g.moveTo(x,y(s.v[i])); pen = true; } };
    g.beginPath();
    path();
    if (s.fill) {
      g.save(); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = s.fill; g.fill(); g.restore();
      g.beginPath();
      path();
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
  const typeMax = Math.max(10, ...h.flatMap(s => s.typePop ?? []));
  line($<HTMLCanvasElement>('c-types'), [0,1,2].map(t => ({ v: h.map(s => s.typePop?.[t] ?? NaN), min: 0, max: typeMax, color: TYPE_COLOURS[t] })), [], ticks);
  $('type-scale').textContent = `Population scale 0–${typeMax}; ticks ${t0}–${last.tick}. Orange: forager; teal: grazer; pink: generalist. Missing legacy data is not reconstructed.`;
  $('type-stats').replaceChildren();
  for (let t = 0; t < 3; t++) {
    const row = document.createElement('div'); row.className = 'type-stat'; row.style.borderColor = TYPE_COLOURS[t];
    const rate = (a?: number[]) => a ? (a[t] / span).toFixed(3) : 'n/a';
    row.textContent = `${sim.cfg.types[t].name}: ${current.typePop[t]} living · energy ${Number.isFinite(current.typeEnergyFrac[t]) ? (current.typeEnergyFrac[t]*100).toFixed(1)+'%' : 'n/a'} · births/deaths per 1000 ticks ${last.typeBirths ? Math.round(last.typeBirths[t]/span*1000) : 'n/a'} / ${last.typeDeaths ? Math.round(last.typeDeaths[t]/span*1000) : 'n/a'} · uptake A/B ${rate(last.typeUptakeA)} / ${rate(last.typeUptakeB)} · maintenance/movement ${rate(last.typeFixedCost)} / ${rate(last.typeMoveCost)}`;
    $('type-stats').append(row);
  }
  const distribution = (a: number[]) => a.map((n,i) => n ? `${i}: ${n}` : '').filter(Boolean).join(' · ') || 'no living organisms';
  $('morph-stats').textContent = `Grazer corners (count: individuals)\n${distribution(current.cornerCounts)}\nGeneralist lobes (count: individuals)\n${distribution(current.lobeCounts)}\nBirth events ${Number.isFinite(sim.totalBirths) ? sim.totalBirths : 'not recorded in legacy world'}`;
  const countMean = (a?: number[]) => { const n = a?.reduce((sum,v) => sum+v,0) ?? 0; return n ? a!.reduce((sum,v,i) => sum+v*i,0)/n : NaN; };
  const countMax = Math.max(sim.cfg.morph.corners.max, sim.cfg.morph.lobes.max);
  line($<HTMLCanvasElement>('c-morph'), [{ v: h.map(s => countMean(s.cornerCounts)), min: 3, max: countMax, color: TYPE_COLOURS[1] },{ v: h.map(s => countMean(s.lobeCounts)), min: 3, max: countMax, color: TYPE_COLOURS[2] }], [], ticks);
  $('morph-scale').textContent = `Recorded population means, scale 3–${countMax}; ticks ${t0}–${last.tick}. Teal: corners; pink: lobes. Gaps mean absent/unrecorded populations. Individual count frequencies are in exported samples.`;
  line($('c-pop') as HTMLCanvasElement, [
    { v: h.map((s) => s.resourceFrac), min: 0, max: 1, color: '#6fbfd6', fill: 'rgba(111,191,214,.16)' },
    { v: h.map((s) => s.resourceFracB ?? NaN), min: 0, max: 1, color: '#6baf92' },
    { v: pops, min: 0, max: Math.max(100, ...pops) * 1.1, color: '#2a1745', width: 1.6 },
  ], marks, ticks);
  $('pop-scale').textContent = `Ticks ${t0.toLocaleString()}–${last.tick.toLocaleString()} · population 0–${Math.ceil(Math.max(100, ...pops) * 1.1)} · resources 0–100% (A blue, B green). Now A ${(current.resourceFrac*100).toFixed(1)}%, B ${(current.resourceFracB*100).toFixed(1)}%. Latest recorded sample: tick ${last.tick.toLocaleString()}.`;
  for (const i of FUNCTIONAL) {
    const t = TRAITS[i];
    const v = h.map((s) => s.population ? s.traitMean[i] : NaN);
    const observed = v.filter(Number.isFinite);
    // auto-range, but never narrower than 15 % of the gene's range, so noise is not drawn as a trend
    const lo = observed.length ? Math.min(...observed) : t.min, hi = observed.length ? Math.max(...observed) : t.max, mid = (lo + hi) / 2, half = Math.max((hi - lo) / 2 * 1.15, (t.max - t.min) * 0.075);
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
  if (type === 'introduction') {
    try { const d = JSON.parse(detail); return `Released #${d.id}, type ${d.type}, corners ${d.corners || 'n/a'}, lobes ${d.lobes || 'n/a'} at (${Number(d.x).toFixed(1)}, ${Number(d.y).toFixed(1)}).`; }
    catch { return `A newcomer was released (${detail}).`; }
  }
  try {
    const p = JSON.parse(detail);
    const parts: string[] = [];
    if (p.regrowthRate !== undefined) parts.push(`productivity ×${(p.regrowthRate / DEFAULT_CONFIG.env.regrowthRate).toFixed(2)}`);
    if (p.cellCapacity !== undefined) parts.push(`richness ${p.cellCapacity}`);
    return `Resource ${p.resource ?? 'A'} changed: ${parts.join(', ')}.`;
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
  const { warm, cool } = coloursOf(s.ph.traits, s.type);
  $('spec-ecology').textContent = `${sim.cfg.types[s.type].name} · corners ${s.corners || 'n/a'} · lobes ${s.lobes || 'n/a'} · actual speed ceiling ${s.ph.vmax.toFixed(2)} units/tick · affinity A/B ${s.ph.affA}/${s.ph.affB} · intake ceiling ${s.ph.intakeMax.toFixed(3)} energy/tick · maintenance ${s.ph.fixedCost.toFixed(3)} energy/tick · body cost ${s.ph.buildCost.toFixed(3)} energy. Count traits change only in offspring.`;
  if (s.type === 2) $('spec-ecology').textContent += ` Inherited decorative particles by lobe: ${particleCounts(s).join(' / ')}. These do not change gene count or metabolism.`;
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
const resourceChoice = $<HTMLSelectElement>('i-resource');
const activeResource = () => resourceChoice.value as 'A' | 'B';
const activeEnv = () => activeResource() === 'A' ? sim.env : sim.envB;
resourceChoice.onchange = syncClimate;
function syncClimate() {
  const env = activeEnv();
  const p = env.regrowthRate / DEFAULT_CONFIG.env.regrowthRate;
  prod.value = String(p);
  rich.min = '0'; rich.value = String(env.cellCapacity);
  $('o-prod').textContent = `×${p.toFixed(2)}`;
  $('o-rich').textContent = env.cellCapacity.toFixed(1);
  prod.disabled = rich.disabled = activeResource() === 'B' && sim.cfg.model === 1;
  $<HTMLSelectElement>('i-type').disabled = sim.cfg.model === 1;
}
prod.oninput = () => { $('o-prod').textContent = `×${Number(prod.value).toFixed(2)}`; };
rich.oninput = () => { $('o-rich').textContent = Number(rich.value).toFixed(1); };
prod.onchange = () => {
  const p = Number(prod.value);
  sim.setEnvironment({ regrowthRate: DEFAULT_CONFIG.env.regrowthRate * p, influx: DEFAULT_CONFIG.env.influx * p }, activeResource());
  updateNotes();
};
rich.onchange = () => { sim.setEnvironment({ cellCapacity: Number(rich.value) }, activeResource()); updateNotes(); };

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
  resize();
  cam.reset();
  cam.clamp();
  syncClimate();
  updateNotes();
  history.replaceState(null, '', `?seed=${sim.cfg.seed}`);
  observer?.worldChanged(sim);
}
const confirmReplace = () => confirmAction({ title: '取代目前的觀察箱？', message: '目前尚未儲存的進度與介入將被取代。若想保留這個世界，請先取消並儲存快照。', accept: '取代世界', cancel: '保留目前世界' });
async function newWorld() { if (await confirmReplace()) load(new Simulation(makeConfig({ seed: randomSeed() }))); }
$('b-new').onclick = newWorld;
$('b-ext-new').onclick = newWorld;
$('b-ext-release').onclick = () => {
  const rng = new Rng(randomSeed());
  for (let i = 0; i < 40; i++) sim.introduce(randomGenome(rng, 0.5, 1), rng.next() * sim.cfg.width, rng.next() * sim.cfg.height, sim.cfg.founders.energyFrac, { type: sim.cfg.model === 1 ? 0 : i % 3 });
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
    if (await confirmReplace()) load(next);
  }
  catch (err) { await showNotice('無法開啟快照', String(err)); }
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
  clock.paused = paused || researching || dialogOpen;
  clock.ticksPerSecond = 30 * speed;
  Array.from($('speeds').children).forEach((b, i) => { b.classList.toggle('on', SPEEDS[i] === speed && !clock.paused); b.setAttribute('aria-pressed', String(SPEEDS[i] === speed && !clock.paused)); (b as HTMLButtonElement).disabled = researching; });
  $('b-play').textContent = clock.paused ? '▶' : '❚❚';
  $('b-play').setAttribute('aria-label', clock.paused ? 'Play' : 'Pause');
  $<HTMLButtonElement>('b-play').disabled = researching;
}
$('b-play').onclick = () => { paused = !paused; applySpeed(); };
$('b-zin').onclick = () => cam.zoomAt(cam.vw / 2, cam.vh / 2, cam.zoom * 1.5);
$('b-zout').onclick = () => cam.zoomAt(cam.vw / 2, cam.vh / 2, cam.zoom / 1.5);

const climate = $('climate');
$('climate-toggle').onclick = () => { const open = climate.classList.toggle('open'); $('climate-toggle').setAttribute('aria-expanded', String(open)); };

const notes = $('notes');
function toggleNotes(open = !notes.classList.contains('open')) {
  if (open && observer?.isOpen) observer.setOpen(false);
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
function pickOrganism(x: number, y: number): Organism | null {
  let picked: Organism | null = null, nearest = Infinity;
  for (const o of sim.orgs) {
    const v = life.vis.get(o.id), dx = x - (v?.lx ?? o.x), dy = y - (v?.ly ?? o.y);
    const dist = dx * dx + dy * dy, radius = Math.max(pickRadius(), v?.shape.ext ?? o.ph.radius * 2);
    if (dist <= radius * radius && dist < nearest) { nearest = dist; picked = o; }
  }
  return picked;
}
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
  hover = pickOrganism(wx, wy)?.id ?? -1;
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
    const o = sim.introduce(src ? src.genome : randomGenome(new Rng(randomSeed()), 0.5, 1), wx, wy, sim.cfg.founders.energyFrac, src ? { type: src.type, corners: src.corners, lobes: src.lobes } : { type: sim.cfg.model === 1 ? 0 : Number($<HTMLSelectElement>('i-type').value) });
    setPlacing(null);
    select(o.id);
    return;
  }
  select(pickOrganism(wx, wy)?.id ?? -1);
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
  if (dialogOpen) return;
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
  else if (e.key === 'Escape') { if (placing) setPlacing(null); else if (observer?.isOpen) observer.setOpen(false); else if (notes.classList.contains('open')) toggleNotes(false); else select(-1); }
  wake();
});

// idle: chrome fades away while the visitor just watches
let idleTimer = 0;
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (!notes.classList.contains('open') && !observer?.isOpen && !placing && !document.activeElement?.closest('button, a, input, #notes')) document.body.classList.add('idle');
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
  const frameStart = performance.now();
  const elapsed = Math.max(0, (now - lastT) / 1000);
  const dt = Math.min(0.1, elapsed);
  lastT = now;
  if (document.hidden) { requestAnimationFrame(frame); return; }
  const before = sim.tick;
  let n = clock.advance(dt);
  const deadline = performance.now() + 11;
  while (n > 1 && performance.now() < deadline) { const k = Math.min(n - 1, 8); sim.step(k); n -= k; }
  if (n >= 1) { life.capturePrev(sim); sim.step(1); }
  const live = clock.paused ? 0 : dt;
  life.sync(sim, speed <= 16 && !reducedMotion.matches, live);
  animTime += live;
  observer?.frame(sim, clock.paused ? 0 : elapsed);
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
  const alpha = clock.paused ? 1 : Math.min(1, clock.phase);
  const visualTime = reducedMotion.matches ? 0 : animTime;
  field.render(sim, cam, visualTime, dpr());
  life.render(sim, cam, alpha, visualTime, reducedMotion.matches ? 0 : live, dpr(), selected, hover);

  if (now - lastPanel > 300) {
    lastPanel = now;
    $('caption').textContent = `Model ${sim.cfg.model} · ${sim.cfg.seed} · ${sim.tick.toLocaleString()} ticks · ${sim.orgs.length} living`;
    $('clock').textContent = `${sim.tick.toLocaleString()} t`;
    $('pace').textContent = `${dialogOpen ? 'Paused for confirmation' : researching ? 'Chamber paused for experiments' : paused ? 'Paused' : `Target ${30 * speed} ticks/s · actual ${Math.round(actualRate)} ticks/s`} · frame work ${frameMs.toFixed(1)} ms (smoothed JS callback time; not GPU completion or FPS)`;
    if (notes.classList.contains('open')) updateNotes();
    updateSpecimen();
    laboratory.refresh(lastSeen);
    const extinct = sim.orgs.length === 0;
    $('extinct').hidden = !extinct;
    if (extinct) { const tick = extinctionTick(sim.events); $('extinct-title').textContent = tick === undefined ? 'No living organisms' : `Extinct at tick ${tick.toLocaleString()}`; }
  }
  if (selected >= 0 && lastSeen) portrait($('spec-portrait') as HTMLCanvasElement, lastSeen, sim.cfg.sensorAngle, lastSeen.alive ? visualTime : 0);
  frameMs = frameMs * 0.9 + (performance.now() - frameStart) * 0.1;
  requestAnimationFrame(frame);
}

(window as any).__sim = () => sim; // researcher console access
(window as any).__frameMs = () => frameMs;
document.addEventListener('app-dialog-toggle', e => { dialogOpen = (e as CustomEvent).detail.open; applySpeed(); });
laboratory = new Laboratory(() => sim, load, select, () => { researching = true; applySpeed(); return () => { researching = false; applySpeed(); }; });
observer = new ObserverPane(() => sim, () => { if (notes.classList.contains('open')) toggleNotes(false); });
load(sim);
applySpeed();
wake();
requestAnimationFrame(frame);
