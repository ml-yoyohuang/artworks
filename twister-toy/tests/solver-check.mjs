// Node check for solver.js:  node tests/solver-check.mjs
import { readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const solverPath = fileURLToPath(new URL('../solver.js', import.meta.url));
let solver;
try {
  solver = await import(pathToFileURL(solverPath).href);
} catch {
  // Older Node treats a .js file without package.json "type" as CommonJS.
  const source = readFileSync(solverPath, 'utf8');
  solver = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
const {
  SEGMENTS, TUBE_RADIUS, INITIAL_ANGLES, FACTORY_ANGLES, TwistSolver,
  closureError, minClearance, findClosedPose, alignRigid, rotateByQuat,
} = solver;

let failures = 0;
function check(ok, message) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failures++;
}

// Initial pose
const clearance = minClearance(INITIAL_ANGLES);
check(INITIAL_ANGLES.length === SEGMENTS, `initial pose has ${INITIAL_ANGLES.length} joints`);
check(closureError(INITIAL_ANGLES) < 1e-10, `initial closure error ${closureError(INITIAL_ANGLES).toExponential(2)}`);
check(clearance >= 2 * TUBE_RADIUS, `initial clearance ${clearance.toFixed(4)} ≥ 2r = ${(2 * TUBE_RADIUS).toFixed(4)}`);
const found = findClosedPose(20261024);
const maxDiff = Math.max(...found.angles.map((v, i) => Math.abs(v - INITIAL_ANGLES[i])));
check(maxDiff < 1e-12, `findClosedPose(20261024) reproduces the constant (max diff ${maxDiff.toExponential(2)})`);

// 1000 random drags
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const s = new TwistSolver();
let accepted = 0, rejected = 0, worst = 0, minClear = Infinity, bad = 0, nan = 0, turned = 0;
const t0 = Date.now();
for (let step = 0; step < 1000; step++) {
  const joint = Math.floor(rand() * SEGMENTS);
  const delta = (rand() * 2 - 1) * 0.8;
  const before = Float64Array.from(s.angles);
  const res = s.drag(joint, delta);
  const err = closureError(s.angles);
  if (s.angles.some((v) => !Number.isFinite(v)) || !Number.isFinite(err)) nan++;
  worst = Math.max(worst, err);
  minClear = Math.min(minClear, minClearance(s.angles));
  turned += Math.abs(res.applied);
  // The dragged joint moved exactly by what was applied; a rejection kept the last valid pose.
  const movedOk = Math.abs(s.angles[joint] - before[joint] - res.applied) < 1e-9;
  const rejectOk = res.accepted || Math.abs(res.applied) < Math.abs(delta);
  if (!(err < 1e-4) || !movedOk || !rejectOk) bad++;
  if (res.accepted) accepted++; else rejected++;
}
const ms = Date.now() - t0;
check(nan === 0, `no NaN in 1000 drags`);
check(bad === 0, `every drag closed (< 1e-4) or correctly reverted — ${accepted} accepted, ${rejected} stopped`);
check(worst < 1e-4, `worst closure error ${worst.toExponential(2)}`);
check(minClear >= 2 * TUBE_RADIUS * 0.98, `smallest clearance during drags ${minClear.toFixed(4)}`);
console.log(`     total twist applied ${turned.toFixed(1)} rad in ${ms} ms (${(ms / 1000).toFixed(2)} ms per drag)`);

// 500 multi-finger twists: 2–3 joints held and turned together
const m = new TwistSolver();
let mBad = 0, mNan = 0, mWorst = 0, mFull = 0, mPartial = 0, mMinClear = Infinity;
for (let step = 0; step < 500; step++) {
  const fingers = 2 + Math.floor(rand() * 2);
  const joints = new Set();
  while (joints.size < fingers) joints.add(Math.floor(rand() * SEGMENTS));
  const moves = [...joints].map((joint) => ({ joint, delta: (rand() * 2 - 1) * 0.5 }));
  const before = Float64Array.from(m.angles);
  const res = m.twist(moves);
  const err = closureError(m.angles);
  if (m.angles.some((v) => !Number.isFinite(v)) || !Number.isFinite(err)) mNan++;
  mWorst = Math.max(mWorst, err);
  mMinClear = Math.min(mMinClear, minClearance(m.angles));
  // Every held joint moved by exactly what was reported as applied.
  const movedOk = moves.every((mv, k) => Math.abs(m.angles[mv.joint] - before[mv.joint] - res.applied[k]) < 1e-9);
  if (!(err < 1e-4) || !movedOk) mBad++;
  if (res.accepted) mFull++; else mPartial++;
}
check(mNan === 0, `no NaN in 500 multi-finger twists`);
check(mBad === 0, `every multi-finger twist closed with held joints exact — ${mFull} full, ${mPartial} partly blocked`);
check(mWorst < 1e-4, `worst multi-finger closure error ${mWorst.toExponential(2)}`);
check(mMinClear >= 2 * TUBE_RADIUS * 0.98, `smallest clearance during multi-finger twists ${mMinClear.toFixed(4)}`);

// Factory pose and the reset glide toward it
check(FACTORY_ANGLES.length === SEGMENTS, `factory pose has ${FACTORY_ANGLES.length} joints`);
check(closureError(FACTORY_ANGLES) < 1e-10, `factory closure error ${closureError(FACTORY_ANGLES).toExponential(2)}`);
const factoryClear = minClearance(FACTORY_ANGLES);
check(factoryClear >= 2 * TUBE_RADIUS, `factory clearance ${factoryClear.toFixed(4)} ≥ 2r`);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const FRAMES = 66;
let rWorst = 0, rLanded = 0, rFailed = 0;
for (const start of [INITIAL_ANGLES, s.angles, m.angles]) {
  const r = new TwistSolver(start);
  for (let f = 1; f <= FRAMES; f++) {
    const e0 = ease((f - 1) / FRAMES), e1 = ease(f / FRAMES);
    if (!r.approach(FACTORY_ANGLES, f === FRAMES ? 1 : (e1 - e0) / (1 - e0))) rFailed++;
    rWorst = Math.max(rWorst, r.error);
  }
  const off = Math.max(...FACTORY_ANGLES.map((v, i) => Math.abs(Math.atan2(Math.sin(r.angles[i] - v), Math.cos(r.angles[i] - v)))));
  if (off < 1e-9) rLanded++;
}
check(rFailed === 0, `reset glide never failed to re-close`);
check(rWorst < 1e-6, `worst closure error during reset glides ${rWorst.toExponential(2)}`);
check(rLanded === 3, `all 3 reset glides land exactly on the factory pose`);

// Display alignment
const q = [Math.cos(0.4), Math.sin(0.4) * 0.6, Math.sin(0.4) * 0.8, 0];
const src = [], dst = [];
for (let i = 0; i < 18; i++) {
  const p = [Math.cos(i), Math.sin(i * 1.3), i * 0.1];
  src.push(...p);
  const r = rotateByQuat(q, ...p);
  dst.push(r[0] + 1, r[1] - 2, r[2] + 0.5);
}
const fit = alignRigid(src, dst);
let alignErr = 0;
for (let i = 0; i < 18; i++) {
  const r = rotateByQuat(fit.q, src[i * 3], src[i * 3 + 1], src[i * 3 + 2]);
  alignErr = Math.max(alignErr, Math.hypot(r[0] + fit.t[0] - dst[i * 3], r[1] + fit.t[1] - dst[i * 3 + 1], r[2] + fit.t[2] - dst[i * 3 + 2]));
}
check(alignErr < 1e-9, `alignRigid recovers a known motion (err ${alignErr.toExponential(2)})`);

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
