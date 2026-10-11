// three.js 共用設定：渲染器、尺寸與環境光。
import * as THREE from 'three';
import { RoomEnvironment } from '../../../vendor/three/addons/RoomEnvironment.js';

export function makeRenderer(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true, ...opts });
  if (!renderer.getContext()) throw new Error('webgl');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1;
  return renderer;
}

export function envMap(renderer, sigma = 0.04) {
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(new RoomEnvironment(), sigma).texture;
  pm.dispose();
  return tex;
}

export function fit(renderer, camera, w, h, dpr) {
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// 程序化灰階雜訊貼圖（決定性），用於凹凸與顆粒。
export function noiseTexture(size = 256, seed = 7, octaves = 4, repeat = 1) {
  const data = new Uint8Array(size * size * 4);
  let s = seed >>> 0;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const grids = [];
  for (let o = 0; o < octaves; o++) { const n = 4 << o, g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) g[i] = rand(); grids.push([n, g]); }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, amp = 0.5, tot = 0;
    for (const [n, g] of grids) {
      const fx = x / size * n, fy = y / size * n, xi = Math.floor(fx), yi = Math.floor(fy), xf = fx - xi, yf = fy - yi;
      const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
      const at = (a, b) => g[((b % n) * n) + (a % n)];
      const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      v += amp * (a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w); tot += amp; amp *= 0.5;
    }
    const k = Math.round(v / tot * 255), i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = k; data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
  return tex;
}

// 指標拖曳 → 視角（偏航／俯仰），含鍵盤。
export function orbitInput(canvas, view, api, { yaw = [-0.6, 0.6], pitch = [-0.2, 0.25], speed = 0.005 } = {}) {
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    view.yaw = Math.min(yaw[1], Math.max(yaw[0], drag.yaw - (e.clientX - drag.x) * speed));
    view.pitch = Math.min(pitch[1], Math.max(pitch[0], drag.pitch + (e.clientY - drag.y) * speed * 0.6));
    view.touched = performance.now(); api.invalidate();
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      view.yaw = Math.min(yaw[1], Math.max(yaw[0], view.yaw + (e.key === 'ArrowLeft' ? 0.08 : -0.08)));
      view.touched = performance.now(); api.invalidate(); e.preventDefault();
    }
  });
}

export function disposeScene(scene, renderer) {
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { for (const k in x) if (x[k] && x[k].isTexture) x[k].dispose(); x.dispose(); });
  });
  renderer.dispose();
  renderer.forceContextLoss && renderer.forceContextLoss();
}
