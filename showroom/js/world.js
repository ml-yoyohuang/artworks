// Builds the architecture: rooms, doors, benches, wall texts and
// the daylight rig. Returns handles the app needs every frame (zone lighting).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ROOMS, DOORS, BENCHES, WINDOWS, WALL, corridorProgress } from './plan.js';
import * as TX from './textures.js';
import { STYLE } from './style.config.js';
import { createSky, createGround, createJars, createWindTrails, createClouds, createDust } from './atmosphere.js';
import { sandMaterial, wallMaterial, setSparkle, albedo } from './materials.js';

const TILE = 2.4; // metres covered by one concrete tile

/** Quad with world-scaled uv (tiling) and a normalised uv1 (baked maps). */
function quad(p, uv1, normal) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(p.flatMap((v) => [v.x, v.y, v.z]));
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 2, 3].flatMap(() => [normal.x, normal.y, normal.z])), 3));
  const uvTile = p.map((v) => {
    if (Math.abs(normal.y) > 0.5) return [v.x / TILE, -v.z / TILE];
    if (Math.abs(normal.x) > 0.5) return [-v.z * Math.sign(normal.x) / TILE, v.y / TILE];
    return [v.x * Math.sign(normal.z) / TILE, v.y / TILE];
  });
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvTile.flat()), 2));
  g.setAttribute('uv1', new THREE.BufferAttribute(new Float32Array(uv1.flat()), 2));
  // winding: make the face front-facing along `normal`
  const e1 = p[1].clone().sub(p[0]), e2 = p[2].clone().sub(p[0]);
  const flip = e1.cross(e2).dot(normal) < 0;
  g.setIndex(flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
  return g;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

const sideHeight = (room, side) => (room.walls && room.walls[side]) ?? room.h;

/**
 * Wall pieces of one room side. side: 'n' (z=z0, faces +z), 's' (z=z1, faces -z),
 * 'w' (x=x0, faces +x), 'e' (x=x1, faces -x). Doors and windows are cut out.
 * With `outward`, builds the exterior face of the same wall (WALL thick), leaving
 * out stretches that are the inner face of a neighbouring room.
 */
function wallSide(room, side, material, uvFor, { outward = false, height = sideHeight(room, side) } = {}) {
  const meshes = [];
  const alongX = side === 'n' || side === 's';
  const inner = { n: room.z0, s: room.z1, w: room.x0, e: room.x1 }[side];
  const away = side === 'n' || side === 'w' ? -1 : 1;
  const fixed = outward ? inner + away * WALL : inner;
  let normal = { n: V(0, 0, 1), s: V(0, 0, -1), w: V(1, 0, 0), e: V(-1, 0, 0) }[side];
  if (outward) normal = normal.clone().negate();
  const ext = outward ? WALL : 0;
  const s0 = (alongX ? room.x0 : room.z0) - ext, s1 = (alongX ? room.x1 : room.z1) + ext;
  const openings = DOORS.filter((d) => (d.a === room.id || d.b === room.id) && (alongX ? d.axis === 'z' : d.axis === 'x'))
    .filter((d) => alongX ? Math.abs((d.z0 + d.z1) / 2 - inner) < 0.5 : Math.abs((d.x0 + d.x1) / 2 - inner) < 0.5)
    .map((d) => ({ a: alongX ? d.x0 : d.z0, b: alongX ? d.x1 : d.z1, top: d.h, bottom: 0 }));
  for (const w of WINDOWS) if (w.room === room.id && w.side === side) openings.push({ a: w.a, b: w.b, top: w.head, bottom: w.sill });
  if (outward) {
    for (const o of Object.values(ROOMS)) {
      if (o === room) continue;
      const opp = { n: o.z1, s: o.z0, w: o.x1, e: o.x0 }[side];
      if (Math.abs(opp - fixed) > 0.02) continue;
      const a = Math.max(s0, alongX ? o.x0 : o.z0), b = Math.min(s1, alongX ? o.x1 : o.z1);
      if (b > a) openings.push({ a, b, top: height, bottom: 0, covered: true });
    }
  }
  openings.sort((p, q) => p.a - q.a);
  const pt = (s, y) => (alongX ? V(s, y, fixed) : V(fixed, y, s));
  const piece = (a, b, y0, y1) => {
    if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
    const P = [pt(a, y0), pt(b, y0), pt(b, y1), pt(a, y1)];
    const U = P.map((q) => uvFor ? uvFor(q, alongX ? q.x : q.z) : [((alongX ? q.x : q.z) - s0) / (s1 - s0), q.y / room.h]);
    const m = new THREE.Mesh(quad(P, U, normal), material);
    m.receiveShadow = true; meshes.push(m);
  };
  let cur = s0;
  for (const o of openings) {
    const a = Math.max(o.a, cur);
    piece(cur, a, 0, height);
    if (o.b > a) {
      if (!o.covered) { piece(a, o.b, Math.min(o.top, height), height); piece(a, o.b, 0, o.bottom); }
      else if (!outward) piece(a, o.b, 0, height);
    }
    cur = Math.max(cur, o.b);
  }
  piece(cur, s1, 0, height);
  return meshes;
}

/** Flat top of a wall (open-air rooms), spanning its thickness. */
function wallCap(room, side, material) {
  const h = sideHeight(room, side);
  const alongX = side === 'n' || side === 's';
  const inner = { n: room.z0, s: room.z1, w: room.x0, e: room.x1 }[side];
  const outer = inner + (side === 'n' || side === 'w' ? -1 : 1) * WALL;
  const s0 = (alongX ? room.x0 : room.z0) - WALL, s1 = (alongX ? room.x1 : room.z1) + WALL;
  const lo = Math.min(inner, outer), hi = Math.max(inner, outer);
  const P = alongX ? [V(s0, h, lo), V(s1, h, lo), V(s1, h, hi), V(s0, h, hi)] : [V(lo, h, s0), V(hi, h, s0), V(hi, h, s1), V(lo, h, s1)];
  return new THREE.Mesh(quad(P, P.map(() => [0.5, 0.5]), V(0, 1, 0)), material);
}

/** Reveal faces of a window through the wall thickness. */
function windowReveal(w, material) {
  const room = ROOMS[w.room];
  const alongX = w.side === 'n' || w.side === 's';
  const inner = { n: room.z0, s: room.z1, w: room.x0, e: room.x1 }[w.side];
  const outer = inner + (w.side === 'n' || w.side === 'w' ? -1 : 1) * WALL;
  const lo = Math.min(inner, outer), hi = Math.max(inner, outer);
  const faces = alongX
    ? [[[V(w.a, w.sill, lo), V(w.b, w.sill, lo), V(w.b, w.sill, hi), V(w.a, w.sill, hi)], V(0, 1, 0)],
       [[V(w.a, w.head, lo), V(w.b, w.head, lo), V(w.b, w.head, hi), V(w.a, w.head, hi)], V(0, -1, 0)],
       [[V(w.a, w.sill, lo), V(w.a, w.sill, hi), V(w.a, w.head, hi), V(w.a, w.head, lo)], V(1, 0, 0)],
       [[V(w.b, w.sill, lo), V(w.b, w.sill, hi), V(w.b, w.head, hi), V(w.b, w.head, lo)], V(-1, 0, 0)]]
    : [];
  return faces.map(([P, n]) => { const m = new THREE.Mesh(quad(P, P.map(() => [0.5, 0.5]), n), material); m.receiveShadow = true; m.castShadow = true; return m; });
}

/** Horizontal surface, optionally with rectangular holes. */
function slab(room, y, normalY, material, holes = []) {
  const xs = [room.x0, room.x1, ...holes.flatMap((h) => [h.x0, h.x1])].sort((a, b) => a - b);
  const zs = [room.z0, room.z1, ...holes.flatMap((h) => [h.z0, h.z1])].sort((a, b) => a - b);
  const meshes = [];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1];
    if (x1 - x0 < 1e-3 || z1 - z0 < 1e-3) continue;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (holes.some((h) => cx > h.x0 && cx < h.x1 && cz > h.z0 && cz < h.z1)) continue;
    const P = [V(x0, y, z0), V(x1, y, z0), V(x1, y, z1), V(x0, y, z1)];
    const U = P.map((q) => [(q.x - room.x0) / (room.x1 - room.x0), (q.z - room.z0) / (room.z1 - room.z0)]);
    const m = new THREE.Mesh(quad(P, U, V(0, normalY, 0)), material);
    m.receiveShadow = true; meshes.push(m);
  }
  return meshes;
}

function textPlane(tex, width, aspect, material = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width / aspect), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, ...material }));
  m.renderOrder = 2;
  return m;
}

export function buildWorld(scene, renderer, exhibition, quality) {
  const halls = Object.fromEntries(exhibition.halls.map((h) => [h.id, h]));
  const { lobby: L, garden: G, corridor: C, darkroom: D } = ROOMS;

  // ---------- materials ----------
  const aoLobby = TX.wallAO(L.h, false), aoGarden = TX.wallAO(G.h, false), aoDark = TX.wallAO(D.h);
  for (const t of [aoLobby, aoGarden, aoDark]) t.channel = 1;

  const whiteWall = (ao) => wallMaterial(ao);
  const lobbyWall = whiteWall(aoLobby), gardenWall = whiteWall(aoGarden);

  const benchesIn = (room) => BENCHES.filter((b) => b.room === room);
  const floorMat = (room, opts) => {
    const ao = TX.floorAO(room, opts); ao.channel = 1;
    return sandMaterial({ aoMap: ao });
  };


  const group = new THREE.Group(); scene.add(group);
  const add = (arr) => arr.forEach((m) => group.add(m));

  // ---------- lobby ----------
  const outerWall = wallMaterial(null);
  const shadowing = (arr) => arr.map((m) => { m.castShadow = true; return m; });
  const openRoom = (room, innerMat) => {
    for (const s of ['n', 's', 'w', 'e']) {
      add(shadowing(wallSide(room, s, innerMat)));
      add(shadowing(wallSide(room, s, outerWall, null, { outward: true })));
      group.add(wallCap(room, s, outerWall));
    }
  };
  add(slab(L, 0, 1, floorMat(L, { base: 0.94 })));
  openRoom(L, lobbyWall);

  // ---------- garden ----------
  add(slab(G, 0, 1, floorMat(G, { blockers: benchesIn('garden'), base: 0.94 })));
  const PL = ROOMS.plane;
  add(slab(PL, 0, 1, floorMat(PL, { blockers: benchesIn('plane'), base: 0.94 })));
  openRoom(PL, gardenWall);
  openRoom(G, gardenWall);
  for (const w of WINDOWS) add(windowReveal(w, outerWall));

  // ---------- corridor: baked white → black ----------
  const len = C.z1 - C.z0;
  const fixtures = [];
  for (let d = 1.6; d < len - 2.5; d += 2.9) {
    const t = d / len;
    fixtures.push({ d, b: Math.max(0, 1 - Math.pow(t / 0.78, 1.6)) });
  }
  const cWall = TX.corridorTexture('wall', len, fixtures, C.h); cWall.channel = 1;
  const cFloor = TX.corridorTexture('floor', len, fixtures, C.h); cFloor.channel = 1;
  const cCeil = TX.corridorTexture('ceiling', len, fixtures, C.h); cCeil.channel = 1;
  const corridorWallMat = new THREE.MeshStandardMaterial({ map: cWall, color: albedo(STYLE.walls.color, STYLE.walls.albedoSaturation), roughness: 1 });
  const corridorFloorMat = new THREE.MeshStandardMaterial({ map: cFloor, color: albedo(STYLE.palette.groundLight, STYLE.ground.albedoSaturation), roughness: 0.8 });
  const corridorCeilMat = new THREE.MeshStandardMaterial({ map: cCeil, color: albedo(STYLE.walls.color, STYLE.walls.albedoSaturation), roughness: 1 });
  const alongU = (q) => [(C.z1 - q.z) / len, q.y / C.h];
  add(wallSide(C, 'w', corridorWallMat, alongU));
  add(wallSide(C, 'e', corridorWallMat, alongU));
  // end wall: darkest tone
  add(wallSide(C, 'n', new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 })));
  // floor & ceiling with uv1 along the corridor
  {
    const P = [V(C.x0, 0, C.z0), V(C.x1, 0, C.z0), V(C.x1, 0, C.z1), V(C.x0, 0, C.z1)];
    const U = P.map((q) => [(C.z1 - q.z) / len, (q.x - C.x0) / (C.x1 - C.x0)]);
    const f = new THREE.Mesh(quad(P, U, V(0, 1, 0)), corridorFloorMat); f.receiveShadow = true; group.add(f);
    const Pc = P.map((q) => V(q.x, C.h, q.z));
    group.add(new THREE.Mesh(quad(Pc, U, V(0, -1, 0)), corridorCeilMat));
  }
  // recessed downlights whose brightness drains away
  const discGeo = new THREE.CircleGeometry(0.11, 24);
  for (const fx of fixtures) {
    const z = C.z1 - fx.d;
    const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.9).multiplyScalar(0.04 + 1.5 * fx.b) }));
    disc.rotation.x = Math.PI / 2; disc.position.set(0, C.h - 0.004, z); group.add(disc);
  }

  // ---------- darkroom ----------
  const darkWall = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.9, aoMap: aoDark });
  const darkFloorAO = TX.floorAO(D, { blockers: benchesIn('darkroom'), base: 1, strength: 0.5, edge: 0.6 }); darkFloorAO.channel = 1;
  const darkFloor = new THREE.MeshStandardMaterial({ color: 0x101011, aoMap: darkFloorAO, roughness: quality.tier === 'low' ? 0.42 : 0.3, metalness: 0 });
  add(slab(D, 0, 1, darkFloor));
  add(slab(D, D.h, -1, new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 1 })));
  for (const s of ['n', 's', 'w', 'e']) add(wallSide(D, s, darkWall));
  for (const room of [C, D]) {
    const top = room.h + 0.25;
    for (const s of ['n', 's', 'w', 'e']) add(shadowing(wallSide(room, s, outerWall, null, { outward: true, height: top })));
    const roof = { x0: room.x0 - WALL, x1: room.x1 + WALL, z0: room.z0 - WALL, z1: room.z1 + WALL };
    add(slab(roof, top, 1, outerWall));
  }

  // ---------- door reveals ----------
  for (const d of DOORS) {
    const mat = d.b === 'darkroom' ? darkWall : d.b === 'lobby' || d.a === 'lobby' ? lobbyWall : gardenWall;
    const faces = d.axis === 'z'
      ? [[[V(d.x0, 0, d.z0), V(d.x0, 0, d.z1), V(d.x0, d.h, d.z1), V(d.x0, d.h, d.z0)], V(1, 0, 0)],
         [[V(d.x1, 0, d.z0), V(d.x1, 0, d.z1), V(d.x1, d.h, d.z1), V(d.x1, d.h, d.z0)], V(-1, 0, 0)],
         [[V(d.x0, d.h, d.z0), V(d.x1, d.h, d.z0), V(d.x1, d.h, d.z1), V(d.x0, d.h, d.z1)], V(0, -1, 0)]]
      : [[[V(d.x0, 0, d.z0), V(d.x1, 0, d.z0), V(d.x1, d.h, d.z0), V(d.x0, d.h, d.z0)], V(0, 0, 1)],
         [[V(d.x0, 0, d.z1), V(d.x1, 0, d.z1), V(d.x1, d.h, d.z1), V(d.x0, d.h, d.z1)], V(0, 0, -1)],
         [[V(d.x0, d.h, d.z0), V(d.x1, d.h, d.z0), V(d.x1, d.h, d.z1), V(d.x0, d.h, d.z1)], V(0, -1, 0)]];
    for (const [P, n] of faces) group.add(new THREE.Mesh(quad(P, P.map(() => [0.5, 0.5]), n), mat));
    // threshold
    const P = [V(d.x0, 0.001, d.z0), V(d.x1, 0.001, d.z0), V(d.x1, 0.001, d.z1), V(d.x0, 0.001, d.z1)];
    const thr = new THREE.Mesh(quad(P, P.map(() => [0.5, 0.5]), V(0, 1, 0)), d.b === 'darkroom' ? darkFloor : new THREE.MeshStandardMaterial({ color: albedo(STYLE.palette.groundDeep, STYLE.ground.albedoSaturation), roughness: 1 }));
    group.add(thr);
  }
  // corridor walls continue through the hall's end wall
  {
    const dz = DOORS.find((d) => d.b === 'corridor');
    for (const x of [dz.x0, dz.x1]) {
      const n = V(x < 0 ? 1 : -1, 0, 0);
      const P = [V(x, 0, dz.z0), V(x, 0, dz.z1), V(x, dz.h, dz.z1), V(x, dz.h, dz.z0)];
      group.add(new THREE.Mesh(quad(P, P.map((q) => [0, q.y / C.h]), n), corridorWallMat));
    }
  }

  // ---------- benches ----------
  for (const b of BENCHES) {
    const dark = b.room === 'darkroom';
    const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: dark ? 0.6 : 0.85 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.07, b.d), mat);
    top.position.set(b.x, b.h - 0.035, b.z); top.castShadow = true; top.receiveShadow = true; group.add(top);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, b.h - 0.07, b.d * 0.92), mat);
      leg.position.set(b.x + sx * (b.w / 2 - 0.18), (b.h - 0.07) / 2, b.z); leg.castShadow = true; group.add(leg);
    }
  }

  // ---------- wall texts ----------
  const ink = '#2c2b28', soft = 'rgba(44,43,40,0.62)';
  {
    // Lobby: title lettering to the left of the door, credits to the right.
    const t = TX.wallText([
      { text: exhibition.title, size: 150, weight: 300, spacing: 0.32, color: ink, lineHeight: 1.2 },
      { text: exhibition.titleEn, size: 34, spacing: 0.42, color: soft, gapBefore: 40 },
    ], 1500);
    const m = textPlane(t.texture, 3.9, t.aspect); m.position.set(4.3, 2.55, L.z0 + 0.01); group.add(m);
    const c = TX.wallText([
      { text: exhibition.artist, size: 40, spacing: 0.12, color: ink, align: 'right' },
      { text: exhibition.credits, size: 32, spacing: 0.1, color: soft, gapBefore: 24, align: 'right' },
    ], 1100);
    const m2 = textPlane(c.texture, 2.6, c.aspect); m2.position.set(-3.6, 2.2, L.z0 + 0.01); group.add(m2);
  }
  const hallText = (hall, dark, width) => TX.wallText([
    { text: hall.label, size: 30, spacing: 0.3, color: dark ? 'rgba(220,216,206,0.62)' : soft },
    { text: hall.name, size: 96, weight: 300, spacing: 0.22, color: dark ? 'rgba(232,228,218,0.9)' : ink, gapBefore: 18 },
    { text: hall.nameEn, size: 24, spacing: 0.36, color: dark ? 'rgba(220,216,206,0.55)' : soft, gapBefore: 18 },
    { text: hall.intro, size: 31, spacing: 0.06, color: dark ? 'rgba(226,222,212,0.78)' : ink, gapBefore: 54, wrap: true, lineHeight: 1.95 },
  ], width);
  {
    const t = hallText(halls.garden, false, 1100);
    const m = textPlane(t.texture, 2.2, t.aspect); m.rotation.y = Math.PI / 2;
    m.position.set(G.x0 + 0.01, 1.62, -2.35); group.add(m);
  }
  {
    const t = hallText(halls.plane, false, 1100);
    const m = textPlane(t.texture, 2.2, t.aspect); m.rotation.y = Math.PI / 2;
    m.position.set(ROOMS.plane.x0 + 0.01, 1.62, ROOMS.plane.z1 - 2.2); group.add(m);
  }
  {
    const t = hallText(halls.corridor, false, 1000);
    const m = textPlane(t.texture, 1.5, t.aspect); m.rotation.y = Math.PI / 2;
    m.position.set(C.x0 + 0.01, 1.55, C.z1 - 1.9); group.add(m);
  }
  {
    const t = hallText(halls.darkroom, true, 1100);
    const m = textPlane(t.texture, 1.9, t.aspect, { opacity: 0.92 });
    m.position.set(-3.55, 1.62, D.z0 + 0.01); group.add(m);
  }

  // ---------- light rig ----------
  const D_ = STYLE.daylight, P_ = STYLE.palette, LT = STYLE.light;
  const hemi = new THREE.HemisphereLight(new THREE.Color(LT.hemiSky), new THREE.Color(LT.hemiGround), LT.hemiIntensity);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(new THREE.Color(LT.sunColor), LT.sunIntensity);
  {
    // azimuth 0 = light travelling toward −z; position is opposite the travel direction
    const el = THREE.MathUtils.degToRad(LT.sunElevation), az = THREE.MathUtils.degToRad(LT.sunAzimuth);
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    sun.target.position.set(0, 0, -19);
    sun.position.copy(sun.target.position).addScaledVector(dir, 45);
  }
  scene.add(sun, sun.target);
  if (quality.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    const cam = sun.shadow.camera; cam.left = -34; cam.right = 34; cam.top = 34; cam.bottom = -34; cam.near = 1; cam.far = 110;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = LT.shadowRadius; sun.shadow.intensity = LT.shadowIntensity;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  }
  // soft room reflections for the day halls
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  pmrem.dispose();

  // sky + fog: horizon-coloured in daylight, sinking to black toward the darkroom
  const sky = createSky(); scene.add(sky);
  scene.add(createGround());
  const jars = createJars(); scene.add(jars);
  const trails = createWindTrails(); scene.add(trails);
  const clouds = createClouds(); scene.add(clouds);
  const dust = createDust(quality.dust); scene.add(dust);
  scene.background = null;
  const fogDay = new THREE.Color(P_.skyHorizon), fogDark = new THREE.Color(STYLE.fog.darkColor);
  scene.fog = new THREE.FogExp2(fogDay.clone(), STYLE.fog.density);

  /** Zone lighting: `day` is 1 in daylight halls, 0 deep in the darkroom. */
  let day = 1;
  function dayAt(pos) {
    if (pos.z > C.z1 - 0.2 && pos.x > -7.5) return 1;
    if (pos.x < D.x1 + 0.4) return Math.max(0, 0.012 * (1 - (D.x1 - pos.x) / 6));
    const t = corridorProgress(pos.z);
    const s = Math.min(1, Math.max(0, (t - 0.18) / 0.8));
    return 1 - 0.985 * (s * s * (3 - 2 * s));
  }
  function update(pos, dt) {
    const target = dayAt(pos);
    day += (target - day) * Math.min(1, dt * 2.2);
    hemi.intensity = LT.hemiIntensity * day;
    sun.intensity = LT.sunIntensity * day;
    scene.environmentIntensity = LT.envIntensity * day;
    renderer.toneMappingExposure = D_.exposure + D_.darkExposureBoost * (1 - day);
    scene.fog.color.copy(fogDark).lerp(fogDay, day);
    sky.position.copy(pos);
    setSparkle(day);
    return day;
  }

  return { group, update, get day() { return day; }, hemi, sun, atmosphere: { clouds, dust, trails, jars } };
}
