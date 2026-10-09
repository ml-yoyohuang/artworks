// Procedural textures. Everything is drawn on canvases at start-up: no image
// files, so there is nothing to license and nothing to download.
import * as THREE from 'three';

const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif';

function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
/** Tileable value noise on a `period`-cell lattice. */
function vnoise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (a) => ((a % period) + period) % period;
  const a = hash(m(xi), m(yi), seed), b = hash(m(xi + 1), m(yi), seed);
  const c = hash(m(xi), m(yi + 1), seed), d = hash(m(xi + 1), m(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, period, seed, oct = 4) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f, period * f, seed + i * 17); n += amp; amp *= 0.5; f *= 2; }
  return s / n;
}

function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function toTexture(c, { srgb = true, repeat = false, anisotropy = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  return t;
}
function fillPixels(c, fn) {
  const ctx = c.getContext('2d'); const img = ctx.createImageData(c.width, c.height); const d = img.data;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const [r, g, b] = fn(x, y); const i = (y * c.width + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Light polished concrete. One tile covers 2.4 m, with saw-cut joints on its edges. */
export function concreteTile(base = [206, 201, 192], size = 512, seed = 3, joints = true) {
  const c = fillPixels(canvas(size, size), (x, y) => {
    const u = x / size, v = y / size;
    const cloud = fbm(u * 6, v * 6, 6, seed, 5);
    const speck = hash(x, y, seed) ;
    let k = 0.9 + (cloud - 0.5) * 0.16 + (speck > 0.985 ? -0.07 : speck < 0.01 ? 0.05 : 0) + (hash(x >> 1, y >> 1, seed + 9) - 0.5) * 0.025;
    if (joints) {
      const e = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (e < 1.2) k *= 0.93; else if (e < 2.5) k *= 0.985;
    }
    return base.map((ch) => Math.max(0, Math.min(255, ch * k)));
  });
  return toTexture(c, { repeat: true, anisotropy: 8 });
}

/** Barely-there plaster for white walls. */
export function plasterTile(base = [242, 240, 235], seed = 11) {
  const c = fillPixels(canvas(256, 256), (x, y) => {
    const n = fbm(x / 256 * 8, y / 256 * 8, 8, seed, 4);
    const k = 0.985 + (n - 0.5) * 0.04 + (hash(x, y, seed) - 0.5) * 0.012;
    return base.map((ch) => Math.min(255, ch * k));
  });
  return toTexture(c, { repeat: true });
}

/**
 * Wall occlusion: dark at the skirting line and ceiling, softer at corners.
 * u runs along the wall (0..1), v is height / room height.
 */
export function wallAO(roomHeight) {
  const W = 128, H = 256;
  const c = fillPixels(canvas(W, H), (x, y) => {
    const u = x / (W - 1), v = 1 - y / (H - 1), hy = v * roomHeight;
    let ao = 1;
    ao *= 1 - 0.42 * Math.exp(-hy / 0.32);                    // floor contact
    ao *= 1 - 0.30 * Math.exp(-(roomHeight - hy) / 0.55);     // ceiling cove
    ao *= 1 - 0.22 * Math.exp(-Math.min(u, 1 - u) / 0.025);   // corners
    ao *= 0.94 + 0.06 * Math.min(1, hy / roomHeight * 1.6);   // daylight falls from above
    const g = 255 * ao; return [g, g, g];
  });
  return toTexture(c, { srgb: false });
}

/**
 * Floor occlusion + skylight pool for one room. `pools` are rectangles of
 * brighter floor (beneath skylights); `blockers` are benches.
 */
export function floorAO(room, { pools = [], blockers = [], edge = 0.45, strength = 0.38, base = 0.82 } = {}) {
  const wM = room.x1 - room.x0, dM = room.z1 - room.z0;
  const px = 18; // pixels per metre
  const W = Math.ceil(wM * px), H = Math.ceil(dM * px);
  const c = fillPixels(canvas(W, H), (x, y) => {
    const X = room.x0 + (x + 0.5) / px, Z = room.z1 - (y + 0.5) / px;
    const d = Math.min(X - room.x0, room.x1 - X, Z - room.z0, room.z1 - Z);
    let ao = 1 - strength * Math.exp(-d / edge);
    let light = base;
    for (const p of pools) {
      const dx = Math.max(p.x0 - X, 0, X - p.x1), dz = Math.max(p.z0 - Z, 0, Z - p.z1);
      light = Math.max(light, base + (1 - base) * Math.exp(-Math.hypot(dx, dz) / p.soft));
    }
    for (const b of blockers) {
      const dx = Math.max(b.x - b.w / 2 - X, 0, X - b.x - b.w / 2), dz = Math.max(b.z - b.d / 2 - Z, 0, Z - b.z - b.d / 2);
      ao *= 1 - 0.45 * Math.exp(-Math.hypot(dx, dz) / 0.18);
    }
    const g = 255 * ao * light; return [g, g, g];
  });
  return toTexture(c, { srgb: false });
}

/**
 * Corridor surfaces are fully baked: white → grey → black along the length,
 * with fading pools beneath the recessed lights. `kind` is wall | floor | ceiling.
 * u (canvas x) runs along the corridor from the hall (0) to the dark end (1).
 */
export function corridorTexture(kind, length, lights, height) {
  const W = 1024, H = kind === 'wall' ? 160 : 96;
  const c = fillPixels(canvas(W, H), (x, y) => {
    const t = x / (W - 1), along = t * length;
    const across = y / (H - 1);
    const tone = albedoCurve(t);
    let k = tone;
    // texture grain (scaled so dark areas keep a faint concrete/plaster texture)
    const grain = (fbm(x / 24, y / 24, 1e6, kind === 'floor' ? 5 : 8, 3) - 0.5) * (kind === 'floor' ? 0.09 : 0.03);
    k *= 1 + grain;
    if (kind === 'wall') {
      const hy = (1 - across) * height;
      k *= 1 - 0.4 * Math.exp(-hy / 0.3);
      k *= 1 - 0.25 * Math.exp(-(height - hy) / 0.45);
      // pools of light grazing the wall below each fixture
      let p = 0; for (const L of lights) p += L.b * Math.exp(-((along - L.d) ** 2) / 1.1) * Math.exp(-(height - hy) / 1.6);
      k *= 1 + p * 0.45;
    } else if (kind === 'floor') {
      const edge = Math.min(across, 1 - across) * 3.5;
      k *= 1 - 0.35 * Math.exp(-edge / 0.35);
      let p = 0; for (const L of lights) p += L.b * Math.exp(-((along - L.d) ** 2) / 1.6) * Math.exp(-((across - 0.5) ** 2) / 0.09);
      k *= 1 + p * 0.55;
      if ((along % 2.4) < 0.012 * length / 22) k *= 0.85; // floor joints
    } else {
      k *= 0.92;
    }
    const v = Math.max(0, Math.min(255, k * 255));
    return [v * 1.0, v * 0.992, v * 0.975];
  });
  return toTexture(c, { anisotropy: 8 });
}

/** Wall albedo along the corridor: holds white briefly, then sinks toward black. */
export function albedoCurve(t) {
  // white for the first steps, an even grey through the middle, black only at the end
  const s = Math.min(1, Math.max(0, (t - 0.08) / 0.84));
  const e = s * s * (3 - 2 * s) * 0.6 + s * 0.4;
  return 0.03 + 0.86 * Math.pow(1 - e, 1.15);
}

export function radialGlow(size = 128) {
  const c = canvas(size, size); const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: false });
}

/** Light spill on the floor in front of a lightbox: bright at the wall, fading outward. */
export function spillGlow() {
  const W = 128, H = 128; const c = canvas(W, H); const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x / (W - 1)) * 2 - 1, v = y / (H - 1); // v: 0 at wall
    const a = Math.exp(-v * 3.2) * Math.exp(-(u * u) / (0.22 + v * 0.5)) ;
    const i = (y * W + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false });
}

/** Wrap CJK text by measuring each character (no spaces to break on). */
export function wrapText(ctx, text, maxWidth) {
  const lines = []; let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      // keep closing punctuation with the previous line
      if ('，。、；：！？）」』'.includes(ch)) { lines.push(test); line = ''; continue; }
      lines.push(line); line = ch;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Vinyl-lettering style wall text. `blocks` are drawn top to bottom:
 * { text, size (px), weight, spacing (em), color, gap, wrap, lineHeight }.
 * Returns { texture, aspect } for a transparent canvas of width W px.
 */
export function wallText(blocks, W = 1400, pad = 0) {
  const measure = canvas(W, 10).getContext('2d');
  let h = pad; const layout = [];
  for (const b of blocks) {
    measure.font = `${b.weight || 400} ${b.size}px ${FONT}`;
    if ('letterSpacing' in measure) measure.letterSpacing = `${(b.spacing || 0) * b.size}px`;
    const lines = b.wrap ? wrapText(measure, b.text, W - pad * 2) : [b.text];
    const lh = b.size * (b.lineHeight || 1.3);
    layout.push({ b, lines, lh, y: h + (b.gapBefore || 0) });
    h += (b.gapBefore || 0) + lines.length * lh;
  }
  h += pad;
  const c = canvas(W, Math.ceil(h)); const ctx = c.getContext('2d');
  ctx.textBaseline = 'top';
  for (const { b, lines, lh, y } of layout) {
    ctx.font = `${b.weight || 400} ${b.size}px ${FONT}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(b.spacing || 0) * b.size}px`;
    ctx.fillStyle = b.color;
    ctx.textAlign = b.align || 'left';
    const x = b.align === 'right' ? W - pad : b.align === 'center' ? W / 2 : pad;
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh + (lh - b.size) / 2));
  }
  const t = toTexture(c, { anisotropy: 8 });
  t.generateMipmaps = true;
  return { texture: t, aspect: c.width / c.height };
}

/** A small museum label plaque printed on card stock. */
export function plaqueTexture(work, index, dark, medium, artist) {
  const W = 512, H = 300; const c = canvas(W, H); const ctx = c.getContext('2d');
  ctx.fillStyle = dark ? '#121212' : '#f6f4ef'; ctx.fillRect(0, 0, W, H);
  const ink = dark ? 'rgba(226,222,212,0.86)' : '#2b2a27', soft = dark ? 'rgba(226,222,212,0.5)' : 'rgba(43,42,39,0.55)';
  ctx.textBaseline = 'top';
  const set = (w, s, sp) => { ctx.font = `${w} ${s}px ${FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${sp}px`; };
  set(400, 22, 3); ctx.fillStyle = soft; ctx.fillText(String(index).padStart(2, '0'), 34, 32);
  set(500, 40, 3); ctx.fillStyle = ink; ctx.fillText(work.title, 34, 74);
  set(400, 16, 3); ctx.fillStyle = soft; ctx.fillText(work.titleEn.slice(0, 34), 34, 134);
  set(400, 20, 1.5); ctx.fillStyle = ink; ctx.fillText(artist, 34, 186);
  set(400, 20, 1.5); ctx.fillStyle = soft; ctx.fillText(`${medium}　2026`, 34, 222);
  return toTexture(c, { anisotropy: 8 });
}

export { FONT };
