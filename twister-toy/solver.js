// Closed twist-ring solver — pure math, no three.js.
//
// Each segment is a 90° arc of radius R. Local frame: starts at the origin with
// tangent +x, bends toward +y, ends at (R, R, 0) with tangent +y.
//   T_arc   = translate(R, R, 0) · rotZ(90°)
//   T_total = Π_{i=0..17} rotX(θᵢ) · T_arc      (closure: T_total = I)
//
// Frames are stored as 12 numbers: three rotation columns then the position,
// [c0x c0y c0z  c1x c1y c1z  c2x c2y c2z  px py pz].

export const SEGMENTS = 18;
export const ARC_RADIUS = 1;
export const TUBE_RADIUS = 0.26;

// Found by findClosedPose(20261024) — closed and penetration-free.
export const INITIAL_ANGLES = [
  2.9271519742661494, -2.4466948410359706, 2.28079196131782,
  1.1951684248821624, 2.9473682940762105, 2.2037135064770106,
  -1.7671213673903223, -0.07148801043185674, 1.3075188511384281,
  0.5258398132838369, 1.342836301910379, 1.910572384851683,
  2.406008828256986, 2.410934316740716, 1.3149371350501655,
  -1.978703037532123, 1.68065003771657, -2.9882015838352913,
];

const N = SEGMENTS;
const HALF_PI = Math.PI / 2;
const CLEARANCE = 2 * TUBE_RADIUS;
const SAMPLES = 9; // centre-line samples per arc, ends included
const ACCEPT_ERROR = 1e-7; // closure error a step must reach to be accepted
const MAX_SUBSTEP = 0.04; // rad, largest single increment of the dragged joint
const MAX_JUMP = 0.35; // rad, largest compensation any other joint may make per substep
const PENETRATION_SLACK = 0.02 * CLEARANCE;

// Sample angles along one arc and their local positions.
const SAMPLE_LOCAL = [];
for (let s = 0; s < SAMPLES; s++) {
  const phi = (s / (SAMPLES - 1)) * HALF_PI;
  SAMPLE_LOCAL.push([ARC_RADIUS * Math.sin(phi), ARC_RADIUS * (1 - Math.cos(phi))]);
}

// Point pairs worth checking: arcs at least two apart around the ring.
const PAIRS = [];
for (let a = 0; a < N; a++) {
  for (let b = a + 2; b < N; b++) {
    if (a === 0 && b === N - 1) continue;
    PAIRS.push(a, b);
  }
}

// ---------- forward kinematics ----------

/**
 * Computes joint frames and segment frames.
 * joints[i]   frame before rotX(θᵢ) — joint i's axis is its c0, origin its p.
 * segments[i] frame where arc i is drawn in local coordinates.
 * end         T_total.
 */
export function forward(angles, out) {
  const joints = out ? out.joints : new Float64Array(N * 12);
  const segments = out ? out.segments : new Float64Array(N * 12);
  const end = out ? out.end : new Float64Array(12);
  let c0x = 1, c0y = 0, c0z = 0;
  let c1x = 0, c1y = 1, c1z = 0;
  let c2x = 0, c2y = 0, c2z = 1;
  let px = 0, py = 0, pz = 0;
  for (let i = 0; i < N; i++) {
    let o = i * 12;
    joints[o] = c0x; joints[o + 1] = c0y; joints[o + 2] = c0z;
    joints[o + 3] = c1x; joints[o + 4] = c1y; joints[o + 5] = c1z;
    joints[o + 6] = c2x; joints[o + 7] = c2y; joints[o + 8] = c2z;
    joints[o + 9] = px; joints[o + 10] = py; joints[o + 11] = pz;
    // · rotX(θ)
    const c = Math.cos(angles[i]), s = Math.sin(angles[i]);
    const n1x = c * c1x + s * c2x, n1y = c * c1y + s * c2y, n1z = c * c1z + s * c2z;
    const n2x = -s * c1x + c * c2x, n2y = -s * c1y + c * c2y, n2z = -s * c1z + c * c2z;
    c1x = n1x; c1y = n1y; c1z = n1z;
    c2x = n2x; c2y = n2y; c2z = n2z;
    segments[o] = c0x; segments[o + 1] = c0y; segments[o + 2] = c0z;
    segments[o + 3] = c1x; segments[o + 4] = c1y; segments[o + 5] = c1z;
    segments[o + 6] = c2x; segments[o + 7] = c2y; segments[o + 8] = c2z;
    segments[o + 9] = px; segments[o + 10] = py; segments[o + 11] = pz;
    // · T_arc : p += R(c0 + c1); (c0, c1) ← (c1, −c0)
    px += ARC_RADIUS * (c0x + c1x); py += ARC_RADIUS * (c0y + c1y); pz += ARC_RADIUS * (c0z + c1z);
    const tx = c0x, ty = c0y, tz = c0z;
    c0x = c1x; c0y = c1y; c0z = c1z;
    c1x = -tx; c1y = -ty; c1z = -tz;
  }
  end[0] = c0x; end[1] = c0y; end[2] = c0z;
  end[3] = c1x; end[4] = c1y; end[5] = c1z;
  end[6] = c2x; end[7] = c2y; end[8] = c2z;
  end[9] = px; end[10] = py; end[11] = pz;
  return { joints, segments, end };
}

/** 6-vector closure residual [position; rotation vector] of T_total against I. */
function closureResidual(end, e) {
  e[0] = end[9]; e[1] = end[10]; e[2] = end[11];
  // R columns c0, c1, c2: skew part s = vee((R − Rᵀ)/2)
  const sx = (end[5] - end[7]) / 2; // R21 − R12 → (c1z − c2y)/2
  const sy = (end[6] - end[2]) / 2; // R02 − R20 → (c2x − c0z)/2
  const sz = (end[1] - end[3]) / 2; // R10 − R01 → (c0y − c1x)/2
  const cosA = (end[0] + end[4] + end[8] - 1) / 2;
  const sinA = Math.hypot(sx, sy, sz);
  const angle = Math.atan2(sinA, cosA);
  const k = sinA > 1e-12 ? angle / sinA : 1;
  e[3] = sx * k; e[4] = sy * k; e[5] = sz * k;
  return e;
}

/** Closure error ‖[p; rotvec]‖ of a set of joint angles. */
export function closureError(angles) {
  const e = closureResidual(forward(angles).end, new Float64Array(6));
  return Math.hypot(e[0], e[1], e[2], e[3], e[4], e[5]);
}

// ---------- collision ----------

function samplePoints(segments, pts) {
  for (let i = 0; i < N; i++) {
    const o = i * 12;
    for (let s = 0; s < SAMPLES; s++) {
      const [u, v] = SAMPLE_LOCAL[s];
      const q = (i * SAMPLES + s) * 3;
      pts[q] = segments[o + 9] + u * segments[o] + v * segments[o + 3];
      pts[q + 1] = segments[o + 10] + u * segments[o + 1] + v * segments[o + 4];
      pts[q + 2] = segments[o + 11] + u * segments[o + 2] + v * segments[o + 5];
    }
  }
  return pts;
}

/** Visits every sample pair on non-neighbouring arcs closer than `limit`. */
function forEachClosePair(pts, limit, fn) {
  const lim2 = limit * limit;
  for (let k = 0; k < PAIRS.length; k += 2) {
    const a = PAIRS[k], b = PAIRS[k + 1];
    for (let sa = 0; sa < SAMPLES; sa++) {
      const qa = (a * SAMPLES + sa) * 3;
      const ax = pts[qa], ay = pts[qa + 1], az = pts[qa + 2];
      for (let sb = 0; sb < SAMPLES; sb++) {
        const qb = (b * SAMPLES + sb) * 3;
        const dx = ax - pts[qb], dy = ay - pts[qb + 1], dz = az - pts[qb + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < lim2) fn(a, qa, b, qb, Math.sqrt(d2));
      }
    }
  }
}

/** Smallest centre-line distance between non-neighbouring arcs. */
export function minClearance(angles) {
  const pts = samplePoints(forward(angles).segments, new Float64Array(N * SAMPLES * 3));
  let best = Infinity;
  forEachClosePair(pts, Infinity, (a, qa, b, qb, d) => { if (d < best) best = d; });
  return best;
}

/** How far the tubes overlap (0 when they don't). */
function penetration(minDist) {
  return Math.max(0, CLEARANCE - minDist);
}

// ---------- damped least squares ----------

function solveSPD(A, b, n) {
  // Cholesky, in place on a copy; A is n×n row-major.
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i * n + j];
      for (let k = 0; k < j; k++) sum -= L[i * n + k] * L[j * n + k];
      if (i === j) {
        if (!(sum > 0)) return null;
        L[i * n + i] = Math.sqrt(sum);
      } else {
        L[i * n + j] = sum / L[j * n + j];
      }
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) sum -= L[i * n + k] * y[k];
    y[i] = sum / L[i * n + i];
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) sum -= L[k * n + i] * x[k];
    x[i] = sum / L[i * n + i];
  }
  return x;
}

/**
 * One damped-least-squares update of the free joints (all but `fixed`, which may be −1).
 * Minimises ‖J·dθ + e‖² + w²·Σ(gᵀdθ − gap)² + λ²‖dθ‖².
 * Returns the closure error measured before the update.
 */
function dlsStep(angles, fixed, opts, work) {
  const { joints, end, segments } = forward(angles, work.fk);
  const e = closureResidual(end, work.e);
  const err = Math.hypot(e[0], e[1], e[2], e[3], e[4], e[5]);

  const free = work.free;
  let n = 0;
  for (let i = 0; i < N; i++) if (i !== fixed) free[n++] = i;

  // Jacobian columns: d(p_end)/dθ = a × (p_end − o), d(rot)/dθ = a
  const J = work.J; // n×6, row per free joint
  for (let c = 0; c < n; c++) {
    const o = free[c] * 12;
    const ax = joints[o], ay = joints[o + 1], az = joints[o + 2];
    const rx = end[9] - joints[o + 9], ry = end[10] - joints[o + 10], rz = end[11] - joints[o + 11];
    const r = c * 6;
    J[r] = ay * rz - az * ry; J[r + 1] = az * rx - ax * rz; J[r + 2] = ax * ry - ay * rx;
    J[r + 3] = ax; J[r + 4] = ay; J[r + 5] = az;
  }

  const A = work.A.fill(0, 0, n * n);
  const b = work.b.fill(0, 0, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < 6; k++) sum += J[i * 6 + k] * J[j * 6 + k];
      A[i * n + j] = sum;
    }
    let sb = 0;
    for (let k = 0; k < 6; k++) sb -= J[i * 6 + k] * e[k];
    b[i] = sb;
  }

  if (opts.collision) {
    const pts = samplePoints(segments, work.pts);
    const w2 = opts.collisionWeight * opts.collisionWeight;
    const g = work.g;
    forEachClosePair(pts, CLEARANCE, (a, qa, bb, qb, d) => {
      if (d < 1e-9) return;
      const nx = (pts[qa] - pts[qb]) / d, ny = (pts[qa + 1] - pts[qb + 1]) / d, nz = (pts[qa + 2] - pts[qb + 2]) / d;
      // d(d)/dθ_k = n · (a_k × (x_a − o_k) [k ≤ a] − a_k × (x_b − o_k) [k ≤ b])
      for (let c = 0; c < n; c++) {
        const k = free[c];
        let gv = 0;
        if (k <= bb) {
          const o = k * 12;
          const ax = joints[o], ay = joints[o + 1], az = joints[o + 2];
          let vx = 0, vy = 0, vz = 0;
          if (k <= a) {
            const rx = pts[qa] - pts[qb], ry = pts[qa + 1] - pts[qb + 1], rz = pts[qa + 2] - pts[qb + 2];
            vx = ay * rz - az * ry; vy = az * rx - ax * rz; vz = ax * ry - ay * rx;
          } else {
            const rx = joints[o + 9] - pts[qb], ry = joints[o + 10] - pts[qb + 1], rz = joints[o + 11] - pts[qb + 2];
            vx = ay * rz - az * ry; vy = az * rx - ax * rz; vz = ax * ry - ay * rx;
          }
          gv = nx * vx + ny * vy + nz * vz;
        }
        g[c] = gv;
      }
      const gap = CLEARANCE - d;
      for (let i = 0; i < n; i++) {
        if (g[i] === 0) continue;
        for (let j = 0; j <= i; j++) A[i * n + j] += w2 * g[i] * g[j];
        b[i] += w2 * g[i] * gap;
      }
    });
  }

  const lambda2 = opts.lambda * opts.lambda;
  for (let i = 0; i < n; i++) {
    A[i * n + i] += lambda2;
    for (let j = 0; j < i; j++) A[j * n + i] = A[i * n + j];
  }

  const dq = solveSPD(A, b, n);
  if (!dq) return NaN;
  let norm = 0;
  for (let c = 0; c < n; c++) norm += dq[c] * dq[c];
  norm = Math.sqrt(norm);
  const scale = norm > opts.maxStep ? opts.maxStep / norm : 1;
  for (let c = 0; c < n; c++) angles[free[c]] += dq[c] * scale;
  return err;
}

function makeWork() {
  return {
    fk: { joints: new Float64Array(N * 12), segments: new Float64Array(N * 12), end: new Float64Array(12) },
    e: new Float64Array(6),
    free: new Int32Array(N),
    J: new Float64Array(N * 6),
    A: new Float64Array(N * N),
    b: new Float64Array(N),
    g: new Float64Array(N),
    pts: new Float64Array(N * SAMPLES * 3),
  };
}

// ---------- interactive solver ----------

export class TwistSolver {
  constructor(angles = INITIAL_ANGLES) {
    this.angles = Float64Array.from(angles);
    this.work = makeWork();
    this.trial = new Float64Array(N);
    this.error = closureError(this.angles);
    this.clearance = minClearance(this.angles);
  }

  /**
   * Twists `joint` by `delta` radians while the rest of the ring compensates.
   * The move is split into small substeps; the first substep that cannot be
   * closed cleanly is rejected and the ring stays at its last valid pose.
   * Returns { applied, accepted, error }.
   */
  drag(joint, delta) {
    if (!Number.isFinite(delta) || delta === 0) return { applied: 0, accepted: true, error: this.error };
    const steps = Math.ceil(Math.abs(delta) / MAX_SUBSTEP);
    const inc = delta / steps;
    let applied = 0;
    for (let s = 0; s < steps; s++) {
      if (!this.substep(joint, inc)) return { applied, accepted: false, error: this.error };
      applied += inc;
    }
    return { applied, accepted: true, error: this.error };
  }

  substep(joint, inc) {
    const prev = this.angles;
    const q = this.trial;
    q.set(prev);
    q[joint] += inc;
    const work = this.work;
    const iterations = 8;
    for (let it = 0; it < iterations; it++) {
      // Push apart for most iterations, then finish on closure alone.
      const collision = it < iterations - 3;
      const err = dlsStep(q, joint, { lambda: 0.02, collision, collisionWeight: 0.6, maxStep: 0.4 }, work);
      if (!Number.isFinite(err)) return false;
      if (!collision && err < 1e-12) break;
    }
    for (let i = 0; i < N; i++) {
      if (!Number.isFinite(q[i])) return false;
      if (i !== joint && Math.abs(q[i] - prev[i]) > MAX_JUMP) return false;
    }
    const error = closureError(q);
    if (!(error < ACCEPT_ERROR)) return false;
    const clearance = minClearance(q);
    if (penetration(clearance) > Math.max(penetration(this.clearance), PENETRATION_SLACK)) return false;
    prev.set(q);
    this.error = error;
    this.clearance = clearance;
    return true;
  }
}

// ---------- initial pose search ----------

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Searches from a seeded random start for a closed, penetration-free pose. */
export function findClosedPose(seed, attempts = 200) {
  const rand = mulberry32(seed);
  const work = makeWork();
  for (let attempt = 0; attempt < attempts; attempt++) {
    const q = new Float64Array(N);
    for (let i = 0; i < N; i++) q[i] = (rand() * 2 - 1) * Math.PI;
    for (let it = 0; it < 600; it++) {
      const collision = it < 560;
      const err = dlsStep(q, -1, { lambda: collision ? 0.1 : 1e-3, collision, collisionWeight: 1, maxStep: 0.3 }, work);
      if (!Number.isFinite(err)) break;
    }
    if (q.some((v) => !Number.isFinite(v))) continue;
    if (closureError(q) < 1e-12 && minClearance(q) > CLEARANCE * 1.05) {
      return { angles: Array.from(q, (v) => Math.atan2(Math.sin(v), Math.cos(v))), attempt };
    }
  }
  return null;
}

// ---------- display alignment ----------

/**
 * Best rigid motion (Horn's quaternion method) taking src points onto dst.
 * Both are flat xyz arrays of the same length. Returns { q: [w,x,y,z], t: [x,y,z] }.
 */
export function alignRigid(src, dst) {
  const m = src.length / 3;
  let sx = 0, sy = 0, sz = 0, dx = 0, dy = 0, dz = 0;
  for (let i = 0; i < m; i++) {
    sx += src[i * 3]; sy += src[i * 3 + 1]; sz += src[i * 3 + 2];
    dx += dst[i * 3]; dy += dst[i * 3 + 1]; dz += dst[i * 3 + 2];
  }
  sx /= m; sy /= m; sz /= m; dx /= m; dy /= m; dz /= m;
  let Sxx = 0, Sxy = 0, Sxz = 0, Syx = 0, Syy = 0, Syz = 0, Szx = 0, Szy = 0, Szz = 0;
  for (let i = 0; i < m; i++) {
    const ax = src[i * 3] - sx, ay = src[i * 3 + 1] - sy, az = src[i * 3 + 2] - sz;
    const bx = dst[i * 3] - dx, by = dst[i * 3 + 1] - dy, bz = dst[i * 3 + 2] - dz;
    Sxx += ax * bx; Sxy += ax * by; Sxz += ax * bz;
    Syx += ay * bx; Syy += ay * by; Syz += ay * bz;
    Szx += az * bx; Szy += az * by; Szz += az * bz;
  }
  const K = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
  ];
  const q = largestEigenvector4(K);
  // rotate the source centroid, then translate onto the destination centroid
  const r = rotateByQuat(q, sx, sy, sz);
  return { q, t: [dx - r[0], dy - r[1], dz - r[2]] };
}

export function rotateByQuat(q, x, y, z) {
  const [w, qx, qy, qz] = q;
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
  return [x + w * tx + (qy * tz - qz * ty), y + w * ty + (qz * tx - qx * tz), z + w * tz + (qx * ty - qy * tx)];
}

function largestEigenvector4(K) {
  // Cyclic Jacobi on a symmetric 4×4.
  const a = K.map((row) => row.slice());
  const v = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  for (let sweep = 0; sweep < 30; sweep++) {
    let off = 0;
    for (let p = 0; p < 4; p++) for (let r = p + 1; r < 4; r++) off += a[p][r] * a[p][r];
    if (off < 1e-24) break;
    for (let p = 0; p < 4; p++) {
      for (let r = p + 1; r < 4; r++) {
        if (Math.abs(a[p][r]) < 1e-30) continue;
        const theta = (a[r][r] - a[p][p]) / (2 * a[p][r]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < 4; k++) {
          const akp = a[k][p], akr = a[k][r];
          a[k][p] = c * akp - s * akr; a[k][r] = s * akp + c * akr;
        }
        for (let k = 0; k < 4; k++) {
          const apk = a[p][k], ark = a[r][k];
          a[p][k] = c * apk - s * ark; a[r][k] = s * apk + c * ark;
        }
        for (let k = 0; k < 4; k++) {
          const vkp = v[k][p], vkr = v[k][r];
          v[k][p] = c * vkp - s * vkr; v[k][r] = s * vkp + c * vkr;
        }
      }
    }
  }
  let best = 0;
  for (let i = 1; i < 4; i++) if (a[i][i] > a[best][best]) best = i;
  const q = [v[0][best], v[1][best], v[2][best], v[3][best]];
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  const sign = q[0] < 0 ? -1 : 1; // keep w ≥ 0 so successive frames stay continuous
  return q.map((x) => (x * sign) / len);
}
