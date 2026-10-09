// DOM interface: museum label, plan view, 2D work list and the work viewer.
// Nothing here depends on three.js, so the list works without WebGL.
import { ROOMS, DOORS } from './plan.js';

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
  }
  kids.forEach((c) => c && n.append(c));
  return n;
};
const pad = (i) => String(i).padStart(2, '0');

export function workUrl(work) {
  return work.seed != null ? `${work.src}?seed=${work.seed}` : work.src;
}

/** Simple dialog stack: Esc closes the top-most layer, focus is restored. */
const stack = [];
export function openLayer(node, { onClose, initialFocus } = {}) {
  const prev = document.activeElement;
  node.hidden = false;
  stack.push({ node, onClose, prev });
  requestAnimationFrame(() => (initialFocus || node.querySelector('button, [tabindex="0"], iframe'))?.focus({ preventScroll: true }));
}
export function closeLayer(node) {
  const i = stack.findIndex((s) => s.node === node);
  if (i < 0) return;
  const [s] = stack.splice(i, 1);
  node.hidden = true;
  s.onClose?.();
  if (s.prev && document.contains(s.prev) && !s.prev.closest('[hidden]')) s.prev.focus({ preventScroll: true });
}
export function topLayer() { return stack.length ? stack[stack.length - 1].node : null; }
export function closeTop() { const t = topLayer(); if (t) { closeLayer(t); return true; } return false; }

// keep Tab inside a modal layer
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const t = topLayer(); if (!t || t.getAttribute('aria-modal') !== 'true') return;
  const f = [...t.querySelectorAll('button:not([disabled]), [tabindex="0"], iframe')].filter((n) => !n.closest('[hidden]'));
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeLayer(b.closest('[role="dialog"]'))));

// ---------------------------------------------------------------- viewer
export class Viewer {
  constructor() {
    this.node = $('viewer'); this.frame = $('viewer-frame'); this.title = $('viewer-title');
    $('viewer-close').addEventListener('click', () => this.close());
    this.frame.addEventListener('load', () => this.decorate());
    this.onOpen = null; this.onClose = null;
  }
  open(work, index) {
    this.work = work;
    this.title.textContent = `${pad(index)}　${work.title}`;
    this.frame.title = `${work.title}（互動作品）`;
    this.frame.src = workUrl(work);
    document.body.classList.add('viewing');
    openLayer(this.node, { onClose: () => this.closed(), initialFocus: $('viewer-close') });
    requestAnimationFrame(() => this.node.classList.add('on'));
    this.onOpen?.();
  }
  /** Same-origin page: hide its "back to catalogue" link and forward Esc. */
  decorate() {
    try {
      const doc = this.frame.contentDocument; if (!doc || doc.location.href === 'about:blank') return;
      const s = doc.createElement('style'); s.textContent = '.back{display:none!important}';
      doc.head.appendChild(s);
      doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
      // if the visitor navigates the frame to a catalogue page, bring them back to the room
      if (/-list\.html$/.test(doc.location.pathname)) this.close();
    } catch (e) { /* cross-origin hosting: decorations are optional */ }
  }
  close() { if (!this.node.hidden) closeLayer(this.node); }
  closed() {
    this.node.classList.remove('on');
    document.body.classList.remove('viewing');
    this.frame.src = 'about:blank';
    this.onClose?.();
  }
  get open_() { return !this.node.hidden; }
}

// ---------------------------------------------------------------- card
export class Card {
  constructor(ex) {
    this.ex = ex; this.node = $('card');
    this.onEnter = null; this.onBack = null; this.onStep = null;
    $('card-enter').addEventListener('click', () => this.onEnter?.(this.work));
    $('card-back').addEventListener('click', () => this.onBack?.());
    $('card-prev').addEventListener('click', () => this.onStep?.(-1));
    $('card-next').addEventListener('click', () => this.onStep?.(1));
  }
  show(work, index) {
    this.work = work;
    $('card-num').textContent = `${pad(index)} / ${pad(this.ex.works.length)}`;
    $('card-title').textContent = work.title;
    $('card-en').textContent = work.titleEn;
    $('card-artist').textContent = this.ex.artist;
    $('card-year').textContent = String(this.ex.year);
    $('card-medium').textContent = this.ex.media[work.kind];
    $('card-statement').textContent = work.statement;
    this.node.hidden = false; this.node.inert = false;
    requestAnimationFrame(() => this.node.classList.add('on'));
    document.body.classList.add('focused');
  }
  hide() {
    if (this.node.contains(document.activeElement)) document.activeElement.blur();
    this.node.inert = true; // out of the tab order at once, while it fades
    this.node.classList.remove('on'); document.body.classList.remove('focused');
    clearTimeout(this.t); this.t = setTimeout(() => { if (!this.node.classList.contains('on')) this.node.hidden = true; }, 700);
    this.work = null;
  }
  get visible() { return !!this.work; }
  /** Screen area the label covers, so the camera can frame the work beside it. */
  occupied() {
    const narrow = innerWidth <= 700;
    if (narrow) return { right: 0, bottom: this.node.offsetHeight + 24 || 230 };
    return { right: (this.node.offsetWidth || 288) + Math.max(innerWidth * 0.04, 24) + 20, bottom: 0 };
  }
}

// ---------------------------------------------------------------- list
export function renderList(ex, { onEnter, onGoTo, standalone }) {
  const body = $('list-body'); body.textContent = '';
  if (standalone) {
    body.append(el('div', { class: 'list-intro' },
      el('h3', { text: ex.title }), el('p', { class: 'en', text: ex.titleEn }), el('p', { text: ex.statement })));
  }
  const halls = ex.halls.filter((h) => ex.works.some((w) => w.hall === h.id));
  for (const h of halls) {
    const sec = el('section', { class: 'list-hall', 'aria-label': `${h.label} ${h.name}` },
      el('h3', { text: h.label }), el('h4', { text: h.name }), el('p', { text: h.intro }));
    ex.works.forEach((w, i) => {
      if (w.hall !== h.id) return;
      const acts = el('div', { class: 'acts' },
        el('button', { type: 'button', text: `${ex.ui.enterWork} ↗`, onclick: () => onEnter(w, i + 1) }));
      if (onGoTo) acts.append(el('button', { type: 'button', text: ex.ui.goTo, onclick: () => onGoTo(w) }));
      sec.append(el('article', { class: 'work-row', 'aria-labelledby': `lw-${w.id}` },
        el('img', { src: `media/${w.id}.webp`, alt: `${w.title}的作品畫面`, loading: 'lazy', width: '640', height: '400' }),
        el('div', {},
          el('div', { class: 'num', text: `${pad(i + 1)}${w.finale ? '　終點作品' : ''}` }),
          el('h5', { id: `lw-${w.id}`, text: w.title }),
          el('div', { class: 'en', text: w.titleEn }),
          el('div', { class: 'meta', text: `${ex.artist}　${ex.year}　${ex.media[w.kind]}` }),
          el('p', { class: 'st', text: w.statement }),
          acts)));
    });
    body.append(sec);
  }
}

// ---------------------------------------------------------------- map
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };

export class PlanMap {
  constructor(ex, placements, onPick) {
    this.ex = ex; this.onPick = onPick;
    const xs = Object.values(ROOMS).flatMap((r) => [r.x0, r.x1]), zs = Object.values(ROOMS).flatMap((r) => [r.z0, r.z1]);
    const m = 2.2;
    const x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, z0 = Math.min(...zs) - m, z1 = Math.max(...zs) + m;
    const svg = sv('svg', { role: 'group', 'aria-label': '展間平面圖' });
    this.svg = svg; this.bounds = { x0, x1, z0, z1 };
    const plan = sv('g'); this.plan = plan;
    const defs = sv('defs');
    const grad = sv('linearGradient', { id: 'corrGrad', x1: '0', y1: '1', x2: '0', y2: '0' });
    [['0', '#f1efea'], ['0.45', '#9b9993'], ['1', '#141414']].forEach(([o, c]) => grad.append(sv('stop', { offset: o, 'stop-color': c })));
    defs.append(grad); svg.append(defs);
    const fills = { lobby: '#f3f1ec', garden: '#efede7', plane: '#efede7', corridor: 'url(#corrGrad)', darkroom: '#161616' };
    for (const r of Object.values(ROOMS)) plan.append(sv('rect', { class: 'map-room', x: r.x0, y: r.z0, width: r.x1 - r.x0, height: r.z1 - r.z0, fill: fills[r.id] }));
    for (const d of DOORS) plan.append(sv('rect', { x: d.x0 - 0.02, y: d.z0 - 0.02, width: d.x1 - d.x0 + 0.04, height: d.z1 - d.z0 + 0.04, fill: d.b === 'darkroom' ? '#161616' : '#f1efea' }));
    const label = (txt, x, y, light, anchor = 'middle') => { const t = sv('text', { class: `map-label${light ? ' light' : ''}`, x, y, 'text-anchor': anchor }); t.textContent = txt; plan.append(t); };
    const H = Object.fromEntries(ex.halls.map((h) => [h.id, h]));
    label(H.lobby.name, 0, 6.4);
    label(`${H.garden.label}　${H.garden.name}`, 0, ROOMS.garden.z1 - 1.75);
    label(`${H.plane.label}　${H.plane.name}`, 0, ROOMS.plane.z1 - 1.75);
    label(`${H.darkroom.label}　${H.darkroom.name}`, -21, (ROOMS.darkroom.z0 + ROOMS.darkroom.z1) / 2 + 0.35, true);
    const ct = sv('text', { class: 'map-label', x: -2.5, y: (ROOMS.corridor.z0 + ROOMS.corridor.z1) / 2, 'text-anchor': 'end' }); ct.textContent = `${H.corridor.label}　${H.corridor.name}`; plan.append(ct);

    ex.works.forEach((w, i) => {
      const p = placements.get(w.id);
      const g = sv('g', { class: 'map-work', tabindex: '0', role: 'button', 'aria-label': `${pad(i + 1)} ${w.title}，前往作品` });
      const dark = p.style === 'lightbox';
      const len = p.w + (p.style === 'print' ? 0.27 : 0.1);
      const along = p.nx === 0; // wall runs along x
      const mx = p.x + p.nx * 0.12, mz = p.z + p.nz * 0.12;
      const mark = sv('rect', along
        ? { x: mx - len / 2, y: mz - 0.12, width: len, height: 0.24 }
        : { x: mx - 0.12, y: mz - len / 2, width: 0.24, height: len });
      mark.setAttribute('class', 'mark'); mark.setAttribute('fill', w.palette[1] || w.palette[0]);
      const nx = p.x + p.nx * 1.15, nz = p.z + p.nz * 1.15 + 0.28;
      const num = sv('text', { class: `num${dark ? ' light' : ''}`, x: nx, y: nz, 'text-anchor': 'middle' }); num.textContent = pad(i + 1);
      const hit = sv('rect', { class: 'hit', x: Math.min(mx, nx) - 1, y: Math.min(mz, nz) - 1.1, width: Math.abs(nx - mx) + 2, height: Math.abs(nz - mz) + 2 });
      g.append(hit, mark, num);
      const tip = sv('title'); tip.textContent = `${pad(i + 1)} ${w.title}`; g.append(tip);
      const go = () => this.onPick(w);
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      plan.append(g);
    });
    this.cone = sv('path', { class: 'map-cone' });
    this.me = sv('circle', { class: 'map-me', r: 0.42 });
    plan.append(this.cone, this.me);
    svg.append(plan);
    $('map-svg').append(svg);
    this.orient();
  }
  /** Landscape screens get the plan rotated a quarter turn (route reads left → right). */
  orient() {
    const { x0, x1, z0, z1 } = this.bounds;
    const land = innerWidth > innerHeight * 1.05;
    if (land === this.land) return;
    this.land = land;
    if (land) {
      this.plan.setAttribute('transform', 'rotate(90)');
      this.svg.setAttribute('viewBox', `${-z1} ${x0} ${z1 - z0} ${x1 - x0}`);
    } else {
      this.plan.removeAttribute('transform');
      this.svg.setAttribute('viewBox', `${x0} ${z0} ${x1 - x0} ${z1 - z0}`);
    }
    // keep every label upright
    this.plan.querySelectorAll('text').forEach((t) => {
      const x = t.getAttribute('x'), y = t.getAttribute('y');
      if (land) t.setAttribute('transform', `rotate(-90 ${x} ${y})`); else t.removeAttribute('transform');
    });
  }
  setPose(x, z, yaw) {
    this.orient();
    this.me.setAttribute('cx', x); this.me.setAttribute('cy', z);
    const r = 3.2, a = 0.5, f = (s) => [x - Math.sin(yaw + s) * r, z - Math.cos(yaw + s) * r];
    const [ax, az] = f(a), [bx, bz] = f(-a);
    this.cone.setAttribute('d', `M${x} ${z} L${ax} ${az} A${r} ${r} 0 0 1 ${bx} ${bz} Z`);
  }
}

// ---------------------------------------------------------------- small helpers
export function hallToast(hall) {
  const n = $('hallname');
  n.innerHTML = '';
  n.append(el('small', { text: hall.label }), el('span', { text: hall.name }));
  n.classList.add('on');
  clearTimeout(hallToast.t); hallToast.t = setTimeout(() => n.classList.remove('on'), 4200);
}

export function showHint(text, key) {
  let seen = false;
  try { seen = localStorage.getItem(key) === '1'; } catch (e) { /* storage unavailable */ }
  if (seen) return () => {};
  const n = $('hint'); n.textContent = text; n.hidden = false; n.classList.remove('out');
  let done = false;
  const dismiss = () => {
    if (done) return; done = true;
    try { localStorage.setItem(key, '1'); } catch (e) { /* ignore */ }
    n.classList.add('out'); setTimeout(() => { n.hidden = true; }, 1000);
  };
  setTimeout(dismiss, 9000);
  return dismiss;
}
