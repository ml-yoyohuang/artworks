  var U = {};
  U.TAU = Math.PI * 2;
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.inv = function (a, b, v) { return b === a ? 0 : (v - a) / (b - a); };
  U.sat = function (t) { return t < 0 ? 0 : t > 1 ? 1 : t; };
  U.smooth = function (t) { t = U.sat(t); return t * t * (3 - 2 * t); };
  U.smoother = function (t) { t = U.sat(t); return t * t * t * (t * (t * 6 - 15) + 10); };
  U.inOut = function (t) { t = U.sat(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  U.outCubic = function (t) { t = U.sat(t); return 1 - Math.pow(1 - t, 3); };
  U.inCubic = function (t) { t = U.sat(t); return t * t * t; };
  U.outBack = function (t, s) { t = U.sat(t); s = s == null ? 1.7 : s; var u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
  U.window = function (t, a, b) { return t >= a && t < b; };
  /* Phase 0..1 inside [a,b], clamped. */
  U.seg = function (t, a, b) { return U.sat((t - a) / (b - a)); };
  /* Analytic damped oscillation after an impulse at t=0 (t in beats or s). */
  U.ring = function (t, freq, decay) { return t < 0 ? 0 : Math.exp(-decay * t) * Math.sin(U.TAU * freq * t); };
  /* Smooth attack/decay envelope shaped like a struck note. */
  U.env = function (t, attack, decay) { if (t < 0) return 0; if (t < attack) return U.smooth(t / attack); return Math.exp(-(t - attack) / decay); };
  U.gauss = function (x, w) { return Math.exp(-(x * x) / (2 * w * w)); };
  U.mod = function (a, n) { return ((a % n) + n) % n; };
  U.hash = function (str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  U.rng = function (seed) {
    var a = (seed >>> 0) || 1;
    var f = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.range = function (a, b) { return a + (b - a) * f(); };
    f.int = function (a, b) { return Math.floor(a + (b - a + 1) * f()); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    f.chance = function (p) { return f() < p; };
    f.shuffle = function (arr) { var r = arr.slice(); for (var i = r.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var x = r[i]; r[i] = r[j]; r[j] = x; } return r; };
    return f;
  };
  /* Deterministic noise for a (seed, integer) pair: score decisions per bar. */
  U.at = function (seed, n, salt) { return U.rng((seed * 9973 + n * 7919 + (salt || 0) * 104729) >>> 0)(); };
  U.mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  U.hex = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  U.rgb = function (c, a) { return a == null || a >= 1 ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')'; };
  U.mix = function (a, b, t) { var A = typeof a === 'string' ? U.hex(a) : a, B = typeof b === 'string' ? U.hex(b) : b; return [U.lerp(A[0], B[0], t), U.lerp(A[1], B[1], t), U.lerp(A[2], B[2], t)]; };
  U.col = function (a, b, t, alpha) { return U.rgb(U.mix(a, b, t), alpha); };
  U.alpha = function (h, a) { return U.rgb(U.hex(h), a); };
  /* Centripetal-ish Catmull-Rom through points, `n` samples per span. */
  U.spline = function (P, n, closed) {
    var out = [], L = P.length, spans = closed ? L : L - 1;
    for (var i = 0; i < spans; i++) {
      var p0 = P[closed ? U.mod(i - 1, L) : Math.max(i - 1, 0)], p1 = P[i % L], p2 = P[(i + 1) % L], p3 = P[closed ? (i + 2) % L : Math.min(i + 2, L - 1)];
      for (var j = 0; j < n; j++) {
        var t = j / n, t2 = t * t, t3 = t2 * t, o = {};
        for (var k in p1) if (typeof p1[k] === 'number') o[k] = .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        out.push(o);
      }
    }
    if (!closed) { var last = {}; for (var q in P[L - 1]) last[q] = P[L - 1][q]; out.push(last); }
    return out;
  };
  /* Arc-length table for a polyline: returns cumulative lengths. */
  U.arc = function (pts) { var s = [0]; for (var i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)); return s; };
  /* Point & tangent at arc fraction u along a polyline with arc table. */
  U.along = function (pts, S, u) {
    var L = S[S.length - 1], d = U.clamp(u, 0, 1) * L, lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (S[m] < d) lo = m; else hi = m; }
    var a = pts[lo], b = pts[hi], seg = S[hi] - S[lo] || 1, t = (d - S[lo]) / seg, tx = (b.x - a.x) / seg, ty = (b.y - a.y) / seg;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: tx, ty: ty, nx: -ty, ny: tx };
  };
  /* Fill a variable-width stroke (ribbon) along points with widths w[i]. */
  U.band = function (g, pts, w, capRound) {
    var n = pts.length; if (n < 2) return;
    var L = [], R = [];
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, hw = (typeof w === 'number' ? w : w[i]) / 2;
      L.push(pts[i].x + nx * hw, pts[i].y + ny * hw); R.push(pts[i].x - nx * hw, pts[i].y - ny * hw);
    }
    g.beginPath(); g.moveTo(L[0], L[1]);
    for (var j = 2; j < L.length; j += 2) g.lineTo(L[j], L[j + 1]);
    if (capRound) { var e = pts[n - 1], we = (typeof w === 'number' ? w : w[n - 1]) / 2, ae = Math.atan2(L[L.length - 1] - e.y, L[L.length - 2] - e.x); g.arc(e.x, e.y, we, ae, ae - Math.PI, true); }
    for (var k = R.length - 2; k >= 0; k -= 2) g.lineTo(R[k], R[k + 1]);
    if (capRound) { var s = pts[0], ws = (typeof w === 'number' ? w : w[0]) / 2, as = Math.atan2(R[1] - s.y, R[0] - s.x); g.arc(s.x, s.y, ws, as, as - Math.PI, true); }
    g.closePath(); g.fill();
  };
  U.poly = function (g, pts, close) { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); if (close) g.closePath(); };
  /* Paper grain: a cached tile of soft noise, drawn with low alpha. */
  var grainTile = null;
  U.grain = function (g, w, h, alpha) {
    if (!grainTile) {
      grainTile = document.createElement('canvas'); grainTile.width = grainTile.height = 160;
      var x = grainTile.getContext('2d'), id = x.createImageData(160, 160), r = U.rng(7);
      for (var i = 0; i < id.data.length; i += 4) { var v = 110 + r() * 145; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = r() * 70; }
      x.putImageData(id, 0, 0);
    }
    g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(grainTile, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
  };

  /* ------------------------------------------------------------- voices */
  /* Small instrument presets shared by works; each work still chooses its own
   * registers, rhythms and envelopes. All are PolySynths with low polyphony. */

export {U};
