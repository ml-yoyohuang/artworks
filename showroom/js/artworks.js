// Artworks on the walls: framed prints in daylight, lightboxes in the dark.
// Media are loaded lazily (poster first, then a looping video when the
// visitor is near), and only nearby, visible works play.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as TX from './textures.js';

const MEDIA = 'media/';
/** 1 while the post pipeline renders the scene into its target (artwork mask on). */
export const ART_MASK = { value: 0 };
const tmpV = new THREE.Vector3();

export class Artworks {
  constructor(scene, exhibition, placements, quality) {
    this.scene = scene; this.quality = quality; this.exhibition = exhibition;
    this.items = []; this.byId = new Map(); this.pickables = [];
    this.frustum = new THREE.Frustum(); this.projScreen = new THREE.Matrix4();
    this.sampler = document.createElement('canvas'); this.sampler.width = 8; this.sampler.height = 5;
    this.sctx = this.sampler.getContext('2d', { willReadFrequently: true });
    this.glowTex = TX.radialGlow(); this.spillTex = TX.spillGlow();
    this.prefersWebm = document.createElement('video').canPlayType('video/webm; codecs="vp9"') !== '';
    this.reducedMotion = false; this.focusedId = null; this.suspended = false;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2927, roughness: 0.55, metalness: 0.1 });
    const matBoard = new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.95, emissive: 0xfbfaf6, emissiveIntensity: 0.12 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.5, metalness: 0.2 });

    exhibition.works.forEach((work, i) => {
      const p = placements.get(work.id);
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      g.rotation.y = Math.atan2(p.nx, p.nz); // local +z = outward normal
      const pal = new THREE.Color(work.palette[0]);
      const imgMat = new THREE.MeshBasicMaterial({ color: pal, toneMapped: false, fog: false }); // artworks are never fogged
      // alpha 0 marks artwork pixels, so post-processing can leave them untouched
      // (only while post-processing reads it; on screen alpha must stay 1)
      imgMat.onBeforeCompile = (sh) => {
        sh.uniforms.uArtMask = ART_MASK;
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uArtMask;')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n\tgl_FragColor.a = mix( gl_FragColor.a, 0.0, uArtMask );');
      };
      imgMat.customProgramCacheKey = () => 'artwork-mask';
      // stencil 1 marks artwork pixels so floating dust is never drawn over a work
      Object.assign(imgMat, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
      const image = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), imgMat);
      const item = { work, index: i + 1, place: p, group: g, image, imgMat, poster: null, video: null, vtex: null,
        state: 'idle', playing: false, color: new THREE.Color(work.palette[0]), targetColor: new THREE.Color(work.palette[0]),
        lastSample: 0, glow: null, spill: null, light: null };

      if (p.style === 'print') {
        const mat = 0.11, fw = 0.022, depth = 0.035;
        const W = p.w + mat * 2, H = p.h + mat * 2;
        const board = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.012), matBoard);
        board.position.set(0, p.y, depth - 0.01); board.castShadow = true; board.receiveShadow = true; g.add(board);
        const bars = [[W + fw * 2, fw, 0, H / 2 + fw / 2], [W + fw * 2, fw, 0, -H / 2 - fw / 2], [fw, H, -W / 2 - fw / 2, 0], [fw, H, W / 2 + fw / 2, 0]];
        for (const [bw, bh, bx, by] of bars) {
          const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth + 0.01), frameMat);
          b.position.set(bx, p.y + by, (depth + 0.01) / 2); b.castShadow = true; g.add(b);
        }
        image.position.set(0, p.y, depth - 0.0035);
        // thin bevel shadow line inside the mat
        const bevel = new THREE.Mesh(new THREE.PlaneGeometry(p.w + 0.008, p.h + 0.008), new THREE.MeshBasicMaterial({ color: 0xd9d6cd }));
        bevel.position.set(0, p.y, depth - 0.0038); g.add(bevel);
      } else {
        const bez = p.finale ? 0.05 : 0.035, depth = 0.09;
        const box = new THREE.Mesh(new THREE.BoxGeometry(p.w + bez * 2, p.h + bez * 2, depth), boxMat);
        box.position.set(0, p.y, depth / 2); g.add(box);
        image.position.set(0, p.y, depth + 0.001);
        // soft halo on the wall and a spill of colour on the floor
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(p.w * 2.2, p.h * 2.6), new THREE.MeshBasicMaterial({ map: this.glowTex, color: pal, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        glow.position.set(0, p.y, 0.004); g.add(glow);
        const spill = new THREE.Mesh(new THREE.PlaneGeometry(p.w * 2.1, 2.6), new THREE.MeshBasicMaterial({ map: this.spillTex, color: pal, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.003, 1.3); g.add(spill);
        item.glow = glow; item.spill = spill;
      }
      g.add(image);

      // wall label to the right of the work
      const dark = p.style === 'lightbox';
      const medium = exhibition.media[work.kind];
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.117), new THREE.MeshBasicMaterial({ map: TX.plaqueTexture(work, i + 1, dark, medium, exhibition.artist), toneMapped: !dark, color: dark ? 0x9a978f : 0xffffff }));
      const px = p.w / 2 + (p.style === 'print' ? 0.45 : 0.42);
      plaque.position.set(px, p.style === 'print' ? 1.22 : 1.18, 0.006);
      if (p.finale) plaque.position.set(p.w / 2 + 0.5, 1.2, 0.006);
      g.add(plaque);

      image.userData.workId = work.id; plaque.userData.workId = work.id;
      this.pickables.push(image, plaque);
      item.worldCenter = new THREE.Vector3(p.x + p.nx * 0.05, p.y, p.z + p.nz * 0.05);
      item.sphere = new THREE.Sphere(item.worldCenter, Math.hypot(p.w, p.h) / 2 + 0.2);
      scene.add(g);
      this.items.push(item); this.byId.set(work.id, item);
    });

    // A fixed pool of area lights is re-assigned to the nearest lightboxes, so
    // shader programs never recompile as the visitor walks.
    RectAreaLightUniformsLib.init();
    this.lights = [];
    for (let i = 0; i < quality.areaLights; i++) {
      const l = new THREE.RectAreaLight(0xffffff, 0, 1, 1);
      l.userData.color = new THREE.Color(); scene.add(l); this.lights.push(l);
    }
  }

  get(id) { return this.byId.get(id); }

  /** Load posters for a set of works; resolves when all have settled. */
  loadPosters(ids, onProgress) {
    const loader = new THREE.TextureLoader();
    let done = 0;
    return Promise.all(ids.map((id) => new Promise((resolve) => {
      const it = this.byId.get(id);
      if (!it || it.poster) { onProgress?.(++done, ids.length); return resolve(); }
      loader.load(`${MEDIA}${id}.webp`, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        it.poster = tex;
        if (!it.vtex) { it.imgMat.map = tex; it.imgMat.color.set(0xffffff); it.imgMat.needsUpdate = true; }
        this.sampleColor(it, tex.image);
        it.color.copy(it.targetColor);
        onProgress?.(++done, ids.length); resolve();
      }, undefined, () => { onProgress?.(++done, ids.length); resolve(); });
    })));
  }

  ensureVideo(it) {
    if (it.video) return;
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto';
    v.src = `${MEDIA}${it.work.id}.${this.prefersWebm ? 'webm' : 'mp4'}`;
    // Swap the poster for the video only once frames are actually being presented,
    // otherwise a paused, never-played video would show as black.
    const swap = () => {
      if (it.vtex) return;
      const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
      it.vtex = t; it.imgMat.map = t; it.imgMat.color.set(0xffffff); it.imgMat.needsUpdate = true;
    };
    if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(swap);
    else v.addEventListener('playing', swap, { once: true });
    v.addEventListener('error', () => { it.videoFailed = true; }, { once: true });
    it.video = v;
  }

  play(it) {
    if (it.playing || it.videoFailed) return;
    this.ensureVideo(it); it.playing = true;
    const p = it.video.play(); if (p && p.catch) p.catch(() => { it.playing = false; });
  }
  pause(it) {
    if (!it.playing) return;
    it.playing = false; it.video.pause();
    if (it.vtex && it.video.readyState >= 2) it.vtex.needsUpdate = true; // keep the last frame, not black
  }
  pauseAll() { this.items.forEach((it) => this.pause(it)); }

  /** Average colour of an image/video frame, normalised to its brightest channel. */
  sampleColor(it, src) {
    try {
      this.sctx.drawImage(src, 0, 0, 8, 5);
      const d = this.sctx.getImageData(0, 0, 8, 5).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      it.targetColor.setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
    } catch (e) { /* not decodable yet */ }
  }

  /**
   * Per-frame: decide which videos play, sample colours, and re-assign lights.
   */
  update(camera, dt, now) {
    this.projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreen);
    const cam = camera.position;
    const maxPlay = this.quality.maxVideos;

    // ---- playback ----
    const cands = [];
    for (const it of this.items) {
      const d = it.worldCenter.distanceTo(cam);
      it.dist = d;
      // facing: only from the front half-space
      const front = (cam.x - it.place.x) * it.place.nx + (cam.z - it.place.z) * it.place.nz > 0.2;
      it.visible = front && this.frustum.intersectsSphere(it.sphere);
      const range = it.place.finale ? 30 : it.place.style === 'lightbox' ? 15 : 12;
      if (d < range + 6 && front) this.ensureVideo(it); // start buffering a little ahead
      const allowed = !this.suspended && (!this.reducedMotion || this.focusedId === it.work.id);
      if (allowed && it.visible && d < range) cands.push(it);
    }
    cands.sort((a, b) => (a.work.id === this.focusedId ? -1 : b.work.id === this.focusedId ? 1 : a.dist - b.dist));
    const keep = new Set(cands.slice(0, maxPlay));
    for (const it of this.items) (keep.has(it) ? this.play(it) : this.pause(it));

    // ---- colour sampling & light pool (lightboxes only) ----
    const boxes = this.items.filter((it) => it.place.style === 'lightbox');
    boxes.sort((a, b) => a.dist - b.dist);
    const N = this.lights.length;
    for (const it of boxes.slice(0, Math.max(N, 4))) {
      if (now - it.lastSample > 220) {
        it.lastSample = now + Math.random() * 40;
        const src = it.vtex && it.video.readyState >= 2 ? it.video : it.poster?.image;
        if (src) this.sampleColor(it, src);
      }
    }
    const k = 1 - Math.exp(-dt * 3);
    for (const it of boxes) {
      it.color.lerp(it.targetColor, k);
      if (it.glow) {
        it.glow.material.color.copy(it.color);
        it.spill.material.color.copy(it.color);
      }
    }
    const cutoff = boxes.length > N ? boxes[N].dist : Infinity;
    for (let i = 0; i < N; i++) {
      const l = this.lights[i], it = boxes[i];
      if (!it) { l.intensity = 0; continue; }
      const p = it.place;
      const fade = Math.min(1, Math.max(0, (cutoff - it.dist) / 2.5));
      l.width = p.w; l.height = p.h;
      l.position.set(p.x + p.nx * 0.1, p.y, p.z + p.nz * 0.1);
      tmpV.set(p.x + p.nx * 5, p.y, p.z + p.nz * 5); l.lookAt(tmpV);
      const c = it.color; const m = Math.max(c.r, c.g, c.b, 1e-3);
      l.color.setRGB(c.r / m, c.g / m, c.b / m);
      const strength = (p.finale ? 14 : 11) * (0.22 + 0.78 * Math.sqrt(m));
      l.intensity = strength * fade;
    }
  }
}
