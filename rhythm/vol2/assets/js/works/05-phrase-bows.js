/* 05 把旋律打個結 — Tie the Tune
 * Two 2.5D satin ribbons. Each is a 3D centreline with a twist frame; it is
 * cut into quads that are depth-sorted together with the other ribbon and
 * drawn with front/back colours chosen by the facing of each quad, so
 * crossings occlude correctly and a turning ribbon shows its other side
 * instead of vanishing. A 16-beat phrase: untie → approach → wrap → tie on
 * the cadence → hold. Melody notes travel along their ribbon as swells. */
(function () {
  var U = Sound2.U, V = Sound2.V;
  var BG = '#dfe5dc';
  var RIB = [
    { front: '#e0482f', back: '#f4b7a6', note: 'A' },
    { front: '#24379a', back: '#9db6e8', note: 'B' }
  ];
  var NP = 11, PHR = 16;
  var SCALE = [0, 2, 4, 5, 7, 9, 11];
  function deg(d) { var o = Math.floor(d / 7); return 67 + SCALE[U.mod(d, 7)] + 12 * o; }

  /* keyframes: [x, y, z, twist] for 11 control points, index 0 = free tail */
  function mirror(K) { return K.map(function (p) { return [-p[0], p[1], p[2], -p[3]]; }); }
  function pad(K) { while (K.length < NP) { var l = K[K.length - 1], q = K[K.length - 2]; K.push([l[0] + (l[0] - q[0]) * .12, l[1] + (l[1] - q[1]) * .12, l[2], l[3]]); } return K; }
  var BOW_A = [[-.62, 1.02, 0, .9], [-.46, .7, .02, .6], [-.24, .36, .05, .25], [-.04, .08, .16, 1.1], [.3, -.22, .05, .2], [.7, -.46, 0, 0], [.95, -.18, -.02, -.25], [.7, .1, -.05, .1], [.28, .06, -.1, .8], [.08, .02, -.14, 1.3], [.02, 0, -.16, 1.4]];
  var BOW_B = [[.62, 1.02, 0, -.8], [.46, .7, .02, -.5], [.24, .36, .04, -.2], [.04, .1, .02, -.9], [-.3, -.22, .05, -.2], [-.7, -.46, 0, 0], [-.95, -.18, -.02, .25], [-.7, .1, -.02, -.1], [-.26, .02, .1, -.5], [.02, -.13, .26, -.15], [.03, .17, .26, -.1]];
  var HEART_A = pad([[.55, 1.0, 0, .7], [.36, .76, .02, .4], [.1, .46, .14, .3], [-.22, .16, .06, .1], [-.58, -.14, 0, 0], [-.66, -.5, 0, -.15], [-.38, -.72, 0, -.2], [-.08, -.5, -.04, .4], [.02, -.32, -.1, .9]]);
  var HEART_B = pad(mirror([[.55, 1.0, 0, .7], [.36, .76, .02, .4], [.1, .46, -.12, .3], [-.22, .16, .06, .1], [-.58, -.14, 0, 0], [-.66, -.5, 0, -.15], [-.38, -.72, 0, -.2], [-.08, -.5, .04, .4], [.02, -.32, .12, .9]]));
  var PRETZ_A = pad([[-1.0, .62, 0, .8], [-.62, .48, .02, .3], [-.2, .2, .14, .2], [.2, -.16, .06, 0], [.56, -.48, 0, -.1], [.9, -.3, 0, -.2], [.8, .14, -.02, .1], [.42, .22, -.08, .4], [.04, -.04, -.14, .7], [-.22, -.3, -.06, .3]]);
  var PRETZ_B = pad(mirror([[-1.0, .62, 0, .8], [-.62, .48, .02, .3], [-.2, .2, -.12, .2], [.2, -.16, .06, 0], [.56, -.48, 0, -.1], [.9, -.3, 0, -.2], [.8, .14, -.02, .1], [.42, .22, .1, .4], [.04, -.04, .16, .7], [-.22, -.3, .08, .3]]));
  var SHAPES = { bow: [BOW_A, BOW_B], heart: [HEART_A, HEART_B], pretzel: [PRETZ_A, PRETZ_B] };
  var ORDER = ['bow', 'heart', 'pretzel'];

  Sound2.start({
    id: '05-phrase-bows', bpm: 84, tempoMin: 64, tempoMax: 108,
    bg: BG, fg: '#1e2626', accent: '#e0482f', wet: .3, reverb: 3.2,
    alt: '朱紅與群青兩條緞帶隨兩段旋律靠近、繞行，在樂句結尾打成一個鬆鬆的結，停留一下，再慢慢解開，組成下一個結形。',
    lede: '兩條旋律越靠越近，<br>在句尾打成一個結，<br>停一下，再慢慢鬆開。',
    about: '<p>兩條緞帶各帶一段旋律。它們從畫面兩側出發：靠近、交錯、繞過彼此，在樂句的最後一拍收緊成一個鬆鬆的結。音符像小小的鼓起，順著緞帶流向結心。</p><p>每一次的結形都有同樣的文法——接近、繞行、成結、停留、解開——只是結出不同的形狀：蝴蝶結、心形結、雙圈結。緞帶有正反兩面，翻轉時看得見背面的淺色。</p>',
    how: '拖曳緞帶的尾端可以輕輕改變結形（放手後會回到原位）。「帶寬」與「結形」在「調整」裡。',
    params: [
      { key: 'width', label: '帶寬', type: 'range', min: .07, max: .2, step: .005, value: .13, format: function (v) { return Math.round(v * 100) + ''; } },
      { key: 'shape', label: '結形', type: 'select', value: 'cycle', options: [['cycle', '輪替'], ['bow', '蝴蝶結'], ['heart', '心形結'], ['pretzel', '雙圈結']] }
    ],
    create: function (api) {
      var W = 0, H = 0, cx = 0, cy = 0, R = 100, seed = 1, widthK = .13, shapeMode = 'cycle', free = [], near = [], drag = null, tug = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
      var melodies = [];

      function build() {
        var r = U.rng(seed * 7 + 11);
        free = [0, 1].map(function (k) {
          var s = k ? -1 : 1, a = r.range(0, 6), out = [];
          for (var i = 0; i < NP; i++) { var u = i / (NP - 1); out.push([-s * U.lerp(2.1, .5, u), (k ? -.32 : .38) * (1 - u) + .14 * Math.sin(u * 5 + a), .12 * Math.sin(u * 4 + a), .7 * Math.sin(u * 6 + a)]); }
          return out;
        });
        near = [0, 1].map(function (k) {
          var s = k ? -1 : 1, out = [];
          for (var i = 0; i < NP; i++) { var u = i / (NP - 1); out.push([-s * U.lerp(1.2, -.3, u), U.lerp(.78, -.08, u) + .18 * Math.sin(u * Math.PI) * (k ? 1 : -1), (k ? -.12 : .14) * Math.sin(u * Math.PI), .5 * Math.sin(u * 4)]); }
          return out;
        });
        melodies = [];
        for (var p = 0; p < 6; p++) melodies.push(makeMelody(U.rng(seed * 101 + p)));
      }

      /* Two converging lines; both cadence on beat 11 (A on the 3rd, B on the root). */
      function makeMelody(r) {
        var A = [[4, 9], [5, 7], [5.5, 8], [7, 6], [8, 5], [8.5, 4], [9.5, 3], [11, 2]], B = [[4.5, -5], [6, -3], [6.5, -4], [7.5, -2], [9, -1], [10, -3], [10.5, -1], [11, 0]];
        A = A.map(function (n, i) { return [n[0], n[1] + (i > 0 && i < 7 && r.chance(.35) ? r.pick([-1, 1]) : 0)]; });
        B = B.map(function (n, i) { return [n[0], n[1] + (i > 0 && i < 7 && r.chance(.3) ? r.pick([-1, 1]) : 0)]; });
        if (r.chance(.5)) A.splice(3, 0, [7.5, A[3][1] + 1]);
        return { A: A, B: B, orn: r.pick([[13, 4], [13.5, 4], [13, 6]]) };
      }
      function shapeFor(ph) { return shapeMode === 'cycle' ? ORDER[U.mod(ph + (seed % 3), 3)] : shapeMode; }

      function events(b0, b1) {
        var out = [];
        for (var ph = Math.floor(b0 / PHR); ph <= Math.floor(b1 / PHR); ph++) {
          var base = ph * PHR, m = melodies[U.mod(ph, melodies.length)];
          if (!m) return out;
          var add = function (e) { e.b += base; if (e.b >= b0 && e.b < b1) out.push(e); };
          m.A.forEach(function (n, i) { add({ b: n[0], type: 'note', rib: 0, deg: n[1], end: i === m.A.length - 1 }); });
          m.B.forEach(function (n, i) { add({ b: n[0], type: 'note', rib: 1, deg: n[1], end: i === m.B.length - 1 }); });
          add({ b: m.orn[0], type: 'orn', rib: 0, deg: m.orn[1] });
          [[0, 'Em'], [4, 'C'], [7, 'D'], [11, 'G']].forEach(function (c) { add({ b: c[0], type: 'chord', ch: c[1] }); });
          add({ b: 11, type: 'tie' });
        }
        return out;
      }

      /* control points for ribbon k at beat b */
      function controls(k, b) {
        var ph = Math.floor(b / PHR), t = b - ph * PHR, cur = SHAPES[shapeFor(ph)][k], prev = SHAPES[shapeFor(ph - 1)][k];
        var from, to, u, ripple;
        // untie (0–4) → approach (4–7) → wrap (7–9.5) → tie (9.5–11) → hold (11–16)
        if (t < 4) { from = prev; to = free[k]; u = U.inOut(t / 4); ripple = U.smooth(t / 4); }
        else if (t < 7) { from = free[k]; to = near[k]; u = U.inOut((t - 4) / 3); ripple = 1 - .5 * u; }
        else if (t < 11) { from = near[k]; to = cur; u = U.inOut((t - 7) / 4); ripple = .5 * (1 - u); }
        else { from = cur; to = cur; u = 0; ripple = 0; }
        var breathe = t >= 11 ? Math.sin((t - 11) / 5 * Math.PI) * .03 : 0;
        var out = [];
        for (var i = 0; i < NP; i++) {
          var a = from[i], c = to[i], s = i / (NP - 1), wv = Math.sin(s * 7 - b * 1.6 + k * 2) * .07 * ripple * api.motion;
          var p = { x: U.lerp(a[0], c[0], u), y: U.lerp(a[1], c[1], u) + wv, z: U.lerp(a[2], c[2], u), tw: U.lerp(a[3], c[3], u) + wv * 2 };
          p.x *= 1 + breathe; p.y *= 1 + breathe * .5;
          // tug on the free tail: falls off toward the knot
          var fall = Math.pow(1 - s, 2.2); p.x += tug[k].x * fall; p.y += tug[k].y * fall;
          out.push(p);
        }
        return out;
      }

      function frameAt(pts, i) {
        var a = pts[Math.max(i - 1, 0)], c = pts[Math.min(i + 1, pts.length - 1)];
        var tx = c.x - a.x, ty = c.y - a.y, tz = c.z - a.z, tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
        // reference width = view axis × tangent (lies in the picture plane), then twist about the tangent
        var wx = -ty, wy = tx, wz = 0, wl = Math.hypot(wx, wy) || 1; wx /= wl; wy /= wl;
        var nx = ty * wz - tz * wy, ny = tz * wx - tx * wz, nz = tx * wy - ty * wx; // n = t × w
        var th = pts[i].tw, c0 = Math.cos(th), s0 = Math.sin(th);
        return { w: [wx * c0 + nx * s0, wy * c0 + ny * s0, wz * c0 + nz * s0], t: [tx, ty, tz] };
      }
      function project(x, y, z) { var s = 4.2 / (4.2 - z); return { x: cx + x * R * s, y: cy + y * R * s }; }

      function ribbonQuads(k, b, quads, swells) {
        var ctrl = controls(k, b), pts = U.spline(ctrl, 13), n = pts.length, edges = [], base = widthK;
        for (var i = 0; i < n; i++) {
          var f = frameAt(pts, i), s = i / (n - 1), sw = 1;
          swells.forEach(function (q) { sw += .55 * q.a * U.gauss(s - q.s, .035); });
          var hw = base * sw * (1 - .25 * Math.pow(s, 6)) / 2, p = pts[i];
          var L = [p.x + f.w[0] * hw, p.y + f.w[1] * hw, p.z + f.w[2] * hw], Rr = [p.x - f.w[0] * hw, p.y - f.w[1] * hw, p.z - f.w[2] * hw];
          edges.push({ L: L, R: Rr, c: p, t: f.t, w: f.w });
        }
        for (var j = 0; j < n - 1; j++) {
          var e0 = edges[j], e1 = edges[j + 1];
          var nx = e0.t[1] * e0.w[2] - e0.t[2] * e0.w[1], ny = e0.t[2] * e0.w[0] - e0.t[0] * e0.w[2], nz = e0.t[0] * e0.w[1] - e0.t[1] * e0.w[0];
          var poly = [e0.L, e1.L, e1.R, e0.R];
          if (j === 0) { // dovetail cut at the free tail
            var tip = [e0.c.x + e0.t[0] * base * .45, e0.c.y + e0.t[1] * base * .45, e0.c.z];
            poly = [e0.L, e1.L, e1.R, e0.R, tip];
          }
          quads.push({ k: k, z: (e0.c.z + e1.c.z) / 2 + (k ? .0005 : 0), poly: poly, n: [nx, ny, nz], s: j / (n - 1) });
        }
      }

      function swellsFor(k, b) {
        var list = [], evs = events(b - 2.2, b);
        evs.forEach(function (e) { if (e.type === 'note' && e.rib === k || e.type === 'orn' && k === 0) { var age = b - e.b, s = .05 + age / 2.2 * .85; list.push({ s: s, a: Math.exp(-age * .8) * (e.end ? 1.3 : 1) }); } });
        return list;
      }

      function nearestTail(x, y) {
        var best = -1, bd = 1e9;
        [0, 1].forEach(function (k) { var c = controls(k, api.beat)[0], p = project(c.x, c.y, c.z), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = k; } });
        return bd < R * .35 ? best : -1;
      }

      return {
        layout: function (w, h, safe) {
          W = w; H = h; var bw = w - safe.l - safe.r, bh = h - safe.t - safe.b;
          cx = safe.l + bw / 2; cy = safe.t + bh * .44; R = Math.min(bw / 2.5, bh / 2.3);
        },
        seed: function (s) { seed = s; build(); },
        set: function (k, v) { if (k === 'width') widthK = v; if (k === 'shape') shapeMode = v; },
        events: events,
        down: function (x, y) { var k = nearestTail(x, y); if (k < 0) return; drag = { k: k, x: x, y: y, ox: tug[k].x, oy: tug[k].y }; },
        move: function (x, y, pressed) {
          if (!drag || !pressed) return;
          var dx = (x - drag.x) / R + drag.ox, dy = (y - drag.y) / R + drag.oy, d = Math.hypot(dx, dy), lim = .42;
          if (d > lim) { dx *= lim / d; dy *= lim / d; }
          tug[drag.k].x = dx; tug[drag.k].y = dy;
        },
        up: function () { drag = null; },
        draw: function (g, b, dt) {
          if (!drag) tug.forEach(function (t) { var k = Math.exp(-(dt || 1 / 60) * 2.2); t.x *= k; t.y *= k; });
          g.fillStyle = BG; g.fillRect(0, 0, W, H);
          // a pale disc behind the knot: the stage of the cadence
          var ph = Math.floor(b / PHR), t = b - ph * PHR, tied = t >= 11 ? 1 : U.smooth((t - 9.5) / 1.5) - U.smooth((t - 0) / 3) * 0;
          g.fillStyle = 'rgba(255,255,255,' + (.2 + .18 * tied).toFixed(3) + ')';
          g.beginPath(); g.arc(cx, cy + R * .1, R * 1.18, 0, U.TAU); g.fill();
          var quads = [];
          ribbonQuads(0, b, quads, swellsFor(0, b)); ribbonQuads(1, b, quads, swellsFor(1, b));
          // flat cast shadow on the backdrop
          g.fillStyle = 'rgba(30,45,40,.12)';
          quads.forEach(function (q) { var off = (.25 - q.z) * 26; g.beginPath(); q.poly.forEach(function (v, i) { var p = project(v[0], v[1], 0); if (i) g.lineTo(p.x + off * .5, p.y + off); else g.moveTo(p.x + off * .5, p.y + off); }); g.closePath(); g.fill(); });
          quads.sort(function (a, c) { return a.z - c.z; });
          var L = [-.35, -.55, .76], nl;
          quads.forEach(function (q) {
            var nlen = Math.hypot(q.n[0], q.n[1], q.n[2]) || 1, nx = q.n[0] / nlen, ny = q.n[1] / nlen, nz = q.n[2] / nlen;
            var front = nz >= 0, sgn = front ? 1 : -1, lam = Math.max(0, sgn * (nx * L[0] + ny * L[1] + nz * L[2]));
            var col = front ? RIB[q.k].front : RIB[q.k].back, shade = .62 + .5 * lam, edgeOn = 1 - Math.abs(nz);
            var c = U.hex(col), rgb = [c[0] * shade, c[1] * shade, c[2] * shade].map(function (v) { return Math.min(255, v + 18 * edgeOn * edgeOn); });
            var fill = U.rgb(rgb);
            g.fillStyle = fill; g.strokeStyle = fill; g.lineWidth = .8;
            g.beginPath(); q.poly.forEach(function (v, i) { var p = project(v[0], v[1], v[2]); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }); g.closePath(); g.fill(); g.stroke();
          });
          // satin sheen line along each ribbon's upper edge
          U.grain(g, W, H, .14);
        },
        audio: function (T, chain) {
          var flute = V.soft(T, chain.bus, { wave: 'sine', volume: -11, attack: .05, sustain: .5, release: .8, cutoff: 5000, poly: 4 });
          var clar = V.soft(T, chain.bus, { wave: 'square', volume: -21, attack: .04, sustain: .55, release: .5, cutoff: 1300, poly: 4 });
          var pad = V.soft(T, chain.bus, { volume: -25, attack: 1, release: 2.5, cutoff: 1100 });
          var bass = V.bass(T, chain.dry, { volume: -15, cutoff: 380, sustain: .5, release: 1 });
          var bell = V.bell(T, chain.bus, { volume: -20, decay: 2.4 });
          var CH = { Em: [52, 55, 59, 62], C: [48, 55, 60, 64], D: [50, 54, 57, 62], G: [43, 55, 59, 62] };
          return {
            list: [flute, clar, pad, bass, bell],
            play: function (e, t, spb) {
              if (e.type === 'note') {
                var m = deg(e.deg + (e.rib ? 0 : 0)) + (e.rib ? -12 : 0), d = e.end ? spb * 3 : spb * .8;
                (e.rib ? clar : flute).triggerAttackRelease(U.mtof(m), d, t, e.end ? .75 : .6);
              } else if (e.type === 'orn') flute.triggerAttackRelease(U.mtof(deg(e.deg)), spb * .45, t, .4);
              else if (e.type === 'chord') {
                var c = CH[e.ch];
                pad.triggerAttackRelease(c.slice(1).map(U.mtof), spb * (e.ch === 'G' ? 4.6 : 3.4), t, .45);
                bass.triggerAttackRelease(U.mtof(c[0] - 12), spb * (e.ch === 'G' ? 4 : 3), t, .7);
              } else if (e.type === 'tie') bell.triggerAttackRelease(U.mtof(86), 2, t + .01, .3);
            }
          };
        }
      };
    }
  });
})();
