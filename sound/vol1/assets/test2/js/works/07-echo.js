// 07 回聲迷宮《房間是聲音走過的路》
// 聲源發聲 → 計算回聲路徑與抵達時間 → 在抵達的那一刻揭露牆；已揭露的牆反射之後的聲音。
import * as THREE from 'three';
import { runWork } from '../core/shell.js';
import { makeRenderer, fit, disposeScene } from '../core/three-kit.js';
import { clamp, approach } from '../core/rng.js';
import { makeMaze, trace, nextCell, neighbors, revealedFraction, C, CELL } from '../models/echo.js';

const PERIOD = 2.4, PITCH = [64, 67, 71, 69, 64, 62, 67, 59];
const ACCENT = new THREE.Color('#8fc0d8');

const work = {
  engine: { reverb: 1.6, reverbTone: 0.3, maxVoices: 64 },
  init(api) {
    const r = this.renderer = makeRenderer(api.canvas, { exposure: 1.1 });
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#050607');
    scene.fog = new THREE.Fog('#050607', 26, 52);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 120);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: '#0d1012', roughness: 0.42, metalness: 0.25 }));
    this.floor.rotation.x = -Math.PI / 2; scene.add(this.floor);
    scene.add(new THREE.AmbientLight('#4a5866', 0.08));
    // 聲源
    this.src = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), new THREE.MeshStandardMaterial({ color: '#ffd9a8', emissive: '#ffb066', emissiveIntensity: 2.2 }));
    this.srcLight = new THREE.PointLight('#ffb36b', 5, 7, 1.6);
    scene.add(this.src, this.srcLight);
    this.flashes = Array.from({ length: 6 }, () => { const l = new THREE.PointLight('#a9d6f0', 0, 6, 1.4); scene.add(l); return l; });
    this.flashNext = 0;
    this.rings = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), new THREE.MeshBasicMaterial({ color: '#ffcf96', transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; scene.add(m); return { m, t: -99 }; });
    this.ringNext = 0;
    this.lines = Array.from({ length: 24 }, () => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#9ccbe4', transparent: true, opacity: 0, depthWrite: false })); scene.add(l); return { l, t: -99 };
    });
    this.lineNext = 0;
    this.round = 0; this.pings = 0;
    this.newMaze(api, false);
    api.canvas.addEventListener('click', e => this.clickFloor(api, e));
    document.getElementById('ping').addEventListener('click', () => this.manualPing(api));
    document.getElementById('relocate').addEventListener('click', () => this.relocate(api));
  },

  dims(api) { return api.mobile ? [5, 7] : [8, 6]; },

  newMaze(api, keepTime = true) {
    const [cols, rows] = this.dims(api);
    this.maze = makeMaze(`${api.seed}:${this.round}`, cols, rows);
    this.cell = [Math.floor(cols / 2), Math.floor(rows / 2)];
    this.moves = [{ t0: -1, t1: -1, from: this.maze.center(...this.cell), to: this.maze.center(...this.cell) }];
    this.goal = null; this.force = null;
    // 起點房間的牆在一開始就微微可見：觀眾知道自己站在哪裡，也讓第一聲有牆可以反射
    const [x0, y0] = this.maze.center(...this.cell);
    for (const s of this.maze.segs) if (Math.hypot((s.a[0] + s.b[0]) / 2 - x0, (s.a[1] + s.b[1]) / 2 - y0) < CELL * 0.8) s.revealAt = 0;
    this.buildWalls();
    this.walls.forEach(w => { if (w.s.revealAt === 0) { w.m.visible = true; w.shown = 1; } });
  },

  buildWalls() {
    if (this.wallGroup) { this.scene.remove(this.wallGroup); this.wallGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    this.wallGroup = new THREE.Group(); this.scene.add(this.wallGroup);
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    this.walls = this.maze.segs.map(s => {
      const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) + 0.16;
      const mat = new THREE.MeshStandardMaterial({ color: '#1b2026', roughness: 0.6, emissive: ACCENT, emissiveIntensity: 0 });
      const m = new THREE.Mesh(box, mat);
      const cx = (s.a[0] + s.b[0]) / 2, cz = (s.a[1] + s.b[1]) / 2;
      m.position.set(cx, 0, cz); m.rotation.y = -Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]);
      m.scale.set(len, 0.001, 0.16); m.visible = false;
      const cap = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 }));
      cap.scale.set(1, 0.025 / 1.6, 1.15); cap.position.y = 1; m.add(cap);
      this.wallGroup.add(m);
      return { m, cap, s, glow: 0, shown: 0, flashT: -99 };
    });
  },

  posAt(t) {
    let mv = this.moves[0];
    for (const m of this.moves) if (m.t0 <= t) mv = m;
    if (t >= mv.t1) return mv.to.slice();
    const u = clamp((t - mv.t0) / (mv.t1 - mv.t0)), e = u * u * (3 - 2 * u);
    return [mv.from[0] + (mv.to[0] - mv.from[0]) * e, mv.from[1] + (mv.to[1] - mv.from[1]) * e];
  },

  emitPing(api, t, src, k, manual = false) {
    const maze = this.maze, arr = trace(maze, src, t, `${this.round}:${k}:${manual ? 'm' : 'a'}`);
    for (const a of arr) if (a.reveal) maze.segs[a.seg].revealAt = Math.min(maze.segs[a.seg].revealAt, a.t);
    const midi = PITCH[((k % PITCH.length) + PITCH.length) % PITCH.length] + (manual ? 5 : 0), e = api.engine;
    if (api.audible) {
      const at = api.at(t);
      e.pluck(at, midi, 0.62, { decay: 0.55, bright: 7, wave: 'triangle', gain: 0.24, wet: 0.2 });
      e.noise(at, 0.02, 0.5, { freq: 3200, q: 1.5, gain: 0.12, r: 0.03 });
      for (const a of arr) {
        const d = (a.t - t) * C, g = Math.min(1, a.energy * 1.6);
        const pm = midi - Math.round(d * 0.18) - a.bounces * 2;
        const opt = { decay: 0.45 + d * 0.02, bright: 2 + 6 * g, gain: 0.08 + 0.2 * g, pan: Math.cos(a.dir) * 0.8, wet: 0.35 };
        if (a.reveal) e.bell(api.at(a.t), pm + 12, 0.25 + 0.4 * g, { decay: 1.1, ratio: 2.0, index: 0.6, gain: 0.1, pan: opt.pan });
        else e.pluck(api.at(a.t), pm, 0.3 + 0.5 * g, opt);
      }
    }
    api.emit({ t, type: 'ping', src, n: arr.length, refl: arr.filter(a => a.bounces > 0).length, round: this.round });
    for (const a of arr) api.emit({ t: a.t, type: 'echo', a, src, round: this.round });
    return arr;
  },

  schedule(from, to, api) {
    const k0 = Math.ceil((from - 0.4) / PERIOD - 1e-9), k1 = Math.ceil((to - 0.4) / PERIOD - 1e-9);
    for (let k = Math.max(0, k0); k < k1; k++) {
      const t = 0.4 + k * PERIOD;
      if (t < (this.resumeAt || 0)) continue;
      const maze = this.maze;
      if (this.force) { const f = this.force; this.force = null; this.moves.push({ t0: Math.max(t - 0.9, this.lastPing || 0), t1: t, from: this.posAt(t - 0.9), to: maze.center(...f) }); this.cell = f; }
      const src = maze.center(...this.cell);
      this.emitPing(api, t, src, k);
      this.lastPing = t; this.pings++;
      // 一整座迷宮揭露後，換一座新的
      if (revealedFraction(maze, t) >= 0.97) {
        api.emit({ t: t + 2.4, type: 'round' });
        this.resumeAt = t + 6; this.round++;
        this.nextMazeAt = t + 2.4;
        continue;
      }
      // 規劃下一步：觀眾指定的目標優先，否則朝最近的未知牆前進
      let step = null;
      if (this.goal) { step = this.pathStep(this.cell, this.goal); if (!step || String(step) === String(this.goal)) this.goal = step ? this.goal : null; if (step && String(step) === String(this.goal)) this.goal = null; }
      if (!step) step = nextCell(maze, this.cell, t);
      if (step) { this.moves.push({ t0: t + 1.15, t1: t + 2.1, from: src, to: maze.center(...step) }); this.cell = step; }
      if (this.moves.length > 12) this.moves.splice(0, this.moves.length - 12);
    }
  },

  pathStep(from, goal) {
    const prev = new Map([[String(from), null]]), q = [from];
    while (q.length) {
      const c = q.shift();
      if (String(c) === String(goal)) { let s = c; while (prev.get(String(s)) && String(prev.get(String(s))) !== String(from)) s = prev.get(String(s)); return String(s) === String(from) ? null : s; }
      for (const n of neighbors(this.maze, c)) if (!prev.has(String(n))) { prev.set(String(n), c); q.push(n); }
    }
    return null;
  },

  onEvent(ev, api) {
    if (ev.type === 'ping') {
      const ring = this.rings[this.ringNext++ % this.rings.length]; ring.t = ev.t; ring.m.position.set(ev.src[0], 0.02, ev.src[1]);
      api.readout(`第 ${this.pings} 聲 · 回聲 ${ev.n} 道（反射 ${ev.refl}）\n已揭露 ${Math.round(revealedFraction(this.maze, ev.t) * 100)}%`);
    } else if (ev.type === 'echo') {
      if (ev.round !== this.vround) return;
      const a = ev.a, w = this.walls[a.seg];
      if (w) { w.flashT = ev.t; w.m.visible = true; }
      const fl = this.flashes[this.flashNext++ % this.flashes.length];
      fl.position.set(a.p[0], 0.8, a.p[1]); fl.userData.t = ev.t; fl.userData.e = a.reveal ? 1 : 0.45 * Math.min(1, a.energy * 2);
      const ln = this.lines[this.lineNext++ % this.lines.length], pos = ln.l.geometry.attributes.position;
      const pts = [...a.path, ev.src].slice(0, 8);
      for (let i = 0; i < 8; i++) { const p = pts[Math.min(i, pts.length - 1)]; pos.setXYZ(i, p[0], 0.06, p[1]); }
      pos.needsUpdate = true; ln.l.geometry.setDrawRange(0, pts.length); ln.t = ev.t; ln.reveal = a.reveal;
    } else if (ev.type === 'round') {
      this.fading = ev.t;
    }
  },

  update(t, dt, api) {
    this.t = t;
    if (this.vround == null) this.vround = this.round;
    if (this.fading != null) {
      const u = clamp((t - this.fading) / 2.5);
      this.walls.forEach(w => { w.sink = u; });
      if (u >= 1) {
        this.fading = null; this.vround = this.round;
        this.newMaze(api); this.moves = [{ t0: -1, t1: -1, from: this.posAt(0), to: this.maze.center(...this.cell) }];
        this.pings = 0;
        api.status('整座迷宮已被聲音走過。換一座新的房間。');
      }
    }
    for (const w of this.walls) {
      const shown = w.s.revealAt <= t && this.vround === this.round;
      if (shown) w.m.visible = true;
      w.shown = approach(w.shown, shown ? 1 : 0, dt, 0.08);
      const age = t - w.flashT;
      w.glow = age >= 0 && age < 6 ? Math.exp(-age / 0.7) : 0;
    }
  },

  idle() { return false; },

  render(api) {
    const t = this.t || 0, sp = this.posAt(t);
    this.src.position.set(sp[0], 0.45 + Math.sin(t * 2) * 0.03, sp[1]);
    this.srcLight.position.set(sp[0], 0.9, sp[1]);
    for (const w of this.walls) {
      if (!w.m.visible) continue;
      const h = 1.55 * w.shown * (1 - (w.sink || 0));
      w.m.scale.y = Math.max(0.001, h);
      w.m.material.emissiveIntensity = 0.06 + 0.9 * w.glow;
      w.cap.material.opacity = (0.42 + 0.58 * w.glow) * w.shown * (1 - (w.sink || 0));
    }
    for (const f of this.flashes) { const age = t - (f.userData.t ?? -99); f.intensity = age >= 0 ? 14 * (f.userData.e || 0) * Math.exp(-age / 0.5) : 0; }
    for (const r of this.rings) { const age = t - r.t; const rad = Math.max(0.01, age * C); r.m.scale.set(rad, rad, rad); r.m.material.opacity = age >= 0 && age < 3 ? 0.45 * Math.exp(-age * 1.1) : 0; }
    for (const l of this.lines) { const age = t - l.t; l.l.material.opacity = age >= 0 && age < 2 ? (l.reveal ? 0.55 : 0.28) * Math.exp(-age / 0.5) : 0; }
    // 鏡頭：俯視三分之二，緩慢跟隨聲源
    const cam = this.camera, aspect = cam.aspect;
    const mz = this.maze, W = mz.cols * CELL, H = mz.rows * CELL;
    const fx = sp[0] * 0.3, fz = sp[1] * 0.3;
    this.camT = this.camT || new THREE.Vector3(fx, 0, fz);
    this.camT.lerp(new THREE.Vector3(fx, 0, fz), 0.03);
    const span = Math.max(W / Math.max(0.6, aspect), H * (aspect < 1 ? 1.25 : 1)) * 1.02;
    const dist = span / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) * (aspect < 1 ? 1.18 : 1.22);
    cam.position.set(this.camT.x, dist * 0.84, this.camT.z + dist * 0.55);
    cam.lookAt(this.camT.x, 0, this.camT.z + 1.2);
    this.renderer.render(this.scene, cam);
  },

  manualPing(api) {
    const go = () => { const t = api.soonest(0.04); this.emitPing(api, t, this.posAt(t), this.pings++, true); };
    if (!api.state.started) api.play().then(() => setTimeout(go, 120)); else { if (!api.state.playing) api.play(); go(); }
  },

  relocate(api) {
    // 換到離目前最遠、可抵達的房間；已揭露的牆保留
    const dist = new Map([[String(this.cell), 0]]), q = [this.cell]; let far = this.cell;
    while (q.length) { const c = q.shift(); for (const n of neighbors(this.maze, c)) if (!dist.has(String(n))) { dist.set(String(n), dist.get(String(c)) + 1); q.push(n); far = n; } }
    this.force = far; this.goal = null;
    api.status('聲源將在下一聲移到另一個房間。');
    if (!api.state.started) api.play();
  },

  clickFloor(api, e) {
    const rect = api.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObject(this.floor)[0]; if (!hit) return;
    const cx = Math.floor((hit.point.x - this.maze.ox) / CELL), cy = Math.floor((hit.point.z - this.maze.oy) / CELL);
    if (cx < 0 || cy < 0 || cx >= this.maze.cols || cy >= this.maze.rows) return;
    this.goal = [cx, cy];
    api.status('聲源會沿著通道走向你點的房間。');
    if (!api.state.started) api.play();
  },

  onKey(e, api) {
    const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!d) return false;
    const n = [this.cell[0] + d[0], this.cell[1] + d[1]];
    if (neighbors(this.maze, this.cell).some(c => String(c) === String(n))) { this.goal = n; api.status('下一聲會往那個方向走。'); }
    else api.status('那個方向有牆（也許還沒被聽見）。');
    return true;
  },

  resize(w, h, dpr) { fit(this.renderer, this.camera, w, h, dpr); },
  reset(api) { this.round = 0; this.vround = 0; this.pings = 0; this.fading = null; this.resumeAt = 0; this.lastPing = 0; this.newMaze(api); },
  dispose() { disposeScene(this.scene, this.renderer); }
};

if (typeof window !== 'undefined' && document.getElementById('art')) runWork(work);
