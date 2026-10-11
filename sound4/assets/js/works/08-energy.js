// 08 能量蓄積《尚未發生的爆發》
// 能量模型在排程器中以固定步長積分；越過臨界的時刻同時排定和聲與畫面上的翻開。
import * as THREE from 'three';
import { runWork, radioGroup } from '../core/shell.js';
import { makeRenderer, envMap, fit, orbitInput, disposeScene, noiseTexture } from '../core/three-kit.js';
import { clamp, approach, smooth } from '../core/rng.js';
import { EnergyModel, stepNotes, EIGHTH, MODES, PHASES } from '../models/energy.js';

const GORES = 10;
const INNER = [['#ff2f7d', '#ff7a2f'], ['#ff6a00', '#ffd23f'], ['#3b3bff', '#22d3c5'], ['#d81bff', '#ff4f6d']];
const TOP = [[-3, 8.6, -0.6], [3, 8.6, -0.6], [-1.6, 8.6, 1.8], [1.8, 8.6, 1.6]];
const BOTTOM = [[-2.2, 0, 1.4], [2.3, 0, 1.2], [0.2, 0, -2.2]];

const work = {
  engine: { reverb: 3.6, reverbTone: 0.5, lookahead: 0.16 },
  lookahead: 0.16,
  init(api) {
    const r = this.renderer = makeRenderer(api.canvas, { exposure: 1.0 });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.VSMShadowMap;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#c9c4ba'); scene.fog = new THREE.Fog('#c9c4ba', 14, 30);
    this.env = envMap(r, 0.04);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
    this.view = { yaw: 0, pitch: 0, touched: 0 };
    orbitInput(api.canvas, this.view, api, { yaw: [-0.7, 0.7], pitch: [-0.15, 0.2] });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#cfcac0', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    scene.add(new THREE.HemisphereLight('#f4f1ea', '#8d877c', 1.2));
    const key = new THREE.DirectionalLight('#fff6ea', 2.2); key.position.set(-4, 9, 5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 9, bottom: -3 }); key.shadow.radius = 10; key.shadow.blurSamples = 16; key.shadow.bias = -0.0006;
    scene.add(key);
    this.inner = new THREE.PointLight('#ff3c82', 0, 4, 1.5); scene.add(this.inner);

    // 形體：十片瓣，外側節制（骨白石膏），內側鮮豔（虹彩）
    this.form = new THREE.Group(); this.form.scale.setScalar(1.3); this.form.position.y = 3.9; scene.add(this.form);
    const bump = noiseTexture(256, 3, 5, 2);
    const outer = new THREE.MeshStandardMaterial({ color: '#e6e1d7', roughness: 0.86, bumpMap: bump, bumpScale: 0.5, side: THREE.FrontSide });
    this.innerMat = new THREE.MeshPhysicalMaterial({ color: INNER[0][0], emissive: INNER[0][1], emissiveIntensity: 0, roughness: 0.32, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 700], clearcoat: 0.6, side: THREE.BackSide, envMap: this.env, envMapIntensity: 0.9 });
    this.innerMat.toneMapped = false;
    this.gores = [];
    for (let i = 0; i < GORES; i++) {
      const w = (Math.PI * 2) / GORES, gap = 0.012;
      const geo = new THREE.SphereGeometry(1, 10, 40, i * w + gap, w - gap * 2, 0.04, Math.PI - 0.08);
      geo.scale(1, 1.32, 1); geo.translate(0, -1.32, 0); // 鉸鍊在頂點
      const hinge = new THREE.Group(); this.form.add(hinge);
      const m1 = new THREE.Mesh(geo, outer), m2 = new THREE.Mesh(geo, this.innerMat);
      m1.castShadow = true; m2.castShadow = true;
      const pivot = new THREE.Group(); pivot.add(m1, m2); hinge.add(pivot);
      const mid = i * w + w / 2;
      hinge.rotation.y = 0; pivot.userData = { mid };
      this.gores.push({ hinge, pivot, mid, pulse: 0, open: 0 });
    }
    const brass = new THREE.MeshStandardMaterial({ color: '#b2955f', metalness: 1, roughness: 0.3, envMap: this.env });
    this.crown = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 12, 32), brass); this.crown.rotation.x = Math.PI / 2; this.form.add(this.crown);
    this.foot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), brass); scene.add(this.foot);
    // 懸線
    const lineMat = new THREE.LineBasicMaterial({ color: '#3b3833' });
    this.threads = [...TOP.map(p => ({ end: p, top: true })), ...BOTTOM.map(p => ({ end: p, top: false }))].map((th, i) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
      const l = new THREE.Line(g, lineMat); scene.add(l);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), brass); bead.position.set(...th.end); scene.add(bead);
      return { ...th, l, vib: 0, phase: i * 1.3 };
    });
    this.mode = 'balanced';
    this.model = new EnergyModel(this.mode);
    this.k = 0; this.manual = []; this.reorg = 0; this.palette = 0; this.lastN = 0;
    radioGroup('[data-mode]', v => {
      this.mode = v; this.model.mode = v;
      api.status(`${MODES[v].name}：臨界點 ${Math.round(MODES[v].threshold * 100)}%，流失速度 ${MODES[v].leak}。已蓄的能量保留。`);
      api.invalidate();
    });
    document.getElementById('inject').addEventListener('click', async () => {
      if (!api.state.started) await api.play(); else if (!api.state.playing) await api.play();
      this.manual.push(0.75);
      api.status(this.model.locked() ? '形體正在翻開或重組，這一次注入不會累積。' : '注入一次。');
    });
    // 播放前：以一段離線的蓄能狀態呈現繃緊中的構圖（標示為預展）
    this.preview = 0.62;
  },

  playNote(api, t, n) {
    if (!api.audible) return;
    const e = api.engine, at = api.at(t);
    if (n.kind === 'pulse') { e.kick(at, n.vel * 0.7, { freq: 52, gain: 0.42 }); e.pluck(at, n.midi, n.vel * 0.6, { decay: 0.35, bright: 3 + n.vel * 4, wet: 0.15 }); }
    else if (n.kind === 'rise') e.pad(at, n.midi, EIGHTH * 1.6, n.vel * 0.9, { a: 0.03, r: 0.4, bright: 0.5, wet: 0.35, pan: ((n.midi % 5) - 2) * 0.2 });
    else if (n.kind === 'chime' || n.kind === 'fall') e.bell(at, n.midi, n.vel, { decay: 2.6, ratio: 3.01, index: 0.8, gain: 0.12, pan: ((n.midi % 7) - 3) * 0.15 });
    else if (n.kind === 'manual') { e.kick(at, 0.5, { freq: 60, gain: 0.4 }); e.pluck(at, 52, 0.6, { decay: 0.5, bright: 6 }); }
  },

  bloom(api, t) {
    if (!api.audible) return;
    const e = api.engine;
    // 翻開的和聲：柔和、寬、殘響長；不突然變大聲
    [52, 59, 64, 68, 71, 76].forEach((m, i) => e.pad(api.at(t + i * 0.035), m, 3.8, 0.42, { a: 0.5, r: 3, bright: 0.6, wet: 0.7, pan: (i - 2.5) * 0.25 }));
    [88, 91, 95].forEach((m, i) => e.bell(api.at(t + 0.08 + i * 0.11), m, 0.32, { decay: 3.5, ratio: 2.76, index: 0.7, gain: 0.08 }));
  },

  schedule(from, to, api) {
    const m = this.model;
    // 觀眾的注入：在已排程範圍的起點加入
    while (this.manual.length) { const v = this.manual.shift(); m.advance(from); const d = m.inject(v); this.playNote(api, from, { kind: 'manual' }); api.emit({ t: from, type: 'hit', vel: v, idx: (this.k * 3) % GORES, manual: true, gained: d }); }
    while (this.k * EIGHTH < to) {
      const t = this.k * EIGHTH;
      if (t >= from - 1e-9) {
        m.advance(t, tc => { this.bloom(api, tc); api.emit({ t: tc, type: 'release' }); });
        for (const n of stepNotes(m, this.k)) {
          const gained = n.kind === 'pulse' || n.kind === 'rise' ? m.inject(n.vel) : 0;
          this.playNote(api, t, n);
          api.emit({ t, type: 'hit', vel: n.vel, idx: (n.midi * 7) % GORES, gained });
        }
      }
      this.k++;
    }
    m.advance(to, tc => { this.bloom(api, tc); api.emit({ t: tc, type: 'release' }); });
  },

  onEvent(ev, api) {
    if (ev.type === 'hit') {
      const g = this.gores[ev.idx]; g.pulse = Math.min(1.2, g.pulse + ev.vel);
      this.threads.forEach((th, i) => { if ((i + ev.idx) % 3 === 0) th.vib = Math.min(1, th.vib + ev.vel * 0.8); });
    } else if (ev.type === 'release') {
      api.status('越過臨界：形體翻開。');
    }
  },

  update(t, dt, api) {
    this.t = t;
    const s = this.model.at(t);
    this.s = s;
    if (s.n !== this.lastN && s.phase === 'charging') { this.lastN = s.n; this.reorg++; this.palette = (this.palette + 1) % INNER.length; this.innerMat.color.set(INNER[this.palette][0]); this.innerMat.emissive.set(INNER[this.palette][1]); this.inner.color.set(INNER[this.palette][0]); }
    this.gores.forEach(g => { g.pulse = Math.max(0, g.pulse - dt * 3); });
    this.threads.forEach(th => { th.vib = Math.max(0, th.vib - dt * 2.2); });
    const th = MODES[this.mode].threshold;
    const label = { charging: '蓄能', release: '翻開', open: '停留', reform: '重組' }[s.phase];
    api.readout(`${label} · 能量 ${Math.round(s.E / th * 100)}%\n${MODES[this.mode].name} · 第 ${s.n} 次翻開`);
  },

  idle(api) { return performance.now() - this.view.touched < 1200; },

  render(api) {
    const t = this.t || 0;
    const s = this.s || { E: this.preview, phase: 'charging', pt: 0 };
    const th = MODES[this.mode].threshold;
    const load = clamp(s.E / th);
    // 翻開程度
    let open = 0;
    if (s.phase === 'release') open = smooth(0, PHASES.release, s.pt);
    else if (s.phase === 'open') open = 1;
    else if (s.phase === 'reform') open = 1 - smooth(0, PHASES.reform, s.pt);
    const charging = s.phase === 'charging';
    const tremble = api.reduced ? 0 : Math.max(0, load - 0.82) * 0.06;
    const twist = this.reorg * (Math.PI / GORES);
    this.gores.forEach((g, i) => {
      const stagger = clamp(open * 1.25 - (i % 5) * 0.05);
      const ease = stagger * stagger * (3 - 2 * stagger);
      const bulge = 1 + (charging ? 0.1 * load * load : 0) + g.pulse * 0.04;
      const outward = (charging ? 0.03 * load : 0) + g.pulse * 0.015;
      const mid = g.mid;
      g.hinge.rotation.y = twist; // 重組後以不同的排列闔上
      g.pivot.position.set(-Math.cos(mid) * outward, 0, Math.sin(mid) * outward);
      g.pivot.scale.set(bulge, 1 + 0.04 * load, bulge);
      // 繞瓣片中線切向的軸向外翻
      const axis = new THREE.Vector3(Math.sin(mid), 0, Math.cos(mid));
      g.pivot.quaternion.setFromAxisAngle(axis, -(ease * 1.95 + (charging ? Math.sin(t * 31 + i) * tremble : 0)));
    });
    this.form.rotation.y = api.reduced ? 0 : Math.sin(t * 0.2) * 0.08;
    this.form.position.y = 3.9 + open * 0.15 - (charging ? load * 0.12 : 0);
    this.innerMat.emissiveIntensity = (charging ? 0.05 + 0.6 * load * load : 0.18 + 0.12 * open);
    this.inner.position.set(0, this.form.position.y - 1.65, 0);
    this.inner.intensity = charging ? 6 * load * load * load : 2 * open;
    // 懸線：張力越大越直；翻開時下方的線鬆開
    const anchorTop = new THREE.Vector3(0, this.form.position.y + 0.02, 0), anchorBottom = new THREE.Vector3(0, THREE.MathUtils.lerp(this.form.position.y - 3.43 * (1 + 0.04 * load), 0.12, smooth(0, 1, open)), 0.3 * open);
    this.foot.position.copy(anchorBottom);
    this.threads.forEach(thd => {
      const a = new THREE.Vector3(...thd.end), b = thd.top ? anchorTop : anchorBottom;
      const tension = thd.top ? 0.55 + 0.45 * load : (charging ? load : 0.05 * (1 - open));
      const sag = (1 - tension) * (thd.top ? 0.22 : 0.9);
      const pos = thd.l.geometry.attributes.position;
      for (let i = 0; i < 24; i++) {
        const u = i / 23, p = a.clone().lerp(b, u);
        const env = Math.sin(Math.PI * u);
        p.y -= sag * env;
        const v = thd.vib * 0.06 * env * Math.sin(t * 40 + thd.phase) * (0.3 + tension);
        p.x += v; p.z += v * 0.6;
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      pos.needsUpdate = true;
    });
    const cam = this.camera, aspect = cam.aspect;
    const dist = aspect < 1 ? 21 : 14.5 / Math.min(1, Math.max(0.5, aspect / 1.25));
    const yaw = this.view.yaw + 0.18, pitch = 0.06 + this.view.pitch;
    cam.position.set(Math.sin(yaw) * dist, 3.1 + Math.sin(pitch) * dist, Math.cos(yaw) * dist);
    cam.lookAt(0, aspect < 1 ? 4.4 : 3.3, 0);
    this.renderer.render(this.scene, cam);
  },

  resize(w, h, dpr) { fit(this.renderer, this.camera, w, h, dpr); },
  reset() { this.model = new EnergyModel(this.mode); this.k = 0; this.manual = []; this.lastN = 0; this.s = null; this.preview = 0; },
  dispose() { disposeScene(this.scene, this.renderer); }
};

if (typeof window !== 'undefined' && document.getElementById('art')) runWork(work);
