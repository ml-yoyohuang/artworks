/* 01 快樂傳到下一個 — Pass It On
 * Five strokes form a relay course. A hump runs along one stroke, compresses
 * at its end, flicks a vermilion bead across the gap; the next stroke dips as
 * it catches, then carries the hump on. Every fourth lap all strokes run
 * together in canon. Visuals are a pure function of the beat + the lap plan;
 * the catch/launch springs are timed from the same score events. */
(function () {
  var U = Sound2.U, V = Sound2.V;
  var INK = ['#22304a', '#d29a2a', '#5e8466', '#6e4c6c', '#4f6f9c'];
  var BEAD = '#e8452c', PAPER = '#ebe5d8';
  // D major pentatonic voices for the five strokes
  var PITCH = [69, 71, 74, 76, 78];
  var BASS = [38, 35, 31, 33];

  Sound2.start({
    id: '01-wave-relay', bpm: 100, tempoMin: 72, tempoMax: 132,
    bg: PAPER, fg: '#1f2a33', accent: BEAD,
    alt: '五條粗細不同的線依序接力：一個隆起沿線前進，到尾端縮起、彈出一顆朱紅光點，下一條線接住後才出發。',
    lede: '一個隆起沿著線跑到盡頭，<br>縮一下、跳出去。<br>下一條線接住了，才輪到它出發。',
    about: '<p>五條粗細、長短、姿態都不同的線，排成一條接力路線。隆起在線上前進，線本身不動；到了尾端，它先縮緊、再把一顆光點拋向下一條線。被接住的線會往下一沉，回彈後，才開始自己的旅程。</p><p>每條線有自己的音高：接住是木琴、途中是輕輕的撥弦、拋出是更高的一聲。每跑完三圈，五條線會一起起跑，像一段卡農。</p>',
    how: '「隊形」改變路線的排法；「換一個」重新生成路線的姿態（同一個 seed 一定得到同一條路線）；速度在「調整」裡。',
    params: [{ key: 'formation', label: '隊形', type: 'select', value: 'river', options: [['river', '五線'], ['zigzag', '折線'], ['ring', '環']] }],
    create: function (api) {
      var W = 0, H = 0, box, unit = 1, lines = [], plan = null, seed = 1, form = 'river';
      var lastCatch = [-99, -99, -99, -99, -99], lastLaunch = [-99, -99, -99, -99, -99];

      function build() {
        if (!box) return;
        var r = U.rng(seed * 31 + (form === 'zigzag' ? 1 : form === 'river' ? 2 : 3));
        var portrait = box.h > box.w * 1.15, ends = [], i;
        var gap = 70 * unit;
        if (form === 'ring') {
          var cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.min(box.w, box.h) * .4, a0 = -Math.PI / 2 + r.range(-.3, .3);
          for (i = 0; i < 5; i++) {
            var ga = gap / R, aA = a0 + i * U.TAU / 5 + ga * .5, aB = a0 + (i + 1) * U.TAU / 5 - ga * .5;
            var rA = R * r.range(.9, 1.06), rB = R * r.range(.9, 1.06);
            ends.push({ A: { x: cx + Math.cos(aA) * rA, y: cy + Math.sin(aA) * rA }, B: { x: cx + Math.cos(aB) * rB, y: cy + Math.sin(aB) * rB }, out: { x: cx, y: cy } });
          }
        } else if (form === 'river') {
          for (i = 0; i < 5; i++) {
            var y = box.y + box.h * (.1 + .8 * i / 4) + r.range(-.03, .03) * box.h, inset = portrait ? .05 : .1;
            var xl = box.x + box.w * r.range(0, inset), xr = box.x + box.w * (1 - r.range(0, inset));
            ends.push(i % 2 ? { A: { x: xr, y: y }, B: { x: xl, y: y + r.range(-.02, .02) * box.h } } : { A: { x: xl, y: y }, B: { x: xr, y: y + r.range(-.02, .02) * box.h } });
          }
        } else {
          var nodes = [], zz = [.3, .66, .28, .7, .34, .64];
          for (i = 0; i < 6; i++) {
            var along = .02 + .96 * i / 5 + (i > 0 && i < 5 ? r.range(-.035, .035) : 0), across = zz[i] + r.range(-.05, .05);
            nodes.push(portrait ? { x: box.x + box.w * across, y: box.y + box.h * along } : { x: box.x + box.w * along, y: box.y + box.h * across });
          }
          for (i = 0; i < 5; i++) ends.push({ A: nodes[i], B: nodes[i + 1] });
        }
        var widths = r.shuffle([10, 15, 21, 28, 37]), colors = r.shuffle(INK), pitches = r.shuffle(PITCH);
        lines = ends.map(function (e, k) {
          var dx = e.B.x - e.A.x, dy = e.B.y - e.A.y, len = Math.hypot(dx, dy), tx = dx / len, ty = dy / len;
          var A = { x: e.A.x + tx * gap * .5, y: e.A.y + ty * gap * .5 }, B = { x: e.B.x - tx * gap * .5, y: e.B.y - ty * gap * .5 };
          if (form === 'ring') { A = e.A; B = e.B; }
          var nx = -ty, ny = tx, side;
          if (form === 'ring') { var mx = (A.x + B.x) / 2 - e.out.x, my = (A.y + B.y) / 2 - e.out.y; side = (nx * mx + ny * my) > 0 ? 1 : -1; }
          else if (Math.abs(ty) < Math.abs(tx) * 1.4) side = ny < 0 ? 1 : -1;
          else side = nx < 0 ? 1 : -1;
          return {
            A: A, B: B, len: Math.hypot(B.x - A.x, B.y - A.y), nx: nx, ny: ny, side: side,
            bow: form === 'ring' ? .17 * side : (form === 'river' ? r.range(.012, .04) : r.range(.05, .13)) * (r.chance(.5) ? 1 : -1), wig: form === 'ring' ? 0 : form === 'river' ? r.range(-.018, .018) : r.range(-.05, .05),
            w: widths[k] * unit, color: colors[k], pitch: pitches[k], pts: [], S: [], k: k
          };
        });
        makePlan();
      }

      /* Lap plan: travel time follows length (quantized to half beats); the
       * last stroke waits at its end so a lap is a whole number of bars. */
      function makePlan() {
        var avg = lines.reduce(function (a, l) { return a + l.len; }, 0) / 5, legs = [], t = 0;
        lines.forEach(function (l, i) {
          var T = U.clamp(Math.round(l.len / avg * 2.4 * 2) / 2, 1.5, 3.5), F = i === 4 && form !== 'ring' ? 1 : .5;
          legs.push({ line: i, start: t, travel: T, flight: F }); t += T + F;
        });
        var lap = Math.ceil(t / 4) * 4, pad = lap - t;
        legs[4].wait = pad; legs.forEach(function (g, i) { g.launch = g.start + g.travel + (i === 4 ? pad : 0); });
        plan = { legs: legs, lap: lap, cycle: lap * 3 + 8 };
      }

      function shapeBow(l, c) {
        // the course drifts a little each cycle (每幾個樂句改變一部分路線)
        if (form === 'ring') return { bow: l.bow, wig: 0 };
        var a = U.at(seed, c, l.k) - .5, b = U.at(seed, c + 1, l.k) - .5, k = form === 'river' ? .3 : 1;
        return { a: { bow: l.bow + a * .08 * k, wig: l.wig + a * .05 * k }, b: { bow: l.bow + b * .08 * k, wig: l.wig + b * .05 * k } };
      }
      function trace(l, bow, wig) {
        var n = Math.round(56 * (api.quality < 1 ? .7 : 1)), pts = [];
        for (var i = 0; i <= n; i++) {
          var u = i / n, x = U.lerp(l.A.x, l.B.x, u), y = U.lerp(l.A.y, l.B.y, u), d = (bow * Math.sin(Math.PI * u) + wig * Math.sin(U.TAU * u)) * l.len;
          pts.push({ x: x + l.nx * d, y: y + l.ny * d });
        }
        l.pts = pts; l.S = U.arc(pts);
      }

      /* Where is everything at beat b? */
      function stateAt(b) {
        var cyc = Math.floor(b / plan.cycle), p = b - cyc * plan.cycle, st = { humps: [], beads: [], rest: null, cyc: cyc, p: p };
        if (p < plan.lap * 3) {
          var q = U.mod(p, plan.lap), lapIx = Math.floor(p / plan.lap);
          plan.legs.forEach(function (g) {
            var end = g.launch;
            if (q >= g.start && q < end) {
              var u = U.sat((q - g.start) / g.travel), s = .62 * u + .38 * U.inOut(u);
              var squeeze = U.smooth((q - (end - .4)) / .4);
              st.humps.push({ line: g.line, s: Math.min(s, 1) * (1 - .05 * squeeze), grow: U.outBack(U.sat((q - g.start) / .32), 2.2), squeeze: squeeze, wait: U.sat((q - g.start - g.travel) / Math.max(g.wait || 0, .01)) });
            }
            if (q >= end && q < end + g.flight) st.beads.push({ from: g.line, to: (g.line + 1) % 5, u: (q - end) / g.flight, long: g.flight > .5 });
          });
          if (lapIx === 0 && q < .02) st.rest = 0;
        } else {
          var gq = p - plan.lap * 3;
          for (var j = 0; j < 5; j++) {
            var s0 = j * .5, e0 = s0 + 2;
            if (gq >= s0 && gq < e0) { var uu = (gq - s0) / 2; st.humps.push({ line: j, s: .55 * uu + .45 * U.inOut(uu), grow: U.outBack(U.sat((gq - s0) / .3), 2.2), squeeze: U.smooth((gq - (e0 - .35)) / .35), group: true }); }
            if (gq >= e0 && gq < e0 + .5) st.beads.push({ from: j, to: (j + 1) % 5, u: (gq - e0) / .5 });
          }
          if (gq >= 4.5) st.rest = 0;
        }
        return st;
      }

      function events(b0, b1) {
        var out = [];
        if (!plan) return out;
        var c0 = Math.floor(b0 / plan.cycle), c1 = Math.floor(b1 / plan.cycle);
        for (var c = c0; c <= c1; c++) {
          var base = c * plan.cycle;
          for (var lap = 0; lap < 3; lap++) {
            var lb = base + lap * plan.lap;
            if (lb + plan.lap < b0 || lb > b1) continue;
            plan.legs.forEach(function (g) {
              push(out, b0, b1, { b: lb + g.start, type: lap === 0 && g.line === 0 ? 'start' : 'catch', line: g.line });
              push(out, b0, b1, { b: lb + g.start + Math.min(1, g.travel / 2), type: 'pass', line: g.line });
              push(out, b0, b1, { b: lb + g.launch, type: 'launch', line: g.line, long: g.line === 4 });
            });
          }
          var gb = base + plan.lap * 3;
          for (var j = 0; j < 5; j++) {
            push(out, b0, b1, { b: gb + j * .5, type: 'gstart', line: j, n: j });
            push(out, b0, b1, { b: gb + j * .5 + 2, type: 'glaunch', line: j, n: j });
            push(out, b0, b1, { b: gb + j * .5 + 2.5, type: 'gcatch', line: (j + 1) % 5, n: j });
          }
        }
        for (var bar = Math.ceil(b0 / 4); bar * 4 < b1; bar++) push(out, b0, b1, { b: bar * 4, type: 'bass', bar: bar });
        return out;
      }
      function push(out, b0, b1, e) { if (e.b >= b0 && e.b < b1) out.push(e); }

      function bezier(a, c1, c2, d, t) {
        var u = 1 - t;
        return { x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * d.y };
      }
      function flightPath(fromL, toL, long) {
        var a = fromL.pts[fromL.pts.length - 1], an = fromL.pts[fromL.pts.length - 2], d = toL.pts[0], dn = toL.pts[1];
        var ta = { x: a.x - an.x, y: a.y - an.y }, td = { x: dn.x - d.x, y: dn.y - d.y }, la = Math.hypot(ta.x, ta.y) || 1, ld = Math.hypot(td.x, td.y) || 1;
        var dist = Math.hypot(d.x - a.x, d.y - a.y), reach = Math.max(dist * .5, 40 * unit), lift = (long ? .32 : .5) * dist + 18 * unit;
        // lift toward the hump side of the launching stroke
        var sx = fromL.nx * fromL.side, sy = fromL.ny * fromL.side;
        if (form !== 'ring') { sx = 0; sy = -1; }
        return [a, { x: a.x + ta.x / la * reach + sx * lift, y: a.y + ta.y / la * reach + sy * lift }, { x: d.x - td.x / ld * reach + sx * lift * .6, y: d.y - td.y / ld * reach + sy * lift * .6 }, d];
      }

      function drawLine(g, l, b, hump) {
        var pts = l.pts, S = l.S, L = S[S.length - 1], n = pts.length, A = 74 * unit, out = [], w = [];
        var catchT = b - lastCatch[l.k], launchT = b - lastLaunch[l.k], motion = api.motion;
        var hs = hump ? hump.s : -9, width = hump ? Math.max(.05, 58 * unit / l.len) * (1 - .45 * hump.squeeze) : 1, amp = hump ? A * hump.grow * (1 + .5 * hump.squeeze) * motion * (.3 + .7 * U.smooth(hs / (2.4 * width))) : 0;
        var dip = -A * .55 * U.ring(catchT, 1.6, 3.2) * motion, flick = A * .7 * U.ring(launchT, 2.1, 4.5) * motion;
        var breathe = Math.sin(b * Math.PI / 2 + l.k) * .6 * unit;
        for (var i = 0; i < n; i++) {
          var s = S[i] / L, x = s - hs;
          // asymmetric hump: steeper leading edge
          var prof = hump ? Math.exp(-(x * x) / (2 * Math.pow(x > 0 ? width * .7 : width * 1.25, 2))) : 0;
          var d = amp * prof + dip * Math.exp(-s / .1) + flick * U.smooth((s - .82) / .18) + breathe;
          var p0 = pts[Math.max(i - 1, 0)], p1 = pts[Math.min(i + 1, n - 1)], tx = p1.x - p0.x, ty = p1.y - p0.y, tl = Math.hypot(tx, ty) || 1;
          var nx = -ty / tl * l.side, ny = tx / tl * l.side;
          out.push({ x: pts[i].x + nx * d, y: pts[i].y + ny * d });
          w.push(l.w * (1 + .6 * prof * (hump ? hump.grow : 0)));
        }
        // ghost of the resting stroke under the hump: the line keeps its structure
        if (hump && amp > 2) {
          g.save(); g.strokeStyle = U.alpha(l.color, .16); g.lineWidth = Math.max(1, l.w * .18); g.setLineDash([2 * unit, 5 * unit]);
          var a0 = Math.max(0, hs - width * 3), a1 = Math.min(1, hs + width * 2.4);
          g.beginPath(); var started = false;
          for (var k = 0; k < n; k++) { var sk = S[k] / L; if (sk < a0 || sk > a1) continue; if (!started) { g.moveTo(pts[k].x, pts[k].y); started = true; } else g.lineTo(pts[k].x, pts[k].y); }
          g.stroke(); g.restore();
        }
        if (hump && amp > 2) {
          var lo = Math.max(0, hs - width * 3.2), hi = Math.min(1, hs + width * 2.4), top = [], bot = [];
          for (var q = 0; q < n; q++) { var sq = S[q] / L; if (sq < lo || sq > hi) continue; top.push(out[q]); bot.push(pts[q]); }
          if (top.length > 2) { g.fillStyle = U.alpha(l.color, .13); g.beginPath(); g.moveTo(top[0].x, top[0].y); top.forEach(function (p) { g.lineTo(p.x, p.y); }); for (var z = bot.length - 1; z >= 0; z--) g.lineTo(bot[z].x, bot[z].y); g.closePath(); g.fill(); }
        }
        g.fillStyle = l.color; U.band(g, out, w, true);
        l.drawn = out;
        if (hump) {
          // crest bead rides on top of the hump
          var ci = 0, best = 9; for (var m = 0; m < n; m++) { var dm = Math.abs(S[m] / L - hs); if (dm < best) { best = dm; ci = m; } }
          var c = out[ci], p0b = out[Math.max(ci - 1, 0)], p1b = out[Math.min(ci + 1, n - 1)], tlx = p1b.x - p0b.x, tly = p1b.y - p0b.y, tll = Math.hypot(tlx, tly) || 1;
          var r = (8 + l.w * .36) * Math.min(1, hump.grow);
          var ox = -tly / tll * l.side * (l.w * .5 + r * .9), oy = tlx / tll * l.side * (l.w * .5 + r * .9);
          bead(g, c.x + ox, c.y + oy, r, 0, 0, 1 + hump.squeeze * .25);
        }
      }
      function bead(g, x, y, r, vx, vy, squash) {
        var sp = Math.hypot(vx, vy), ang = Math.atan2(vy, vx), st = 1 + Math.min(sp, 1) * .35;
        g.save(); g.translate(x, y); g.rotate(ang); g.scale(st / (squash || 1), (squash || 1) / st);
        g.fillStyle = BEAD; g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-r * .3, -r * .35, r * .32, 0, U.TAU); g.fill();
        g.restore();
      }

      return {
        layout: function (w, h, safe) {
          W = w; H = h;
          var pad = Math.min(w, h) * .05;
          box = { x: safe.l + pad, y: safe.t + pad * .6, w: w - safe.l - safe.r - pad * 2, h: h - safe.t - safe.b - pad * 1.2 };
          unit = U.clamp(Math.min(box.w, box.h) / 620, .55, 1.5);
          build();
        },
        seed: function (s) { seed = s; build(); },
        set: function (k, v) { if (k === 'formation') { form = v; build(); } },
        events: events,
        onEvent: function (e) {
          if (e.type === 'catch' || e.type === 'gcatch' || (e.type === 'gstart' && e.line === 0)) lastCatch[e.line] = e.b;
          if (e.type === 'launch' || e.type === 'glaunch') lastLaunch[e.line] = e.b;
        },
        draw: function (g, b) {
          g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
          if (!plan) return;
          var st = stateAt(b), cyc = st.cyc, mor = U.smooth((st.p - (plan.cycle - 3)) / 3);
          lines.forEach(function (l) {
            var sb = shapeBow(l, cyc);
            if (sb.a) trace(l, U.lerp(sb.a.bow, sb.b.bow, mor), U.lerp(sb.a.wig, sb.b.wig, mor)); else trace(l, sb.bow, sb.wig);
          });
          // exchange-zone ticks between strokes
          g.strokeStyle = 'rgba(31,42,51,.22)'; g.lineWidth = 1.2;
          lines.forEach(function (l, i) {
            var nl = lines[(i + 1) % 5], a = l.pts[l.pts.length - 1], d = nl.pts[0];
            if (form !== 'ring' && i === 4) return;
            var mx = (a.x + d.x) / 2, my = (a.y + d.y) / 2, ang = Math.atan2(d.y - a.y, d.x - a.x) + Math.PI / 2, s = 7 * unit;
            for (var k = -1; k <= 1; k += 2) { g.beginPath(); g.moveTo(mx + Math.cos(ang) * s + k * 3 * unit * Math.cos(ang - Math.PI / 2), my + Math.sin(ang) * s + k * 3 * unit * Math.sin(ang - Math.PI / 2)); g.lineTo(mx - Math.cos(ang) * s + k * 3 * unit * Math.cos(ang - Math.PI / 2), my - Math.sin(ang) * s + k * 3 * unit * Math.sin(ang - Math.PI / 2)); g.stroke(); }
          });
          g.lineCap = 'round';
          lines.forEach(function (l) {
            var h = null; st.humps.forEach(function (x) { if (x.line === l.k) h = x; });
            drawLine(g, l, b, h);
          });
          if (st.rest != null) {
            var l0 = lines[st.rest], p = l0.drawn[0], br = 1 + .08 * Math.sin(b * Math.PI);
            bead(g, p.x + l0.nx * l0.side * (l0.w * .5 + 9 * unit), p.y + l0.ny * l0.side * (l0.w * .5 + 9 * unit), (8 + l0.w * .36) * br, 0, 0, 1);
          }
          st.beads.forEach(function (bd) {
            var fp = flightPath(lines[bd.from], lines[bd.to], bd.long), u = bd.u, r = 8 + lines[bd.from].w * .36 * (1 - u) + lines[bd.to].w * .36 * u;
            for (var k = 6; k >= 1; k--) {
              var ut = u - k * .035; if (ut <= 0) continue;
              var q = bezier(fp[0], fp[1], fp[2], fp[3], ut);
              g.fillStyle = U.alpha(BEAD, .1 + .05 * (6 - k)); g.beginPath(); g.arc(q.x, q.y, r * (1 - k * .1), 0, U.TAU); g.fill();
            }
            var p = bezier(fp[0], fp[1], fp[2], fp[3], u), p2 = bezier(fp[0], fp[1], fp[2], fp[3], Math.min(1, u + .02));
            bead(g, p.x, p.y, r, (p2.x - p.x) * .2, (p2.y - p.y) * .2, 1);
          });
          U.grain(g, W, H, .18);
        },
        audio: function (T, chain) {
          var mallet = V.mallet(T, chain.bus, { harm: 3.99, index: 1.6, decay: .9, volume: -9 });
          var pluck = V.pluck(T, chain.bus, { decay: .16, cutoff: 3400, volume: -15 });
          var bell = V.bell(T, chain.bus, { volume: -18, decay: 1.8 });
          var bass = V.bass(T, chain.dry, { volume: -13, cutoff: 420 });
          var self = {
            list: [mallet, pluck, bell, bass],
            play: function (e, t, spb) {
              var p = lines[e.line] ? lines[e.line].pitch : 74;
              if (e.type === 'catch') mallet.triggerAttackRelease(U.mtof(p), .5, t, e.quiet ? .45 : .8);
              else if (e.type === 'start') { mallet.triggerAttackRelease(U.mtof(p), .5, t, .7); bell.triggerAttackRelease(U.mtof(p + 12), 1, t, .25); }
              else if (e.type === 'pass') pluck.triggerAttackRelease(U.mtof(p - 5), .12, t, .35);
              else if (e.type === 'launch') pluck.triggerAttackRelease(U.mtof(p + 12), .1, t, e.long ? .9 : .65);
              else if (e.type === 'gstart') mallet.triggerAttackRelease(U.mtof(PITCH[e.n]), .4, t, .55 + e.n * .05);
              else if (e.type === 'glaunch') bell.triggerAttackRelease(U.mtof(PITCH[e.n] + 12), .8, t, .32);
              else if (e.type === 'gcatch') pluck.triggerAttackRelease(U.mtof(PITCH[(e.n + 2) % 5]), .15, t, .3);
              else if (e.type === 'bass') bass.triggerAttackRelease(U.mtof(BASS[U.mod(e.bar, 4)]), spb * 2.6, t, .7);
            }
          };
          return self;
        }
      };
    }
  });
})();
