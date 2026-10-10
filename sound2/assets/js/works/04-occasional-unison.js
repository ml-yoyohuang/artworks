/* 04 這一拍，我們一起 — This Beat, Together
 * Three 120° sectors of one disc. Each returns to the centre on its own
 * period (2, 3, 4 beats by default) and springs out again. All periods are
 * phases of one beat clock with a shared origin, so every LCM beats the three
 * arrive together and the disc is whole for a held moment. The outer ring of
 * dots is the score itself: one dot per beat, coloured notches where each
 * sector lands. */
(function () {
  var U = Sound2.U, V = Sound2.V;
  var PAPER = '#e9e6df', INK = '#1d1d1f';
  var COLORS = ['#d9452b', '#2b59c3', '#f2c230'];
  var PRESETS = { a: [2, 3, 4], b: [3, 4, 6], c: [2, 3, 5] };
  var lcm = function (a, b) { var g = function (x, y) { return y ? g(y, x % y) : x; }; return a * b / g(a, b); };
  // C – Am – F – G, one chord per meeting cycle
  var CH = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];

  Sound2.start({
    id: '04-occasional-unison', bpm: 112, tempoMin: 80, tempoMax: 144,
    bg: PAPER, fg: INK, accent: '#d9452b',
    alt: '紅、藍、黃三片扇形各自以不同的拍數回到中心又彈開；每隔十二拍，三片恰好同時抵達，拼成一個完整的圓。外圈的點是拍子，彩色刻痕標出各自落腳的拍點。',
    lede: '紅色每兩拍回來一次，<br>藍色三拍，黃色四拍。<br>第十二拍，大家剛好都在。',
    about: '<p>三片扇形原本是同一個圓。它們各有自己的週期：回到中心、彈開、等待、再回來。平常總是差一點——兩片碰在一起，第三片還在外面。</p><p>外圈的點就是樂譜：每一拍一個點，彩色刻痕是各自抵達的位置。當三種顏色落在同一個點上，圓會完整地停留一下，送出一圈波紋。</p>',
    how: '在「調整」裡換一組週期：2·3·4 與 3·4·6 每十二拍相遇；2·3·5 要等三十拍。切換會在下一拍重新對齊共同起點。',
    params: [{ key: 'periods', label: '週期組合', type: 'select', value: 'a', options: [['a', '2 · 3 · 4'], ['b', '3 · 4 · 6'], ['c', '2 · 3 · 5']] }],
    create: function (api) {
      var W = 0, H = 0, cx = 0, cy = 0, R = 100, unit = 1, seed = 1, key = 'a', P = PRESETS.a, cyc = 12, origin = 0, prev = null, tilt = 0;
      var lastMeet = -99;

      function setPreset(k, at) {
        prev = { P: P, cyc: cyc, origin: origin, until: at };
        key = k; P = PRESETS[k]; cyc = P.reduce(lcm); origin = at;
      }
      function cfg(b) { return prev && b < prev.until ? prev : { P: P, cyc: cyc, origin: origin }; }

      /* radial offset of sector k at beat b, 0 = home (assembled) */
      function offset(k, b) {
        var c = cfg(b), p = c.P[k], t = b - c.origin, local = U.mod(t, p), idx = Math.floor(t / p);
        var arrivalBeat = c.origin + idx * p, meet = U.mod(arrivalBeat - c.origin, c.cyc) === 0;
        var hold = meet ? .55 : .08, D = .38 + .07 * (p / 4);
        // the cycle before a meeting reaches a little further
        var nextMeet = U.mod(arrivalBeat + p - c.origin, c.cyc) === 0;
        if (nextMeet) D *= 1.18;
        var out;
        if (local < hold) out = 0;
        else {
          var u = (local - hold) / (p - hold), up = .32, fall = .34;
          if (u < up) out = U.outBack(u / up, 1.4);
          else if (u < 1 - fall) out = 1 + .05 * Math.sin((u - up) / (1 - up - fall) * Math.PI);
          else { var f = (u - (1 - fall)) / fall; out = (1 + .08 * U.smooth(f / .3) * (1 - U.smooth((f - .3) / .2))) * (1 - U.inCubic(U.sat((f - .2) / .8))); }
        }
        return { d: out * D * api.motion, squash: U.ring(local, 1.5, 5) * (meet ? 1.4 : 1), meet: meet, local: local };
      }

      function events(b0, b1) {
        var out = [];
        for (var beat = Math.ceil(b0); beat < b1; beat++) {
          var c = cfg(beat), t = beat - c.origin, inCyc = U.mod(t, c.cyc), cycleIx = Math.floor(t / c.cyc);
          var arrivals = [];
          c.P.forEach(function (p, k) { if (U.mod(t, p) === 0) arrivals.push(k); });
          if (arrivals.length === 3) out.push({ b: beat, type: 'meet', cycle: cycleIx });
          else arrivals.forEach(function (k) { out.push({ b: beat, type: 'land', k: k, n: Math.floor(t / c.P[k]), cycle: cycleIx }); });
          out.push({ b: beat, type: 'tick', inCyc: inCyc, cycle: cycleIx, accent: inCyc === c.cyc - 1 });
        }
        return out;
      }

      function sector(g, k, b) {
        var o = offset(k, b), a0 = -Math.PI / 2 + tilt + k * U.TAU / 3, mid = a0 + Math.PI / 3, rr = R * (1 - .035 * o.squash);
        var ox = Math.cos(mid) * o.d * R, oy = Math.sin(mid) * o.d * R, wob = Math.sin(o.local * 2.1 + k) * .08 * U.sat(o.d * 3);
        g.save(); g.translate(cx + ox, cy + oy); g.rotate(wob);
        var gap = .012;
        // printed misregistration shadow
        g.fillStyle = 'rgba(29,29,31,.12)'; g.beginPath(); g.moveTo(4 * unit, 5 * unit); g.arc(4 * unit, 5 * unit, rr, a0 + gap, a0 + U.TAU / 3 - gap); g.closePath(); g.fill();
        g.fillStyle = COLORS[k]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, rr, a0 + gap, a0 + U.TAU / 3 - gap); g.closePath(); g.fill();
        // a quiet inner arc: each sector's own rhythm drawn as a groove
        g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2 * unit;
        g.beginPath(); g.arc(0, 0, rr * (.62 + .12 * k), a0 + .12, a0 + U.TAU / 3 - .12); g.stroke();
        g.restore();
        return o;
      }

      return {
        layout: function (w, h, safe) {
          W = w; H = h;
          var bw = w - safe.l - safe.r, bh = h - safe.t - safe.b;
          cx = safe.l + bw / 2; cy = safe.t + bh / 2; R = Math.min(bw * .3, bh * .25); unit = U.clamp(R / 200, .45, 1.4);
        },
        seed: function (s) { seed = s; tilt = (U.rng(s)() - .5) * .9; },
        set: function (k, v) { if (k === 'periods') setPreset(v, api.nextBeat(1)); },
        events: events,
        onEvent: function (e) { if (e.type === 'meet') lastMeet = e.b; },
        draw: function (g, b) {
          g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
          var c = cfg(b), t = b - c.origin, inCyc = U.mod(t, c.cyc), cycleStart = b - inCyc, n = c.cyc;
          // beat ring: the score
          var RR = R * 1.62;
          for (var j = 0; j < n; j++) {
            var a = -Math.PI / 2 + tilt + j / n * U.TAU, x = cx + Math.cos(a) * RR, y = cy + Math.sin(a) * RR, passed = j <= inCyc, now = j === Math.floor(inCyc);
            g.fillStyle = passed ? INK : 'rgba(29,29,31,.18)';
            var r0 = (j === 0 ? 6.5 : 4) * unit * (now ? 1 + .5 * U.env(inCyc - j, .02, .25) : 1);
            g.beginPath(); g.arc(x, y, r0, 0, U.TAU); g.fill();
            var m = 0;
            c.P.forEach(function (p, k) {
              if (j % p) return;
              m++;
              var rr = RR + (10 + m * 12) * unit, xx = cx + Math.cos(a) * rr, yy = cy + Math.sin(a) * rr;
              g.save(); g.translate(xx, yy); g.rotate(a);
              g.fillStyle = COLORS[k]; g.globalAlpha = passed ? 1 : .35;
              g.fillRect(-5.5 * unit, -2.4 * unit, 11 * unit, 4.8 * unit);
              g.restore();
            });
          }
          g.globalAlpha = 1;
          // meeting wave
          var mt = b - lastMeet;
          if (mt >= 0 && mt < 3) {
            var e = U.outCubic(mt / 3);
            g.strokeStyle = 'rgba(29,29,31,' + (.5 * (1 - e)).toFixed(3) + ')'; g.lineWidth = 2.2 * unit;
            g.beginPath(); g.arc(cx, cy, R * (1.03 + e * .9), 0, U.TAU); g.stroke();
            g.strokeStyle = 'rgba(217,69,43,' + (.35 * (1 - e)).toFixed(3) + ')';
            g.beginPath(); g.arc(cx, cy, R * (1.03 + e * .55), 0, U.TAU); g.stroke();
          }
          var os = [0, 1, 2].map(function (k) { return sector(g, k, b); });
          var whole = os.every(function (o) { return o.d < .002; });
          g.fillStyle = INK; g.beginPath(); g.arc(cx, cy, (whole ? 7 : 4) * unit, 0, U.TAU); g.fill();
          if (whole) { g.strokeStyle = INK; g.lineWidth = 1.4 * unit; g.beginPath(); g.arc(cx, cy, R * 1.03, 0, U.TAU); g.stroke(); }
          // counter: small, typographic
          g.fillStyle = 'rgba(29,29,31,.55)'; g.font = (11 * Math.max(.85, unit)) + 'px "SF Mono", Menlo, monospace'; g.textAlign = 'center';
          g.fillText(String(Math.floor(inCyc) + 1).padStart(2, '0') + ' / ' + n, cx, cy + RR + 52 * unit);
          U.grain(g, W, H, .16);
        },
        audio: function (T, chain) {
          var bell = V.bell(T, chain.bus, { volume: -15, decay: 1.1, harm: 3.01, index: 3 });
          var wood = V.wood(T, chain.bus, { volume: -11, decay: .1 });
          var drum = V.drum(T, chain.dry, { volume: -9, octaves: 3, decay: .45 });
          var bass = V.bass(T, chain.dry, { volume: -15, cutoff: 500 });
          var chord = V.mallet(T, chain.bus, { volume: -11, harm: 3.99, index: 1.3, decay: 1.4 });
          var hat = V.noise(T, chain.dry, { volume: -30, cutoff: 7000, decay: .03 });
          var cym = V.noise(T, chain.bus, { volume: -27, cutoff: 5000, decay: .9, release: .6, color: 'white' });
          var MEL = [[76, 79], [72, 76], [77, 81], [74, 79]];
          return {
            list: [bell, wood, drum, bass, chord, hat, cym],
            play: function (e, t, spb) {
              var ch = CH[U.mod(e.cycle || 0, 4)];
              if (e.type === 'tick') hat.triggerAttackRelease(.03, t, e.accent ? .5 : .22);
              else if (e.type === 'meet') {
                chord.triggerAttackRelease(ch.map(function (n) { return U.mtof(n + 12); }), 1.2, t, .7);
                bass.triggerAttackRelease(U.mtof(ch[0] - 24), spb * 2, t, .8);
                drum.triggerAttackRelease(U.mtof(36), .4, t, .85);
                cym.triggerAttackRelease(.9, t, .35);
              } else if (e.type === 'land') {
                var c = cfg(e.b), p = c.P[e.k], role = c.P.indexOf(p);
                if (e.k === 0) bell.triggerAttackRelease(U.mtof(MEL[U.mod(e.cycle, 4)][e.n % 2]), .5, t, .45);
                else if (e.k === 1) wood.triggerAttackRelease(U.mtof(ch[1] + 12), .06, t, .6);
                else { drum.triggerAttackRelease(U.mtof(ch[0] - 24), .3, t, .55); }
              }
            }
          };
        }
      };
    }
  });
})();
