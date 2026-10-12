// 01 共振建築《空氣有自己的骨架》
// 四個聲部 = 四道牆；音高 → 平面位置，音程 → 通道與拱門跨度，持續音 → 穩定度。
import * as THREE from 'three';
import { runWork, radioGroup } from '../core/shell.js';
import { makeRenderer, envMap, fit, orbitInput, disposeScene } from '../core/three-kit.js';
import { clamp, approach, spring, noteName, smooth } from '../core/rng.js';
import { BAR, SETS, features, layout, pitchX } from '../models/architecture.js';

// ---- 樂譜 ----
const ENTRY = [0, 0.45, 0.95, 1.5];
const BELLS = [[2.6, 2], [3.2, 3], [3.8, 1], [5.6, 3], [6.2, 2]];
function chordAt(timeline, k) { const set = SETS[timeline.set]; return set.chords[(timeline.idx + k) % set.chords.length]; }

function archGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.5, 1); s.lineTo(-0.5, 1); s.lineTo(-0.5, 0);
  const h = new THREE.Path();
  h.moveTo(-0.3, 0); h.lineTo(-0.3, 0.6); h.absarc(0, 0.6, 0.3, Math.PI, 0, true); h.lineTo(0.3, 0); h.lineTo(-0.3, 0);
  s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, -0.5);
  return g;
}

const work = {
  engine: { reverb: 3.4, reverbTone: 0.35 },
  timeline: { start: 0, set: 0, idx: 0 },
  mode: 'nave',
  init(api) {
    const canvas = api.canvas;
    const r = this.renderer = makeRenderer(canvas, { exposure: 1.06 });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.VSMShadowMap;
    const scene = this.scene = new THREE.Scene();
    const fogColor = new THREE.Color('#e5e8eb');
    scene.background = fogColor; scene.fog = new THREE.Fog(fogColor, 30, 78);
    const env = envMap(r, 0.04);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 120);
    this.view = { yaw: 0, pitch: 0, touched: 0 };
    orbitInput(canvas, this.view, api, { yaw: [-0.9, 0.9], pitch: [-0.12, 0.3] });

    const hemi = new THREE.HemisphereLight('#b3c6e6', '#e8e1d4', 1.55); scene.add(hemi);
    const sun = this.sun = new THREE.DirectionalLight('#fff2df', 2.5);
    sun.castShadow = true;
    const ms = api.mobile ? 1024 : 2048; sun.shadow.mapSize.set(ms, ms);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 9; sun.shadow.blurSamples = 16;
    scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight('#c9d6ec', 0.55); fill.position.set(12, 6, -10); scene.add(fill);

    // 地坪：淡淡的石材分割線，給空間一個可以想像走入的尺度（每格 1.5 單位）
    const fc = document.createElement('canvas'); fc.width = fc.height = 256; const fx = fc.getContext('2d');
    fx.fillStyle = '#efeee9'; fx.fillRect(0, 0, 256, 256); fx.strokeStyle = '#dcdad3'; fx.lineWidth = 2; fx.strokeRect(1, 1, 254, 254);
    for (let i = 0; i < 900; i++) { fx.fillStyle = `rgba(${150 + (i % 40)},${148 + (i % 37)},${140},0.05)`; fx.fillRect((i * 97) % 256, (i * 57) % 256, 2, 2); }
    const ftex = new THREE.CanvasTexture(fc); ftex.colorSpace = THREE.SRGBColorSpace; ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.repeat.set(140 / 1.5, 140 / 1.5); ftex.anisotropy = 8;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ color: '#ffffff', map: ftex, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    const plaster = new THREE.MeshStandardMaterial({ color: '#f6f5f1', roughness: 0.94 });
    const plaster2 = new THREE.MeshStandardMaterial({ color: '#efede7', roughness: 0.9 });
    const brass = new THREE.MeshStandardMaterial({ color: '#b59b6b', metalness: 1, roughness: 0.26, envMap: env, envMapIntensity: 1.1 });
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const plateGeo = new THREE.BoxGeometry(1, 1, 1);
    const col = new THREE.CylinderGeometry(0.035, 0.035, 1, 12); col.translate(0, 0.5, 0);
    const arch = archGeometry();
    const make = (geo, mat, kind, i) => {
      const m = new THREE.Mesh(geo, mat.clone()); m.castShadow = true; m.receiveShadow = true; scene.add(m);
      return { kind, i, mesh: m, p: { x: 0, y: 0, z: 0, ry: 0, w: 1, h: 1, d: 1 }, v: { x: 0, y: 0, z: 0, ry: 0, w: 0, h: 0, d: 0 }, tg: null, presence: 0, ptarget: 0, stab: 0, sustain: false, wob: i * 1.7 };
    };
    this.walls = [0, 1, 2, 3].map(i => make(box, i % 2 ? plaster2 : plaster, 'wall', i));
    this.arches = [0, 1, 2].map(i => make(arch, plaster, 'arch', i));
    this.plates = [0, 1, 2].map(i => make(plateGeo, plaster2, 'plate', i));
    this.cols = [0, 1, 2, 3].map(i => make(col, brass, 'col', i));
    this.fins = [0, 1, 2, 3, 4, 5].map(i => make(plateGeo, plaster, 'fin', i));
    this.fins.forEach(f => { f.p = { x: 0, y: 4, z: 2, ry: 0, w: 1.3, h: 1.4, d: 0.05 }; f.tg = { ...f.p }; });
    this.finNext = 0;
    this.all = [...this.walls, ...this.arches, ...this.plates, ...this.cols, ...this.fins];
    this.sunAz = 0.6; this.sunAzT = 0.6;
    this.bindControls(api);
    this.applyChord(chordAt(this.timeline, 0), true);
    // 播放前：第一個和弦的完整構圖已站穩。
    this.all.forEach(p => { if (p.kind !== 'fin') { p.stab = p.presence = p.ptarget; } });
  },

  bindControls(api) {
    this.setSet = radioGroup('[data-set]', v => {
      const k = Number(v);
      if (!api.state.started || !api.state.playing) {
        this.timeline = { start: this.nextChordTime ?? 0, set: k, idx: 0 };
        if (!api.state.started) { this.timeline.start = 0; this.applyChord(chordAt(this.timeline, 0), false); }
        api.invalidate();
        api.status(`和弦組：${SETS[k].name}（播放時立即轉換）`);
        return;
      }
      const t = api.soonest(0.06);
      (this.held || []).forEach(h => h && h.release(api.at(t), 0.35));
      this.held = [];
      api.rewindTo(t);
      this.timeline = { start: t, set: k, idx: 0 };
      api.status(`和弦組：${SETS[k].name}`);
    });
    radioGroup('[data-mode]', v => { this.mode = v; this.applyChord(this.current, false); api.invalidate(); api.status(v === 'court' ? '空間：環形中庭' : '空間：縱向廊道'); });
  },

  applyChord(chord, snap) {
    this.current = chord;
    const L = layout(chord.v, this.mode), f = features(chord.v);
    const set = (part, tg) => { part.tg = { x: tg.x, y: tg.y ?? 0, z: tg.z, ry: tg.ry ?? 0, w: tg.w ?? 1, h: tg.h, d: tg.d ?? 1 }; if (snap) part.p = { ...part.tg }; };
    L.walls.forEach((w, i) => { set(this.walls[i], w); this.walls[i].ptarget = 1; });
    L.arches.forEach((a, i) => { set(this.arches[i], a); this.arches[i].ptarget = a.on ? 1 : 0; });
    L.plates.forEach((p, i) => { set(this.plates[i], { ...p, h: 0.14 }); this.plates[i].ptarget = p.on ? 1 : 0; });
    L.cols.forEach((c, i) => { set(this.cols[i], { x: c.x, z: c.z, ry: 0, w: 1, h: c.h, d: 1 }); this.cols[i].ptarget = 1; });
    this.sunAzT = 0.35 + (chord.v[0] % 12) / 12 * 0.9 + f.tension * 0.25;
    if (snap) this.sunAz = this.sunAzT;
    this.features = f;
  },

  schedule(from, to, api) {
    const tl = this.timeline, e = api.engine, au = api.audible;
    const k0 = Math.max(0, Math.floor((from - tl.start) / BAR) - 1), k1 = Math.floor((to - tl.start) / BAR);
    this.held = (this.held || []).filter(h => h && h.end > e.ctx?.currentTime);
    for (let k = k0; k <= k1; k++) {
      const s = tl.start + k * BAR, ch = chordAt(tl, k), shortTop = k % 4 === 3;
      const inWin = t => t >= from && t < to;
      if (inWin(s)) { api.emit({ t: s, type: 'chord', chord: ch, k }); this.nextChordTime = s + BAR; }
      ch.v.forEach((n, i) => {
        const t = s + ENTRY[i];
        if (!inWin(t)) return;
        const dur = (i === 3 && shortTop) ? 2.4 : BAR - ENTRY[i] + 0.5;
        if (au) this.held.push(e.pad(api.at(t), n + (i === 0 ? 12 : 0), dur, i === 0 ? 0.62 : 0.42, { a: 1.1, r: 1.8, bright: 0.25 + i * 0.08, pan: (i - 1.5) * 0.28, wet: 0.45 }));
        if (au && i === 0) this.held.push(e.pad(api.at(t), n, dur, 0.5, { a: 1.4, r: 2, bright: 0.05, wave: 'sine', wave2: 'triangle', mix: 0.3, wet: 0.2 }));
        api.emit({ t, type: 'on', voice: i, dur });
      });
      const sorted = ch.v.slice(1).sort((a, b) => a - b);
      BELLS.forEach(([dt, idx], j) => {
        if (k % 2 === 1 && j > 2) return;
        const t = s + dt; if (!inWin(t)) return;
        const m = sorted[idx % 3] + 12 + (idx === 3 ? 7 : 0);
        if (au) e.bell(api.at(t), m, 0.42 - j * 0.03, { decay: 1.8, ratio: 3.01, index: 1.1, gain: 0.11, pan: ((m % 7) - 3) * 0.15 });
        api.emit({ t, type: 'bell', midi: m });
      });
    }
  },

  onEvent(ev, api) {
    if (ev.type === 'chord') {
      this.applyChord(ev.chord, false);
      api.readout(`${SETS[this.timeline.set].name} · ${ev.chord.name}\n${ev.chord.v.map(noteName).join(' ')}`);
    } else if (ev.type === 'on') {
      const w = this.walls[ev.voice]; w.sustain = true; w.until = ev.t + ev.dur;
      // 與此聲部相鄰的拱門與平板也一起被「撐住」。
      if (ev.voice < 3) this.arches[ev.voice].sustainFrom = ev.t;
    } else if (ev.type === 'bell') {
      const f = this.fins[this.finNext++ % this.fins.length];
      const x = pitchX(ev.midi - 14) * 0.9;
      f.tg = { x, y: 3.6 + (ev.midi - 72) * 0.07, z: 3.4 - (this.finNext % 3) * 1.4, ry: 0.25 * Math.sin(ev.midi), w: 1.25, h: 1.35, d: 0.05 };
      if (f.presence < 0.05) f.p = { ...f.tg, y: f.tg.y + 0.6 };
      f.presence = Math.max(f.presence, 0.9); f.stab = 0.12; f.ptarget = 0;
    }
  },

  update(t, dt, api) {
    this.t = t;
    for (const w of this.walls) if (w.sustain && t > w.until) w.sustain = false;
    const W = this.walls;
    this.all.forEach(p => {
      if (!p.tg) return;
      let sustain = false;
      if (p.kind === 'wall' || p.kind === 'col') sustain = W[p.i].sustain;
      else if (p.kind === 'arch') sustain = W[p.i].sustain && W[p.i + 1].sustain;
      else if (p.kind === 'plate') sustain = [W[0].sustain && W[1].sustain, W[3].sustain, W[1].sustain && W[2].sustain][p.i];
      if (p.kind !== 'fin') {
        const target = p.ptarget * (sustain ? 1 : 0.16);
        p.presence = approach(p.presence, target, dt, target > p.presence ? 0.9 : 2.6);
        p.stab = approach(p.stab, sustain ? 1 : 0, dt, sustain ? 1.3 : 0.75);
      } else {
        p.presence = approach(p.presence, 0, dt, 1.25);
        p.stab = approach(p.stab, 0, dt, 0.6);
      }
      for (const k of ['x', 'y', 'z', 'ry', 'w', 'h', 'd']) [p.p[k], p.v[k]] = spring(p.p[k], p.v[k], p.tg[k], dt, p.kind === 'fin' ? 3 : 1.55);
    });
    this.sunAz = approach(this.sunAz, this.sunAzT, dt, 2.2);
  },

  idle(api) { return performance.now() - this.view.touched < 1200; },

  render(api) {
    const t = this.t || 0, reduced = api.reduced;
    this.all.forEach(p => {
      const m = p.mesh, pr = p.presence, st = p.stab;
      m.visible = pr > 0.012;
      if (!m.visible) return;
      const wob = (1 - st) * (reduced ? 0.3 : 1);
      const grow = p.kind === 'plate' || p.kind === 'fin' ? 1 : 0.04 + 0.96 * smooth(0, 1, pr);
      m.position.set(p.p.x, p.p.y + (p.kind === 'fin' || p.kind === 'plate' ? Math.sin(t * 1.3 + p.wob) * 0.08 * wob : 0), p.p.z);
      m.rotation.set(0, p.p.ry + (p.kind === 'fin' ? Math.sin(t * 1.9 + p.wob) * 0.25 * wob : 0), Math.sin(t * 1.7 + p.wob) * 0.028 * wob);
      const sx = p.kind === 'col' ? 1 : p.p.w, sz = p.kind === 'col' ? 1 : p.p.d;
      m.scale.set(Math.max(0.01, sx), Math.max(0.01, p.p.h * grow), Math.max(0.01, sz));
      const op = clamp(0.1 + 0.9 * pr * (0.32 + 0.68 * st));
      m.material.opacity = op; m.material.transparent = op < 0.985; m.material.depthWrite = op > 0.6;
      m.castShadow = op > 0.42;
    });
    const az = this.sunAz;
    this.sun.position.set(Math.cos(az) * -15, 15, Math.sin(az) * 9 + 5);
    // 構圖：橫幅取三分之二透視，直幅拉遠並抬高。
    const cam = this.camera, aspect = cam.aspect;
    const drift = reduced ? 0 : Math.sin(t * 0.045) * 0.12;
    const portrait = aspect < 1;
    const yaw = (portrait ? 1.22 : 0.62) + this.view.yaw + drift, pitch = (portrait ? 0.3 : 0.24) + this.view.pitch;
    const R = portrait ? 46 : 25 / Math.min(1, Math.max(0.55, aspect / 1.35));
    this.scene.fog.near = R + 4; this.scene.fog.far = R + 50;
    const tgt = new THREE.Vector3(portrait ? -0.6 : 0.4, portrait ? 2.2 : 1.9, -0.4);
    cam.position.set(tgt.x + Math.sin(yaw) * Math.cos(pitch) * R, tgt.y + Math.sin(pitch) * R, tgt.z + Math.cos(yaw) * Math.cos(pitch) * R);
    cam.lookAt(tgt);
    this.renderer.render(this.scene, cam);
  },

  resize(w, h, dpr) { fit(this.renderer, this.camera, w, h, dpr); },
  reset(api) {
    this.timeline = { start: 0, set: this.timeline.set, idx: 0 };
    (this.held || []).forEach(h => h && h.release(api.engine.ctx ? api.engine.ctx.currentTime : 0));
    this.held = [];
    this.walls.forEach(w => { w.sustain = false; });
  },
  dispose() { disposeScene(this.scene, this.renderer); }
};

if (typeof window !== 'undefined' && document.getElementById('art')) runWork(work);
