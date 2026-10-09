// Floor plan in metres. x → east, z → south (map "up" is -z). Eye height is fixed.
// Rooms are interior rectangles; neighbouring rooms are separated by 0.3 m walls
// and joined by door passages. Everything else (walls, collision, map, hanging
// positions) is derived from this one description.

export const EYE = 1.6;
export const BODY_RADIUS = 0.38;

export const ROOMS = {
  // Open-air rooms have no roof; `walls` overrides the height of single sides.
  lobby:    { id: 'lobby',    x0: -7,  x1: 7,     z0: 0.15,  z1: 11,    h: 3.8, open: true, walls: { s: 1.1, e: 1.1, w: 1.1 } },
  garden:   { id: 'garden',   x0: -7,  x1: 7,     z0: -26,   z1: -0.15, h: 3.8, open: true },
  plane:    { id: 'plane',    x0: -7,  x1: 7,     z0: -48.3, z1: -26.3, h: 3.8, open: true },
  corridor: { id: 'corridor', x0: -1.75, x1: 1.75, z0: -70.3, z1: -48.6, h: 3.6 },
  darkroom: { id: 'darkroom', x0: -40, x1: -2.05, z0: -76.7, z1: -60.7, h: 4.6 },
};

/** Wall thickness between and around rooms. */
export const WALL = 0.3;

/** Framed openings that are not walkable: a picture window toward the clay jars. */
export const WINDOWS = [
  { room: 'plane', side: 'n', a: 2.7, b: 6.3, sill: 0.8, head: 2.9 },
];

// A door is a passage through a wall. `axis` is the direction of travel through it.
export const DOORS = [
  { id: 'd1', a: 'lobby', b: 'garden', axis: 'z', x0: -1.6, x1: 1.6, z0: -0.15, z1: 0.15, h: 3.4 },
  { id: 'd2', a: 'garden', b: 'plane', axis: 'z', x0: -1.6, x1: 1.6, z0: -26.3, z1: -26, h: 3.4 },
  { id: 'd3', a: 'plane', b: 'corridor', axis: 'z', x0: -1.75, x1: 1.75, z0: -48.6, z1: -48.3, h: 3.6 },
  { id: 'd4', a: 'corridor', b: 'darkroom', axis: 'x', x0: -2.05, x1: -1.75, z0: -69.9, z1: -67.5, h: 3.0 },
];

// Free-standing furniture that blocks movement: benches.
export const BENCHES = [
  { room: 'garden', x: 0, z: -14.5, w: 2.6, d: 0.55, h: 0.44, color: 0xe6e2d6 },
  { room: 'plane', x: 0, z: -38.5, w: 2.6, d: 0.55, h: 0.44, color: 0xe6e2d6 },
  { room: 'darkroom', x: -34.2, z: -68.7, w: 2.4, d: 0.55, h: 0.44, color: 0x101011 },
];

export const START = { x: 0, z: 8.6, yaw: 0 };
export const ENTER_TARGET = { x: 0, z: -2.6, yaw: 0 };

const roomOf = (id) => ROOMS[id];

/** Rectangles a body centre may occupy (rooms shrunk by radius, doors stretched). */
export function walkableRects(r = BODY_RADIUS) {
  const rects = Object.values(ROOMS).map((o) => ({ x0: o.x0 + r, x1: o.x1 - r, z0: o.z0 + r, z1: o.z1 - r }));
  for (const d of DOORS) {
    if (d.axis === 'z') rects.push({ x0: d.x0 + r, x1: d.x1 - r, z0: d.z0 - r - 0.2, z1: d.z1 + r + 0.2 });
    else rects.push({ x0: d.x0 - r - 0.2, x1: d.x1 + r + 0.2, z0: d.z0 + r, z1: d.z1 - r });
  }
  return rects;
}

export function blockedRects(r = BODY_RADIUS) {
  return BENCHES.map((b) => ({ x0: b.x - b.w / 2 - r, x1: b.x + b.w / 2 + r, z0: b.z - b.d / 2 - r, z1: b.z + b.d / 2 + r }));
}

const WALK = walkableRects();
const BLOCK = blockedRects();
const inRect = (q, x, z) => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1;

export function isWalkable(x, z) {
  return WALK.some((q) => inRect(q, x, z)) && !BLOCK.some((q) => inRect(q, x, z));
}

/** Room containing a point (door passages belong to the nearer side). */
export function roomAt(x, z) {
  for (const o of Object.values(ROOMS)) if (inRect(o, x, z)) return o.id;
  for (const d of DOORS) {
    if (inRect({ x0: d.x0 - 0.01, x1: d.x1 + 0.01, z0: d.z0 - 0.01, z1: d.z1 + 0.01 }, x, z)) {
      const A = roomOf(d.a);
      const mid = d.axis === 'z' ? (d.z0 + d.z1) / 2 : (d.x0 + d.x1) / 2;
      const v = d.axis === 'z' ? z : x;
      const aSide = d.axis === 'z' ? (A.z0 > mid ? v > mid : v < mid) : (A.x0 > mid ? v > mid : v < mid);
      return aSide ? d.a : d.b;
    }
  }
  return null;
}

/** Nearest walkable point to (x,z), searching the rooms' shrunk rectangles. */
export function clampWalkable(x, z, preferRoom = null) {
  if (isWalkable(x, z)) return { x, z };
  let best = null, bd = Infinity;
  const rects = preferRoom ? [ROOMS[preferRoom]].map((o) => ({ x0: o.x0 + BODY_RADIUS, x1: o.x1 - BODY_RADIUS, z0: o.z0 + BODY_RADIUS, z1: o.z1 - BODY_RADIUS })) : WALK;
  for (const q of rects) {
    const cx = Math.min(Math.max(x, q.x0), q.x1), cz = Math.min(Math.max(z, q.z0), q.z1);
    const d = (cx - x) ** 2 + (cz - z) ** 2;
    if (d < bd && isWalkable(cx, cz)) { bd = d; best = { x: cx, z: cz }; }
  }
  if (!best) {
    // Inside a bench footprint: push out along the shortest axis.
    for (const q of BLOCK) if (inRect(q, x, z)) {
      const opts = [{ x: q.x0 - 0.01, z }, { x: q.x1 + 0.01, z }, { x, z: q.z0 - 0.01 }, { x, z: q.z1 + 0.01 }];
      opts.sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
      best = opts.find((o) => isWalkable(o.x, o.z)) || null;
    }
  }
  return best || { x: START.x, z: START.z };
}

/** Waypoint route through doors (rooms are convex, so a polyline via door axes is always valid). */
export function route(from, to) {
  const ra = roomAt(from.x, from.z), rb = roomAt(to.x, to.z);
  if (!ra || !rb || ra === rb) return [from, to];
  const prev = { [ra]: null }; const q = [ra];
  while (q.length) {
    const r = q.shift();
    if (r === rb) break;
    for (const d of DOORS) {
      const n = d.a === r ? d.b : d.b === r ? d.a : null;
      if (n && !(n in prev)) { prev[n] = { r, d }; q.push(n); }
    }
  }
  if (!(rb in prev)) return [from, to];
  const chain = []; let cur = rb;
  while (prev[cur]) { chain.unshift({ door: prev[cur].d, from: prev[cur].r }); cur = prev[cur].r; }
  const pts = [from];
  for (const { door, from: fr } of chain) {
    const cx = (door.x0 + door.x1) / 2, cz = (door.z0 + door.z1) / 2;
    const A = roomOf(fr);
    const off = 0.9;
    if (door.axis === 'z') {
      const dir = A.z0 > cz ? -1 : 1; // travelling toward -z if coming from a room south of the door
      pts.push({ x: cx, z: cz - dir * off }, { x: cx, z: cz + dir * off });
    } else {
      const dir = A.x0 > cx ? -1 : 1;
      pts.push({ x: cx - dir * off, z: cz }, { x: cx + dir * off, z: cz });
    }
  }
  pts.push(to);
  return pts;
}

/**
 * Hanging positions. Each work gets: centre (x,y,z), outward normal (nx,nz),
 * size (w,h of the image), and frame style. Order follows exhibition.json.
 */
export function hang(works) {
  const garden = works.filter((w) => w.hall === 'garden');
  const plane = works.filter((w) => w.hall === 'plane');
  const corridor = works.filter((w) => w.hall === 'corridor');
  const dark = works.filter((w) => w.hall === 'darkroom' && !w.finale);
  const finale = works.filter((w) => w.finale);
  const G = ROOMS.garden, C = ROOMS.corridor, D = ROOMS.darkroom;
  const out = new Map();

  // First hall: staggered hang, odd on the west wall, even on the east wall, 4 m apart on each wall.
  // Day halls: staggered hang, odd on the west wall, even on the east wall, 4 m apart on each wall.
  const dayHall = (list, R) => list.forEach((w, i) => {
    const west = i % 2 === 0;
    const z = R.z1 - 5.35 - i * 2.0;
    // constant image area, so prints of different proportions carry equal weight
    const a = w.aspect || 1.6, area = 0.74;
    const pw = Math.sqrt(area * a), ph = Math.sqrt(area / a);
    out.set(w.id, { x: west ? R.x0 : R.x1, y: 1.55, z, nx: west ? 1 : -1, nz: 0, w: pw, h: ph, style: 'print', room: R.id });
  });
  dayHall(garden, G);
  dayHall(plane, ROOMS.plane);
  // Corridor: a single work on the end wall.
  corridor.forEach((w) => out.set(w.id, { x: 0, y: 1.62, z: C.z0, nx: 0, nz: 1, w: 1.5, h: 0.9375, style: 'lightbox', room: 'corridor' }));
  // Darkroom: lightboxes alternate north / south along the axis.
  dark.forEach((w, i) => {
    const north = i % 2 === 0;
    const x = -6.2 - i * 1.95;
    out.set(w.id, { x, y: 1.65, z: north ? D.z0 : D.z1, nx: 0, nz: north ? 1 : -1, w: 1.76, h: 1.1, style: 'lightbox', room: 'darkroom' });
  });
  // Finale: alone on the deepest wall, on the door axis.
  finale.forEach((w) => out.set(w.id, { x: D.x0, y: 1.78, z: (D.z0 + D.z1) / 2, nx: 1, nz: 0, w: 2.56, h: 1.6, style: 'lightbox', room: 'darkroom', finale: true }));
  return out;
}

/** Corridor progress 0 (hall end) → 1 (darkroom door), used for the light ritual. */
export function corridorProgress(z) {
  const C = ROOMS.corridor;
  return Math.min(1, Math.max(0, (C.z1 + 0.3 - z) / (C.z1 - C.z0 - 1.2)));
}
