// 06 呼吸雕塑《一口氣的肖像》
// 一次發聲 → 一件物件：音高控制扭轉，力度控制厚度，氣息控制孔隙；停頓收成細頸或分成部件。
import * as THREE from 'three';
import { runWork } from '../core/shell.js';
import { makeRenderer, envMap, fit, orbitInput, disposeScene, noiseTexture } from '../core/three-kit.js';
import { clamp, approach, valueNoise2 } from '../core/rng.js';
import { DEMOS, demoLength, sample, Growth } from '../models/breath.js';
import { Microphone } from '../core/mic.js';

const SLOTS = 5, SEG = 44;
const AUTO = [[0.5, 'soft'], [7.0, 'urgent'], [12.5, 'long'], [21.5, 'air']];
const AUTO_END = 28.5;
const FORMANTS = { a: [[730, 1, 9], [1090, 0.5, 10], [2440, 0.2, 12]], o: [[500, 1, 9], [880, 0.45, 10], [2500, 0.14, 12]] };
const MATERIAL_NAMES = { glass: '煙色玻璃', ceramic: '半透明陶瓷', plaster: '細孔石膏' };

function sculptureGeometry(slices, seed) {
  const noise = valueNoise2(seed), parts = new Map();
  for (const s of slices) { if (!parts.has(s.part)) parts.set(s.part, []); parts.get(s.part).push(s); }
  const pos = [], col = [], idx = [];
  for (const list of parts.values()) {
    if (list.length < 2) continue;
    const base = pos.length / 3;
    list.forEach((s, i) => {
      const lean = Math.sin(s.h * 1.7 + seed % 7) * 0.06;
      for (let j = 0; j <= SEG; j++) {
        const ph = (j / SEG) * Math.PI * 2;
        const lobe = 1 + 0.24 * Math.cos(3 * ph + s.twist) + 0.04 * Math.cos(5 * ph - s.twist * 0.5);
        const n = noise(Math.cos(ph) * 3 + 10, s.h * 9) * 0.6 + noise(Math.cos(ph) * 9, s.h * 26) * 0.4;
        const pore = s.air * Math.max(0, n - 0.42) * 0.55;
        const cap = Math.min(1, Math.sqrt(Math.min(i, list.length - 1 - i) / 2 + 0.05)); // 兩端收圓
        const r = s.r * lobe * (1 - pore) * cap;
        pos.push(Math.cos(ph) * r + lean, s.h, Math.sin(ph) * r);
        const dark = 1 - pore * 2.6;
        col.push(dark, dark * 0.99, dark * 0.97);
      }
    });
    for (let i = 0; i < list.length - 1; i++) for (let j = 0; j < SEG; j++) {
      const a = base + i * (SEG + 1) + j, b = a + SEG + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

const work = {
  engine: { reverb: 2.8, reverbTone: 0.5 },
  init(api) {
    const r = this.renderer = makeRenderer(api.canvas, { exposure: 1.0 });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#151816');
    scene.environment = envMap(r, 0.04); scene.environmentIntensity = 0.55;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    this.view = { yaw: 0, pitch: 0, touched: 0 };
    orbitInput(api.canvas, this.view, api, { yaw: [-0.5, 0.5], pitch: [-0.1, 0.25] });

    // 背牆：一道柔和的直立光帶，讓玻璃有東西可以折射
    const wc = document.createElement('canvas'); wc.width = 512; wc.height = 256; const wx = wc.getContext('2d');
    const gr = wx.createLinearGradient(0, 0, 512, 0);
    gr.addColorStop(0, '#141715'); gr.addColorStop(0.3, '#2b312d'); gr.addColorStop(0.5, '#8a948a'); gr.addColorStop(0.7, '#2b312d'); gr.addColorStop(1, '#141715');
    wx.fillStyle = gr; wx.fillRect(0, 0, 512, 256);
    const vg = wx.createLinearGradient(0, 0, 0, 256); vg.addColorStop(0, 'rgba(10,12,11,.85)'); vg.addColorStop(0.6, 'rgba(10,12,11,0)'); vg.addColorStop(1, 'rgba(10,12,11,.4)');
    wx.fillStyle = vg; wx.fillRect(0, 0, 512, 256);
    const wtex = new THREE.CanvasTexture(wc); wtex.colorSpace = THREE.SRGBColorSpace;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), new THREE.MeshBasicMaterial({ map: wtex })); wall.position.set(0, 4, -4.5); scene.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ color: '#141614', roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.5, 1.9), new THREE.MeshStandardMaterial({ color: '#d9d5cb', roughness: 0.92 }));
    plinth.position.y = 0.25; plinth.receiveShadow = true; plinth.castShadow = true; scene.add(plinth);

    scene.add(new THREE.HemisphereLight('#dfe6e0', '#1b1d1b', 0.35));
    const key = new THREE.SpotLight('#fff1de', 60, 30, 0.5, 0.6, 1.2); key.position.set(-3, 8, 6); key.target.position.set(0, 1, 0);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; scene.add(key, key.target);
    const rim = new THREE.DirectionalLight('#b8d0c8', 1.1); rim.position.set(4, 4, -5); scene.add(rim);
    this.glow = new THREE.PointLight('#ffb070', 0, 3, 1.5); scene.add(this.glow);

    const bump = noiseTexture(256, 21, 5, 2);
    this.mats = {
      forming: new THREE.MeshPhysicalMaterial({ color: '#e6c49c', emissive: '#ff8a3d', emissiveIntensity: 0.35, roughness: 0.3, transmission: 0.45, thickness: 0.5, vertexColors: true }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#d8d2c8', roughness: 0.08, transmission: 1, thickness: 0.45, ior: 1.45, attenuationColor: '#9c8a74', attenuationDistance: 2.4, specularIntensity: 1, envMapIntensity: 1.5 }),
      ceramic: new THREE.MeshPhysicalMaterial({ color: '#efe9de', roughness: 0.42, transmission: 0.32, thickness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: '#ffffff', vertexColors: true }),
      plaster: new THREE.MeshStandardMaterial({ color: '#ebe6dc', roughness: 0.97, bumpMap: bump, bumpScale: 2.4, vertexColors: true })
    };
    this.items = []; this.active = null; this.seq = 0; this.auto = true; this.t = 0;
    document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => this.manualDemo(api, b.dataset.value)));
    this.micBtn = document.getElementById('mic');
    this.micBtn.addEventListener('click', () => this.toggleMic(api));
    document.getElementById('export').addEventListener('click', () => api.exportPNG(`breath-portrait-${this.items.length}`));
    this.preview();
  },

  // 播放前：展台上一件以「長吟」規則離線生成的靜態物件（標示為預展，不代表正在分析聲音）
  preview() {
    const g = new Growth(), pts = DEMOS.long.pts;
    for (let t = 0; t < demoLength('long') + 1.5; t += 1 / 30) g.advance(sample(pts, t), 1 / 30);
    const sum = g.finalize();
    this.addItem(g.slices, sum, 'long', true);
  },

  slotX(i, n) { const span = Math.min(SLOTS, Math.max(n, 3)); return (i - (n - 1) / 2) * (span > 3 ? 2.0 : 2.3); },

  addItem(slices, sum, demo, pre = false) {
    const mesh = new THREE.Mesh(sculptureGeometry(slices, 7 + this.seq * 13), this.mats[sum.material].clone());
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.position.y = 0.5;
    if (mesh.material.emissive) mesh.material.emissive.set('#ff8a3d'), mesh.material.emissiveIntensity = pre ? 0 : 0.5;
    const item = { mesh, sum, demo, pre, cool: pre ? 1 : 0, x: 0 };
    this.scene.add(mesh); this.items.push(item);
    while (this.items.length > SLOTS) { const old = this.items.shift(); this.scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose(); }
    this.layout();
    return item;
  },

  layout() {
    const n = this.items.length + (this.active ? 1 : 0);
    this.items.forEach((it, i) => { it.tx = this.slotX(i, n); if (it.x === 0 && !it.placed) { it.x = it.tx; it.placed = true; } });
    if (this.active) this.active.tx = this.slotX(n - 1, n);
  },

  beginBreath(api, t, demo) {
    if (this.active) this.finishBreath(api);
    // 播放後第一件真正的作品出現時，收走預展物件
    const pre = this.items.find(i => i.pre); if (pre) { this.scene.remove(pre.mesh); this.items.splice(this.items.indexOf(pre), 1); }
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mats.forming);
    mesh.position.y = 0.5; mesh.castShadow = true; this.scene.add(mesh);
    this.active = { growth: new Growth(), mesh, demo, start: t, x: 0, tx: 0, last: 0 };
    this.layout(); this.active.x = this.active.tx;
    api.readout(`${demo === 'mic' ? '你的聲音' : DEMOS[demo].name} · 等待發聲`);
  },

  finishBreath(api) {
    const a = this.active; if (!a) return;
    this.active = null; this.scene.remove(a.mesh); a.mesh.geometry.dispose();
    if (a.growth.slices.length < 4) { this.layout(); return; }
    const sum = a.growth.finalize();
    const it = this.addItem(a.growth.slices, sum, a.demo);
    it.x = a.x;
    api.readout(`${a.demo === 'mic' ? '你的聲音' : DEMOS[a.demo].name} · ${MATERIAL_NAMES[sum.material]}\n${sum.parts} 個部件 · 高 ${sum.height.toFixed(2)}`);
  },

  voiceAudio(api, at, demo) {
    if (!api.audible) return;
    const pts = DEMOS[demo].pts.map(([t, m, a, r]) => [t, m == null ? 50 : m, a, m == null ? 1 : r]);
    this.handles = (this.handles || []).filter(h => h && h.end > api.engine.ctx.currentTime);
    at = Math.max(at, api.engine.ctx.currentTime + 0.01); // 主執行緒忙碌時不要整句丟失
    this.handles.push(api.engine.voice(at, pts, { formants: demo === 'long' ? FORMANTS.o : FORMANTS.a, gain: demo === 'air' ? 0.9 : 0.8, vibrato: demo === 'long' ? 5 : 2, wet: 0.32 }));
  },

  schedule(from, to, api) {
    if (!this.auto) return;
    for (const [t, demo] of AUTO) if (t >= from && t < to) { this.voiceAudio(api, api.at(t), demo); api.emit({ t, type: 'demo', demo }); }
    if (AUTO_END >= from && AUTO_END < to) api.emit({ t: AUTO_END, type: 'end' });
  },

  onEvent(ev, api) {
    if (ev.type === 'demo') this.beginBreath(api, ev.t, ev.demo);
    if (ev.type === 'end' && this.auto && !this.active && !this.mic) { api.finish(); api.status('四口氣都已定型。按示範按鈕或「用我的聲音」再做一件。'); }
  },

  async manualDemo(api, demo) {
    if (!api.state.started) await api.play();
    if (api.state.ended) await api.continueAfterEnd();
    if (!api.state.playing) await api.play();
    if (this.mic) this.stopMic(api);
    this.auto = false; api.rewindTo(api.soonest(0), ev => ev.type === 'demo' || ev.type === 'end');
    (this.handles || []).forEach(h => h && h.release(api.engine.ctx ? api.engine.ctx.currentTime : 0, 0.1));
    const t = api.soonest(0.06);
    this.voiceAudio(api, api.at(t), demo);
    api.emit({ t, type: 'demo', demo });
  },

  async toggleMic(api) {
    if (this.mic) return this.stopMic(api, '已關閉麥克風。');
    if (!api.state.started) await api.play();
    if (api.state.ended) await api.continueAfterEnd();
    if (!api.state.playing) await api.play();
    this.micBtn.disabled = true;
    try {
      const mic = new Microphone(api.engine.ctx); await mic.start(); this.mic = mic;
      this.auto = false; api.rewindTo(api.soonest(0), ev => ev.type === 'demo' || ev.type === 'end');
      if (this.active) this.finishBreath(api);
      this.beginBreath(api, this.t, 'mic');
      this.micBtn.textContent = '停止收音'; this.micBtn.setAttribute('aria-pressed', 'true');
      api.status('正在聆聽（本機分析，不錄音、不上傳）。發一個聲音或吐一口氣；停下約一秒後物件定型。', 'sticky');
    } catch (e) { api.status(Microphone.message(e), 'warn'); }
    this.micBtn.disabled = false;
  },

  stopMic(api, msg) {
    if (this.mic) this.mic.stop(); this.mic = null;
    if (this.active && this.active.demo === 'mic') this.finishBreath(api);
    this.micBtn.textContent = '用我的聲音'; this.micBtn.setAttribute('aria-pressed', 'false');
    if (msg) api.status(msg);
  },

  onPlayState(playing, api) { if (!playing && this.mic) this.stopMic(api, '暫停時已關閉麥克風。'); },

  micFeatures() {
    const f = this.mic.features();
    const amp = clamp(f.rms / 0.1), voiced = f.pitch != null && f.clarity > 0.85;
    return { amp, midi: voiced ? f.pitch : null, voiced, air: clamp((f.flatness - 0.06) / 0.35) };
  },

  update(t, dt, api) {
    this.t = t;
    const a = this.active;
    if (a) {
      const f = a.demo === 'mic' ? this.micFeatures() : sample(DEMOS[a.demo].pts, t - a.start);
      const before = a.growth.slices.length;
      a.growth.advance(f, dt);
      if (a.growth.slices.length !== before) {
        a.mesh.geometry.dispose(); a.mesh.geometry = sculptureGeometry(a.growth.slices, 7 + this.seq * 13);
        const last = a.growth.slices[a.growth.slices.length - 1];
        this.tip = last; api.readout(`${a.demo === 'mic' ? '你的聲音' : DEMOS[a.demo].name} · ${last.pause ? '停頓' : f.voiced ? '發聲' : '氣流'}`);
      }
      if (a.growth.done) {
        this.finishBreath(api); this.seq++;
        if (this.mic) this.beginBreath(api, t, 'mic');
        else if (this.auto && t > AUTO_END - 1) { api.finish(); }
      }
    }
    for (const it of this.items) { it.cool = approach(it.cool, 1, dt, 0.6); if (it.mesh.material.emissive) it.mesh.material.emissiveIntensity = 0.5 * (1 - it.cool); }
    this.animate(dt);
  },

  animate(dt) {
    for (const it of this.items) { it.x = approach(it.x, it.tx, dt, 0.5); it.mesh.position.x = it.x; }
    if (this.active) {
      const a = this.active; a.x = approach(a.x, a.tx, dt, 0.4); a.mesh.position.x = a.x;
      const tip = this.tip && this.active.growth.slices.length ? this.tip.h : 0;
      this.glow.position.set(a.x, 0.5 + tip + 0.25, 0.6); this.glow.intensity = 3.5;
    } else this.glow.intensity = approach(this.glow.intensity, 0, dt, 0.5);
  },

  idle(api) {
    const now = performance.now() / 1000, dt = Math.min(0.1, now - (this.lastIdle || now)); this.lastIdle = now;
    const moving = this.items.some(it => Math.abs(it.x - it.tx) > 0.002 || it.cool < 0.99);
    if (moving) { for (const it of this.items) { it.cool = approach(it.cool, 1, dt, 0.6); if (it.mesh.material.emissive) it.mesh.material.emissiveIntensity = 0.5 * (1 - it.cool); } this.animate(dt); }
    return moving || performance.now() - this.view.touched < 1200;
  },

  render(api) {
    const cam = this.camera, aspect = cam.aspect;
    const dist = 8.6 / Math.min(1, Math.max(0.62, aspect / 1.55));
    const yaw = this.view.yaw + (api.reduced ? 0 : Math.sin((this.t || 0) * 0.06) * 0.05), pitch = 0.08 + this.view.pitch;
    const ly = aspect < 1 ? 1.45 : 1.25;
    cam.position.set(Math.sin(yaw) * dist, ly + Math.sin(pitch) * dist, Math.cos(yaw) * dist);
    cam.lookAt(0, ly, 0);
    this.renderer.render(this.scene, cam);
  },
  resize(w, h, dpr) { fit(this.renderer, this.camera, w, h, dpr); },
  reset(api) {
    if (this.mic) this.stopMic(api);
    if (this.active) { this.scene.remove(this.active.mesh); this.active = null; }
    this.items.forEach(it => { this.scene.remove(it.mesh); it.mesh.geometry.dispose(); });
    this.items = []; this.auto = true; this.seq = 0;
  },
  dispose() { if (this.mic) this.mic.stop(); disposeScene(this.scene, this.renderer); }
};

if (typeof window !== 'undefined' && document.getElementById('art')) runWork(work);
