// 07 回聲迷宮：創作性的二維回聲模型（純函式，可在 Node 測試）。
// 聲線遇到未揭露的牆 → 被吸收，回聲抵達時揭露該段；遇到已揭露的牆 → 鏡面反射並繼續。
import { rng } from '../core/rng.js';

export const C = 9;             // 縮尺世界的傳播速度（單位／秒）
export const CELL = 3;
export const LIMITS = { rays: 28, bounces: 3, maxArrivals: 18, minDist: 0.6, maxPath: 30, decay: 0.62 };

export function makeMaze(seed, cols = 8, rows = 6) {
  const r = rng(`maze:${seed}`);
  const open = new Set(); // 'x,y|x2,y2' 相通的鄰格
  const key = (a, b) => (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${a}|${b}` : `${b}|${a}`);
  const seen = new Set(), stack = [[r.int(0, cols - 1), r.int(0, rows - 1)]];
  seen.add(String(stack[0]));
  while (stack.length) {
    const c = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [c[0] + d[0], c[1] + d[1]]).filter(n => n[0] >= 0 && n[1] >= 0 && n[0] < cols && n[1] < rows && !seen.has(String(n)));
    if (!nb.length) { stack.pop(); continue; }
    const n = r.pick(nb); open.add(key(c, n)); seen.add(String(n)); stack.push(n);
  }
  // 打開少量額外通道形成迴路，讓回聲有不只一條路
  for (let i = 0; i < Math.round(cols * rows * 0.12); i++) {
    const c = [r.int(0, cols - 2), r.int(0, rows - 1)], d = r() < 0.5 ? [1, 0] : [0, 1], n = [c[0] + d[0], Math.min(rows - 1, c[1] + d[1])];
    if (String(c) !== String(n)) open.add(key(c, n));
  }
  const ox = -cols * CELL / 2, oy = -rows * CELL / 2;
  const segs = [];
  const add = (x1, y1, x2, y2) => segs.push({ id: segs.length, a: [ox + x1 * CELL, oy + y1 * CELL], b: [ox + x2 * CELL, oy + y2 * CELL], revealAt: Infinity });
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
    if (x === 0) add(0, y, 0, y + 1);
    if (y === 0) add(x, 0, x + 1, 0);
    if (x === cols - 1 || !open.has(key([x, y], [x + 1, y]))) add(x + 1, y, x + 1, y + 1);
    if (y === rows - 1 || !open.has(key([x, y], [x, y + 1]))) add(x, y + 1, x + 1, y + 1);
  }
  return { cols, rows, ox, oy, open, key, segs, center: (cx, cy) => [ox + (cx + 0.5) * CELL, oy + (cy + 0.5) * CELL] };
}

export function neighbors(maze, c) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [c[0] + d[0], c[1] + d[1]])
    .filter(n => n[0] >= 0 && n[1] >= 0 && n[0] < maze.cols && n[1] < maze.rows && maze.open.has(maze.key(c, n)));
}

function hit(o, d, s) {
  const ex = s.b[0] - s.a[0], ey = s.b[1] - s.a[1];
  const den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-9) return null;
  const qx = s.a[0] - o[0], qy = s.a[1] - o[1];
  const t = (qx * ey - qy * ex) / den, u = (qx * d[1] - qy * d[0]) / den;
  return t > 1e-6 && u >= 0 && u <= 1 ? t : null;
}

// 在樂譜時間 tp 從 src 發聲；牆是否已揭露以 revealAt <= tp 判斷（與時間一致）。
export function trace(maze, src, tp, seed = 0) {
  const r = rng(`rays:${seed}`), arrivals = [];
  for (let i = 0; i < LIMITS.rays; i++) {
    const ang = (i + r() * 0.8) / LIMITS.rays * Math.PI * 2;
    let o = src.slice(), d = [Math.cos(ang), Math.sin(ang)], dist = 0, energy = 1, bounces = 0;
    const path = [src.slice()];
    while (true) {
      let best = Infinity, bs = null;
      for (const s of maze.segs) { const t = hit(o, d, s); if (t != null && t < best) { best = t; bs = s; } }
      if (!bs) break;
      dist += Math.max(best, bounces === 0 ? LIMITS.minDist : 0.05);
      if (dist > LIMITS.maxPath) break;
      const p = [o[0] + d[0] * best, o[1] + d[1] * best];
      path.push(p);
      const back = Math.hypot(p[0] - src[0], p[1] - src[1]);
      const total = Math.max(LIMITS.minDist * 2, dist + back);
      const known = bs.revealAt <= tp;
      arrivals.push({ t: tp + total / C, seg: bs.id, p, energy: energy / (1 + 0.12 * total) * (known ? 0.55 : 1), bounces, reveal: !known, path: path.map(q => q.slice()), dir: Math.atan2(p[1] - src[1], p[0] - src[0]) });
      if (!known || bounces >= LIMITS.bounces) break;
      // 已揭露的牆：鏡面反射
      const ex = bs.b[0] - bs.a[0], ey = bs.b[1] - bs.a[1], L = Math.hypot(ex, ey), nx = -ey / L, ny = ex / L;
      const dot = d[0] * nx + d[1] * ny; d = [d[0] - 2 * dot * nx, d[1] - 2 * dot * ny];
      o = [p[0] + d[0] * 1e-4, p[1] + d[1] * 1e-4]; energy *= LIMITS.decay; bounces++;
    }
  }
  // 每段牆只保留最早抵達的揭露；總數有上限（保留最強的）
  const firstReveal = new Map();
  for (const a of arrivals) if (a.reveal && (!firstReveal.has(a.seg) || firstReveal.get(a.seg).t > a.t)) firstReveal.set(a.seg, a);
  const cand = arrivals.filter(a => !a.reveal || firstReveal.get(a.seg) === a);
  // 優先保留揭露新牆的回聲，其次是經過反射的回聲，再依能量
  const rank = a => (a.reveal ? 2 : 0) + (a.bounces > 0 ? 1 : 0) + a.energy;
  const kept = cand.sort((a, b) => rank(b) - rank(a)).slice(0, LIMITS.maxArrivals);
  return kept.sort((a, b) => a.t - b.t);
}

export function revealedFraction(maze, t) { return maze.segs.filter(s => s.revealAt <= t).length / maze.segs.length; }

// 下一個探索目標：從目前格子走一步，朝向最近的「周圍還有未揭露牆」的格子
export function nextCell(maze, cell, t) {
  const unknownAround = c => {
    const [x0, y0] = maze.center(c[0], c[1]);
    return maze.segs.filter(s => s.revealAt > t && Math.hypot((s.a[0] + s.b[0]) / 2 - x0, (s.a[1] + s.b[1]) / 2 - y0) < CELL * 0.8).length;
  };
  const prev = new Map([[String(cell), null]]), q = [cell];
  while (q.length) {
    const c = q.shift();
    if (String(c) !== String(cell) && unknownAround(c) > 0) {
      let step = c; while (prev.get(String(step)) && String(prev.get(String(step))) !== String(cell)) step = prev.get(String(step));
      return step;
    }
    for (const n of neighbors(maze, c)) if (!prev.has(String(n))) { prev.set(String(n), c); q.push(n); }
  }
  return null;
}
