// 04 聲音化石《這首歌曾經存在》
// 決定性沉積模擬沿對數螺旋長成殼；播放時依實際音訊時間顯露，曲終轉為標本光。
import * as THREE from 'three';
import { runWork } from '../core/shell.js';
import { makeRenderer, envMap, fit, orbitInput, disposeScene, noiseTexture } from '../core/three-kit.js';
import { clamp, approach, rng, smooth } from '../core/rng.js';
import { simulate, K } from '../models/fossil.js';

const PALETTES = [
  { base: '#d6c9ad', rib: '#a88d64', suture: '#4e3b28', ridge: '#f3eee2', vein: '#caa24e', name: '石灰' },
  { base: '#aeb2b1', rib: '#7f8487', suture: '#33373c', ridge: '#e8eae6', vein: '#b9984f', name: '頁岩' },
  { base: '#c99f82', rib: '#9f6e52', suture: '#4f2e22', ridge: '#efdcc9', vein: '#bf8f45', name: '陶土' }
];

function buildGeometry(sim, seed) {
  const { rings, params } = sim, N = rings.length, S = K + 1;
  const th0 = 0.55, span = params.turns * Math.PI * 2, thEnd = th0 + span;
  const a = 1.5 / Math.exp(params.b * thEnd);
  const pos = new Float32Array(N * S * 3), col = new Float32Array(N * S * 3), min = new Float32Array(N * S), uv = new Float32Array(N * S * 2);
  const pal = PALETTES[params.palette], C = k => new THREE.Color(pal[k]);
  const cBase = C('base'), cRib = C('rib'), cSut = C('suture'), cRidge = C('ridge'), cVein = C('vein');
  const R = rng(`mottle:${seed}`);
  // 肋：讓節奏的凸起跨三環，像真正的肋紋
  const rib = rings.map((r, i) => (r.rib * 1 + (rings[i - 1]?.rib || 0) * 0.45 + (rings[i + 1]?.rib || 0) * 0.45));
  const frames = [];
  const tmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const th = th0 + span * (i / Math.max(1, N - 1));
    const rr = a * Math.exp(params.b * th);
    const c = new THREE.Vector3(rr * Math.cos(th), rr * Math.sin(th), 0);
    const tan = new THREE.Vector3(params.b * Math.cos(th) - Math.sin(th), params.b * Math.sin(th) + Math.cos(th), 0).normalize();
    const nrm = new THREE.Vector3(tan.y, -tan.x, 0); // 平面內、朝外
    const bin = new THREE.Vector3(0, 0, 1);
    const ring = rings[i];
    const rho = params.k * rr * (0.92 + 0.12 * Math.min(1.2, ring.energy)) * (1 + 0.1 * rib[i] - (ring.suture ? 0.1 : 0));
    frames.push({ c, tan, nrm, rho });
    for (let k = 0; k <= K; k++) {
      const kk = k % K, ph = (k / K) * Math.PI * 2, H = ring.H[kk], M = ring.M[kk];
      const re = rho * (1 + 0.24 * H);
      const o = nrm.clone().multiplyScalar(Math.cos(ph) * re).addScaledVector(bin, Math.sin(ph) * re * 0.8);
      const p = c.clone().add(o), idx = (i * S + k);
      pos.set([p.x, p.y, p.z], idx * 3);
      tmp.copy(cBase).lerp(cRib, clamp(rib[i] * 0.7)).lerp(cRidge, clamp(H * 0.95)).lerp(cVein, clamp(M * smooth(0.05, 0.35, H)));
      if (ring.suture) tmp.lerp(cSut, 0.75);
      const mot = 0.9 + R() * 0.16; tmp.multiplyScalar(mot);
      col.set([tmp.r, tmp.g, tmp.b], idx * 3);
      min[idx] = clamp(M * smooth(0.05, 0.35, H) * 1.1);
      uv.set([i * 0.06, k / K * 3], idx * 2);
    }
  }
  const index = [];
  for (let i = 0; i < N - 1; i++) for (let k = 0; k < K; k++) { const a0 = i * S + k, b0 = a0 + S; index.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aMineral', new THREE.BufferAttribute(min, 1));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return { geo: g, frames, N };
}

const work = {
  engine: { reverb: 3.0, reverbTone: 0.45 },
  init(api) {
    const r = this.renderer = makeRenderer(api.canvas, { exposure: 1.05 });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#121110');
    scene.fog = new THREE.Fog(scene.background.clone(), 9, 22);
    this.env = envMap(r, 0.04);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    this.view = { yaw: 0, pitch: 0, touched: 0 };
    orbitInput(api.canvas, this.view, api, { yaw: [-Math.PI, Math.PI], pitch: [-0.25, 0.35], speed: 0.008 });

    this.hemi = new THREE.HemisphereLight('#c9cfd6', '#2a2520', 0.5); scene.add(this.hemi);
    this.work = new THREE.DirectionalLight('#e9eef5', 1.6); this.work.position.set(0.5, 6, 4); scene.add(this.work);
    this.key = new THREE.SpotLight('#ffe2b8', 0, 20, 0.42, 0.55, 1.2); this.key.position.set(-3.5, 5.5, 4.2);
    this.key.castShadow = true; this.key.shadow.mapSize.set(1024, 1024); this.key.shadow.bias = -0.0005;
    scene.add(this.key, this.key.target); this.key.target.position.set(0, 1.4, 0);
    this.rim = new THREE.DirectionalLight('#9fb6d8', 0); this.rim.position.set(4, 3, -4); scene.add(this.rim);
    this.front = new THREE.PointLight('#ffcf94', 0, 2.5, 1.6); scene.add(this.front);

    // 標本台：玄武岩台座與黃銅支架
    const basalt = new THREE.MeshStandardMaterial({ color: '#24221f', roughness: 0.78, bumpMap: noiseTexture(256, 11, 5, 3), bumpScale: 0.6 });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.36, 2.0), basalt); plinth.position.y = 0.18; plinth.receiveShadow = true; scene.add(plinth);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 1.8), new THREE.MeshStandardMaterial({ color: '#33302b', roughness: 0.5 })); top.position.y = 0.375; top.receiveShadow = true; scene.add(top);
    const brass = new THREE.MeshStandardMaterial({ color: '#b39461', metalness: 1, roughness: 0.3, envMap: this.env, envMapIntensity: 0.9 });
    this.pin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1, 16), brass); scene.add(this.pin);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.05, 32), brass); foot.position.y = 0.415; scene.add(foot);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: '#141311', roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    this.grain = noiseTexture(256, 5, 5, 1);
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, metalness: 0, bumpMap: this.grain, bumpScale: 3, envMap: this.env, envMapIntensity: 0.35 });
    this.mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aMineral;\nvarying float vMineral;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMineral = aMineral;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vMineral;')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.92, vMineral);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, vMineral);');
    };
    this.capMat = new THREE.MeshStandardMaterial({ color: '#1b1612', roughness: 0.95, side: THREE.DoubleSide });
    this.cap = new THREE.Mesh(new THREE.CircleGeometry(1, 40), this.capMat);
    this.shell = new THREE.Group(); this.shell.scale.setScalar(0.62); scene.add(this.shell);
    this.build(api);
    document.getElementById('regen').addEventListener('click', () => this.regenerate(api));
    document.getElementById('export').addEventListener('click', () => api.exportPNG(`sound-fossil-seed${api.seed}`));
  },

  build(api) {
    if (this.mesh) { this.shell.remove(this.mesh); this.mesh.geometry.dispose(); }
    this.sim = simulate(api.seed);
    const { geo, frames, N } = buildGeometry(this.sim, api.seed);
    this.frames = frames; this.N = N;
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.shell.add(this.mesh); this.shell.add(this.cap);
    // 黃銅支架高度：接到殼的最低點
    const box = new THREE.Box3().setFromBufferAttribute(geo.attributes.position);
    this.center = box.getCenter(new THREE.Vector3());
    this.mesh.position.set(0, -this.center.y, 0); // 旋轉軸通過螺旋中心 this.cap.position.set(0, 0, 0);
    const sc = this.shell.scale.x;
    this.shell.position.set(0, 0.82 + (this.center.y - box.min.y) * sc, 0);
    // 黃銅支架穿到螺旋中心：從第一環起就托住正在生長的殼
    const pinTop = this.shell.position.y + (0 - this.center.y) * sc;
    this.pin.scale.y = pinTop - 0.4; this.pin.position.y = 0.4 + this.pin.scale.y / 2; this.pin.position.z = -0.02;
    this.lookY = this.shell.position.y;
    this.visible = 6; this.specimen = 0; this.complete = false; this.t = 0;
    this.setVisible(6);
    api.readout(`等待第一個音 · seed ${api.seed} · ${PALETTES[this.sim.params.palette].name}`);
  },

  setVisible(n) {
    n = Math.max(2, Math.min(this.N, n));
    this.mesh.geometry.setDrawRange(0, (n - 1) * K * 6);
    const f = this.frames[n - 1];
    this.cap.position.set(f.c.x, f.c.y - this.center.y, 0);
    this.cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.tan);
    this.cap.scale.set(f.rho * 0.96, f.rho * 0.8 * 0.96, 1);
    this.frontPos = new THREE.Vector3(f.c.x, f.c.y - this.center.y, 0).add(f.tan.clone().multiplyScalar(f.rho * 0.6));
  },

  schedule(from, to, api) {
    const e = api.engine, au = api.audible;
    for (const ev of this.sim.score.events) {
      if (ev.t < from || ev.t >= to) continue;
      if (au) {
        const at = api.at(ev.t);
        if (ev.kind === 'rhythm') e.mallet(at, ev.midi, ev.vel, { decay: 0.9, gain: 0.2, pan: ((ev.midi % 12) - 6) / 14, wet: 0.3 });
        else if (ev.phrase === 'ground' || ev.phrase === 'pedal' || ev.phrase === 'end' && ev.midi < 50) e.bass(at, ev.midi, ev.dur, ev.vel * 0.8, { a: 0.2, r: 0.8, gain: 0.3 });
        else e.pad(at, ev.midi, ev.dur, ev.vel * 1.1, { a: 0.28, r: 0.9, bright: 0.55, wave: 'triangle', wave2: 'sawtooth', mix: 0.32, detune: 5, wet: 0.4 });
      }
    }
    if (this.sim.end + 0.4 >= from && this.sim.end + 0.4 < to) api.emit({ t: this.sim.end + 0.4, type: 'complete' });
  },

  onEvent(ev, api) {
    if (ev.type === 'complete' && !this.complete) {
      this.complete = true; this.setVisible(this.N);
      api.readout(`標本已定型 · seed ${api.seed} · ${this.N} 環 · ${this.sim.end.toFixed(1)} 秒`);
      api.finish();
      api.status('曲終：生長停止，留下這首歌的標本。可旋轉觀看、匯出 PNG，或重新生成。');
    }
  },

  update(t, dt, api) {
    this.t = t;
    if (!this.complete) {
      // 顯露所有「已經發生」的環：材料歷史與播放時間一致
      let n = this.visible;
      while (n < this.N && this.sim.rings[n].t <= t) n++;
      if (n !== this.visible) { this.visible = n; this.setVisible(n); }
      const remain = Math.max(0, this.sim.end - t);
      api.readout(`生長中 · 第 ${this.visible} / ${this.N} 環 · 約 ${Math.ceil(remain)} 秒後定型`);
    }
  },

  idle(api) {
    // 曲終後：燈光過渡與緩慢自轉不需要音訊時鐘
    const now = performance.now() / 1000, dt = Math.min(0.1, now - (this.lastIdle || now)); this.lastIdle = now;
    if (this.complete) { this.specimen = approach(this.specimen, 1, dt, 0.9); this.spin = (this.spin || 0) + (api.reduced ? 0 : dt * 0.16); return true; }
    return performance.now() - this.view.touched < 1200;
  },

  render(api) {
    const s = this.specimen || 0, t = this.t || 0;
    this.work.intensity = 1.5 * (1 - s) + 0.15;
    this.hemi.intensity = 0.55 - 0.3 * s;
    this.key.intensity = 46 * s + 4;
    this.rim.intensity = 1.6 * s;
    this.front.intensity = this.complete ? 0 : 2.2;
    if (this.frontPos) this.front.position.copy(this.frontPos).applyMatrix4(this.shell.matrixWorld);
    this.scene.background.setRGB(0.0065 - 0.003 * s, 0.006 - 0.0028 * s, 0.0055 - 0.0026 * s); this.scene.fog.color.copy(this.scene.background);
    const sway = api.reduced ? 0 : Math.sin(t * 0.12) * 0.32;
    this.shell.rotation.y = this.view.yaw + (this.complete ? (this.spin || 0) + 0.32 * Math.sin(0) : sway);
    const cam = this.camera, aspect = cam.aspect;
    const dist = 7.4 / Math.min(1, Math.max(0.5, aspect / 1.2));
    const pitch = 0.1 + this.view.pitch, ly = (this.lookY || 1.6) - 0.15;
    cam.position.set(0, ly + Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    cam.lookAt(0, ly, 0);
    this.renderer.render(this.scene, cam);
  },

  resize(w, h, dpr) { fit(this.renderer, this.camera, w, h, dpr); },

  regenerate(api) {
    const seed = String(1000 + Math.floor(Math.random() * 9000));
    api.setSeed(seed);
    this.build(api);
    api.status(`新的 seed ${seed}：同一個 seed 永遠長出同一枚標本。`);
    if (api.state.started) api.replay(); else api.invalidate();
  },

  reset(api) { this.build(api); this.spin = 0; },
  dispose() { disposeScene(this.scene, this.renderer); }
};

if (typeof window !== 'undefined' && document.getElementById('art')) runWork(work);
