// Builds the architecture: rooms, doors, skylights, benches, wall texts and
// the daylight rig. Returns handles the app needs every frame (zone lighting).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ROOMS, DOORS, BENCHES, corridorProgress } from './plan.js';
import * as TX from './textures.js';

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

/**
 * Wall pieces of one room side. side: 'n' (z=z0, faces +z), 's' (z=z1, faces -z),
 * 'w' (x=x0, faces +x), 'e' (x=x1, faces -x). Doors on that side are cut out.
 */
function wallSide(room, side, material, uvFor) {
  const meshes = [];
  const alongX = side === 'n' || side === 's';
  const fixed = { n: room.z0, s: room.z1, w: room.x0, e: room.x1 }[side];
  const normal = { n: V(0, 0, 1), s: V(0, 0, -1), w: V(1, 0, 0), e: V(-1, 0, 0) }[side];
  const s0 = alongX ? room.x0 : room.z0, s1 = alongX ? room.x1 : room.z1;
  const openings = DOORS.filter((d) => (d.a === room.id || d.b === room.id) && (alongX ? d.axis === 'z' : d.axis === 'x'))
    .filter((d) => alongX ? Math.abs((d.z0 + d.z1) / 2 - fixed) < 0.5 : Math.abs((d.x0 + d.x1) / 2 - fixed) < 0.5)
    .map((d) => ({ a: alongX ? d.x0 : d.z0, b: alongX ? d.x1 : d.z1, h: d.h }))
    .sort((a, b) => a.a - b.a);
  const pt = (s, y) => (alongX ? V(s, y, fixed) : V(fixed, y, s));
  const piece = (a, b, y0, y1) => {
    if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
    const P = [pt(a, y0), pt(b, y0), pt(b, y1), pt(a, y1)];
    const U = P.map((q) => uvFor ? uvFor(q, alongX ? q.x : q.z) : [((alongX ? q.x : q.z) - s0) / (s1 - s0), q.y / room.h]);
    const m = new THREE.Mesh(quad(P, U, normal), material);
    m.receiveShadow = true; meshes.push(m);
  };
  let cur = s0;
  for (const o of openings) { piece(cur, o.a, 0, room.h); piece(o.a, o.b, o.h, room.h); cur = o.b; }
  piece(cur, s1, 0, room.h);
  return meshes;
}

/** Horizontal surface with rectangular holes (skylight wells). */
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

/** Recessed skylight: four inner faces and a luminous diffuser at the top. */
function skylight(h, y, depth, wallMat, glowMat) {
  const g = new THREE.Group();
  const yt = y + depth;
  const faces = [
    [[V(h.x0, y, h.z0), V(h.x1, y, h.z0), V(h.x1, yt, h.z0), V(h.x0, yt, h.z0)], V(0, 0, 1)],
    [[V(h.x0, y, h.z1), V(h.x1, y, h.z1), V(h.x1, yt, h.z1), V(h.x0, yt, h.z1)], V(0, 0, -1)],
    [[V(h.x0, y, h.z0), V(h.x0, y, h.z1), V(h.x0, yt, h.z1), V(h.x0, yt, h.z0)], V(1, 0, 0)],
    [[V(h.x1, y, h.z0), V(h.x1, y, h.z1), V(h.x1, yt, h.z1), V(h.x1, yt, h.z0)], V(-1, 0, 0)],
  ];
  for (const [P, n] of faces) g.add(new THREE.Mesh(quad(P, P.map((q) => [0.5, (q.y - y) / depth * 0.5 + 0.5]), n), wallMat));
  const top = new THREE.Mesh(quad([V(h.x0, yt, h.z0), V(h.x1, yt, h.z0), V(h.x1, yt, h.z1), V(h.x0, yt, h.z1)], [[0, 0], [1, 0], [1, 1], [0, 1]], V(0, -1, 0)), glowMat);
  g.add(top);
  return g;
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
  const plaster = TX.plasterTile();
  const concrete = TX.concreteTile();
  const darkConcrete = TX.concreteTile([40, 40, 42], 512, 21);
  const aoLobby = TX.wallAO(L.h), aoGarden = TX.wallAO(G.h), aoDark = TX.wallAO(D.h);
  for (const t of [aoLobby, aoGarden, aoDark]) t.channel = 1;

  const whiteWall = (ao) => new THREE.MeshStandardMaterial({ color: 0xf3f1ec, map: plaster, aoMap: ao, aoMapIntensity: 1, roughness: 0.94 });
  const lobbyWall = whiteWall(aoLobby), gardenWall = whiteWall(aoGarden);
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf1efea, map: plaster, roughness: 1, emissive: 0xd8d4cc, emissiveIntensity: 0.42 });
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 1.34, 1.3) });

  const benchesIn = (room) => BENCHES.filter((b) => b.room === room);
  const floorMat = (room, opts) => {
    const ao = TX.floorAO(room, opts); ao.channel = 1;
    return new THREE.MeshStandardMaterial({ color: 0xffffff, map: concrete, aoMap: ao, aoMapIntensity: 1, roughness: 0.62, metalness: 0 });
  };

  const gardenSky = [{ x0: -1.7, x1: 1.7, z0: -23.6, z1: -2.6 }];
  const lobbySky = [{ x0: -4.2, x1: 4.2, z0: 2.4, z1: 8.6 }];

  const group = new THREE.Group(); scene.add(group);
  const add = (arr) => arr.forEach((m) => group.add(m));

  // ---------- lobby ----------
  add(slab(L, 0, 1, floorMat(L, { pools: lobbySky.map((p) => ({ ...p, soft: 2.4 })), base: 0.8 })));
  add(slab(L, L.h, -1, ceilingMat, lobbySky));
  lobbySky.forEach((h) => group.add(skylight(h, L.h, 0.7, ceilingMat, glowMat)));
  for (const s of ['n', 's', 'w', 'e']) add(wallSide(L, s, lobbyWall));

  // ---------- garden ----------
  add(slab(G, 0, 1, floorMat(G, { pools: gardenSky.map((p) => ({ ...p, soft: 2.8 })), blockers: benchesIn('garden'), base: 0.8 })));
  add(slab(G, G.h, -1, ceilingMat, gardenSky));
  gardenSky.forEach((h) => group.add(skylight(h, G.h, 0.8, ceilingMat, glowMat)));
  for (const s of ['n', 's', 'w', 'e']) add(wallSide(G, s, gardenWall));

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
  const corridorWallMat = new THREE.MeshStandardMaterial({ map: cWall, roughness: 0.92 });
  const corridorFloorMat = new THREE.MeshStandardMaterial({ map: cFloor, roughness: 0.5 });
  const corridorCeilMat = new THREE.MeshStandardMaterial({ map: cCeil, roughness: 1 });
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
  const ringGeo = new THREE.RingGeometry(0.11, 0.135, 24);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x8c8a85, roughness: 0.7 });
  for (const fx of fixtures) {
    const z = C.z1 - fx.d;
    const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.9).multiplyScalar(0.04 + 1.5 * fx.b) }));
    disc.rotation.x = Math.PI / 2; disc.position.set(0, C.h - 0.004, z); group.add(disc);
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = Math.PI / 2; ring.position.set(0, C.h - 0.002, z); group.add(ring);
  }

  // ---------- darkroom ----------
  const darkWall = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.9, aoMap: aoDark });
  const darkFloorAO = TX.floorAO(D, { blockers: benchesIn('darkroom'), base: 1, strength: 0.5, edge: 0.6 }); darkFloorAO.channel = 1;
  const darkFloor = new THREE.MeshStandardMaterial({ color: 0x9a9a9c, map: darkConcrete, aoMap: darkFloorAO, roughness: quality.tier === 'low' ? 0.42 : 0.3, metalness: 0 });
  add(slab(D, 0, 1, darkFloor));
  add(slab(D, D.h, -1, new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 1 })));
  for (const s of ['n', 's', 'w', 'e']) add(wallSide(D, s, darkWall));

  // ---------- door reveals ----------
  for (const d of DOORS) {
    const mat = d.id === 'd3' ? darkWall : d.id === 'd2' ? gardenWall : lobbyWall;
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
    const thr = new THREE.Mesh(quad(P, P.map(() => [0.5, 0.5]), V(0, 1, 0)), d.id === 'd3' ? darkFloor : new THREE.MeshStandardMaterial({ color: 0xb9b4ab, roughness: 0.7 }));
    group.add(thr);
  }
  // corridor walls continue through the hall's end wall
  {
    const dz = DOORS.find((d) => d.id === 'd2');
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
    const t = hallText(halls.corridor, false, 1000);
    const m = textPlane(t.texture, 1.5, t.aspect); m.rotation.y = Math.PI / 2;
    m.position.set(C.x0 + 0.01, 1.55, -28.2); group.add(m);
  }
  {
    const t = hallText(halls.darkroom, true, 1100);
    const m = textPlane(t.texture, 1.9, t.aspect, { opacity: 0.92 });
    m.position.set(-3.55, 1.62, D.z0 + 0.01); group.add(m);
  }

  // ---------- light rig ----------
  const hemi = new THREE.HemisphereLight(0xfbf9f4, 0xa39d92, 1.65);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6ea, 1.25);
  sun.position.set(3.5, 22, -4); sun.target.position.set(-1.5, 0, -12);
  scene.add(sun, sun.target);
  if (quality.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    const cam = sun.shadow.camera; cam.left = -16; cam.right = 16; cam.top = 26; cam.bottom = -26; cam.near = 1; cam.far = 50;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  }
  // soft room reflections for the day halls
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  pmrem.dispose();

  const bg = new THREE.Color();
  scene.background = bg;

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
    hemi.intensity = 1.65 * day;
    sun.intensity = 1.25 * day;
    scene.environmentIntensity = 0.32 * day;
    ceilingMat.emissiveIntensity = 0.42 * day;
    renderer.toneMappingExposure = 1.0 + 0.12 * (1 - day);
    bg.setRGB(0.01 * day, 0.01 * day, 0.01 * day);
    return day;
  }

  return { group, update, get day() { return day; }, hemi, sun };
}
