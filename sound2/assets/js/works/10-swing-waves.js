/* 10 走路也可以是一首歌 — A Walk Is a Song
 * Thick ribbons walk like inchworms: on the long (swung) eighth the tail
 * gathers and the body arches; on the short eighth the head reaches forward
 * and the body lays flat. The swing ratio that places the off-beat notes is
 * the same number that splits each step, so changing it changes both. An
 * 8-bar phrase: walk (4 bars) · stop · the leader turns to look back · the
 * others copy one by one · all turn forward · walk on. The camera follows the
 * group, so the walk never wraps at an edge. */
(function () {
  var U = Sound2.U, V = Sound2.V;
  var BG = '#f3e2d6', GROUND = '#3a3a35';
  var COLORS = ['#2f6f62', '#e07a3f', '#3f6fa0', '#7da26a', '#5a5f9a', '#c9a23a'];
  var PHR = 32;
  // F major: | F | D7 | Gm7 | C7 | F | F | Bb | C7 |
  var ROOTS = [41, 38, 43, 36, 41, 41, 46, 36];
  var CH = [[65, 69, 72, 76], [62, 66, 69, 72], [67, 70, 74, 77], [64, 67, 70, 72], [65, 69, 72, 76], [65, 69, 72, 76], [65, 70, 74, 77], [64, 67, 70, 72]];
  var WALK_BASS = [[0, 4, 7, 9], [0, 4, 7, 6], [0, 2, 3, 4], [0, 4, 7, 10]];

  Sound2.start({
    id: '10-swing-waves', bpm: 112, tempoMin: 84, tempoMax: 140,
    bg: BG, fg: '#2a2622', accent: '#e07a3f',
    alt: '淡蜜桃色地面上，幾條粗圓的色帶以一長一短的搖擺步伐前進：先拱起、再伸長。隊伍停下時，一條帶子回頭看，其他依序跟著回頭，再一起轉身繼續走。',
    lede: '長一點，短一點；<br>拱起來，再伸出去。<br>走路，也可以是一首歌。',
    about: '<p>幾條色帶像尺蠖一樣散步：長的那半拍把尾巴收過來、身體拱起；短的那半拍把頭伸出去、身體放平。一長一短，就是搖擺。</p><p>八小節為一段：先走四小節，停下來；領頭的那條回頭看了看，其他成員一個接一個模仿，最後一起轉回前方，繼續上路。改變搖擺比例，音符的長短與步伐的長短一起改變。</p>',
    how: '「搖擺」「步伐」「隊形」在「調整」裡。搖擺 50% 是直的八分音符，越往右越像爵士的搖擺。',
    params: [
      { key: 'swing', label: '搖擺', type: 'range', min: .5, max: .74, step: .01, value: .64, format: function (v) { return Math.round(v * 100) + '%'; } },
      { key: 'stride', label: '步伐', type: 'range', min: .6, max: 1.4, step: .01, value: 1, format: function (v) { return v < .85 ? '小步' : v > 1.15 ? '大步' : '散步'; } },
      { key: 'form', label: '隊形', type: 'select', value: 'file', options: [['file', '一列'], ['lanes', '並排'], ['loose', '鬆散']] }
    ],
    create: function (api) {
      var W = 0, H = 0, box, unit = 1, seed = 1, swing = .64, strideK = 1, form = 'file', walkers = [], leader = 0, step = 40, groundY = 0, melodies = [];

      function build() {
        if (!box) return;
        var r = U.rng(seed * 23 + 3), narrow = box.w < 520, n = narrow ? 3 : 5, cols = r.shuffle(COLORS);
        unit = narrow ? U.clamp(box.w / 640, .45, .8) : U.clamp(Math.min(box.w / 1250, box.h / 560), .5, 1.4);
        step = 80 * unit * strideK;
        groundY = box.y + box.h * (narrow ? .6 : .66);
        walkers = [];
        var spacing = box.w * (narrow ? .29 : .175);
        for (var i = 0; i < n; i++) {
          var lane = form === 'lanes' ? i % 2 : 0, len = (185 + r.range(-30, 45)) * unit;
          walkers.push({
            x: (form === 'loose' ? r.range(-.4, .4) * spacing : 0) + (n - 1 - i) * spacing * (form === 'lanes' ? .62 : 1) - (n - 1) * spacing * (form === 'lanes' ? .31 : .5),
            lane: lane, len: len, w: (form === 'lanes' && lane ? 28 : 34) * unit * r.range(.85, 1.1), color: cols[i], k: i
          });
        }
        leader = r.int(0, n - 1);
        melodies = []; for (var p = 0; p < 4; p++) melodies.push(makeMelody(U.rng(seed * 41 + p)));
      }
      function makeMelody(r) {
        // 2-bar swing phrases in bars 1–2 and 3–4: [beat, swungOffbeat?, chord tone idx, octave]
        var A = [[0, 1, 2], [1, 0, 1], [1, 1, 2], [2, 0, 3], [3, 1, 2], [4, 0, 1], [5, 1, 0]];
        var B = [[8, 0, 3], [8, 1, 2], [9, 1, 1], [10, 0, 0], [11, 1, 1], [12, 0, 2], [14, 0, 0]];
        var tweak = function (n) { return [n[0], r.chance(.25) ? 1 - n[1] : n[1], U.mod(n[2] + (r.chance(.3) ? r.pick([-1, 1]) : 0), 4)]; };
        return A.map(tweak).concat(B.map(tweak));
      }

      /* choreography state at beat b */
      function walking(inP) { return inP < 16 || inP >= 28; }
      function walkedBeats(b) {
        var p = Math.floor(b / PHR), inP = b - p * PHR;
        return p * 20 + Math.min(inP, 16) + Math.max(0, inP - 28);
      }
      function facing(i, b) {
        var p = Math.floor(b / PHR), inP = b - p * PHR, order = walkers.map(function (w, k) { return k; }).sort(function (a, c) { return Math.abs(a - leader) - Math.abs(c - leader); });
        var rank = order.indexOf(i), tOut = i === leader ? 20 : 23.5 + rank * .5, tBack = i === leader ? 26.5 : 26.75 + rank * .25;
        var out = U.smooth((inP - tOut) / .6), back = U.smooth((inP - tBack) / .6);
        var turn = out - back;
        var hop = Math.max(0, Math.sin(Math.PI * U.sat((inP - tOut) / .6)), Math.sin(Math.PI * U.sat((inP - tBack) / .6)));
        return { sx: Math.cos(Math.PI * turn), hop: hop };
      }

      /* tail/head positions (world x, relative) for one walker */
      function gait(w, b) {
        var n = Math.floor(b), ph = b - n, wb = walkedBeats(n), p = Math.floor(b / PHR), inP = b - p * PHR, moving = walking(inP);
        var gather = moving ? U.inOut(ph < swing ? ph / swing : 1) : 0, reach = moving ? (ph < swing ? 0 : U.inOut((ph - swing) / (1 - swing))) : 0;
        var tail = (wb + gather) * step, head = (wb + reach) * step + w.len * .82;
        return { tail: tail, head: head, gather: gather - reach, moving: moving };
      }

      function events(b0, b1) {
        var out = [];
        for (var n = Math.floor(b0) - 1; n <= Math.ceil(b1); n++) {
          var p = Math.floor(n / PHR), inP = n - p * PHR, bar = Math.floor(inP / 4), inBar = inP - bar * 4, stop = !walking(inP);
          var add = function (e) { if (e.b >= b0 && e.b < b1) out.push(e); };
          // walking bass on every beat; a held note while the group stands still
          if (!stop) add({ b: n, type: 'bass', bar: bar, k: inBar });
          else if (inBar === 0) add({ b: n, type: 'hold', bar: bar });
          // ride: 1, 2, 2a, 3, 4, 4a  (the "a" is the swung eighth)
          if (!stop || inBar % 2 === 1) {
            add({ b: n, type: 'ride', acc: inBar % 2 === 1 });
            if (inBar % 2 === 1) add({ b: n + swing, type: 'ride', acc: false, skip: true });
          }
          // the step itself: a soft brush on the reach (the short eighth)
          if (!stop) add({ b: n + swing, type: 'step' });
          var m = melodies[U.mod(p, melodies.length)];
          if (m) m.forEach(function (x) { if (x[0] === inP) add({ b: n + (x[1] ? swing : 0), type: 'mel', bar: bar, tone: x[2] }); });
        }
        // turns: one soft note per walker, in the order they copy the leader
        for (var p2 = Math.floor(b0 / PHR) - 1; p2 <= Math.floor(b1 / PHR); p2++) {
          walkers.forEach(function (w, i) {
            var order = walkers.map(function (x, k) { return k; }).sort(function (a, c) { return Math.abs(a - leader) - Math.abs(c - leader); }), rank = order.indexOf(i);
            var tOut = p2 * PHR + (i === leader ? 20 : 23.5 + rank * .5), tBack = p2 * PHR + (i === leader ? 26.5 : 26.75 + rank * .25);
            if (tOut >= b0 && tOut < b1) out.push({ b: tOut, type: 'turn', rank: rank, leader: i === leader });
            if (tBack >= b0 && tBack < b1) out.push({ b: tBack, type: 'back', rank: rank });
          });
        }
        return out;
      }

      function drawWalker(g, w, b, cam) {
        var gt = gait(w, b), f = facing(w.k, b), laneY = groundY - (w.lane ? 46 * unit : 0), scale = w.lane ? .84 : 1;
        var x0 = box.x + box.w * .5 + w.x - w.len * .41, xt = x0 + gt.tail - cam, xh = x0 + gt.head - cam, cx = (xt + xh) / 2;
        var d = xh - xt, L = w.len * scale, A = .5 * Math.sqrt(Math.max(0, L * L - d * d)) * 1.15 + 6 * unit;
        var breathe = gt.moving ? 0 : Math.sin(b * Math.PI * .5 + w.k) * 4 * unit * api.motion;
        A = A * api.motion + breathe + f.hop * 26 * unit;
        var skew = gt.gather > 0 ? .12 : -.12, n = 34, pts = [], ws = [];
        for (var i = 0; i <= n; i++) {
          var u = i / n, us = u + skew * Math.sin(Math.PI * u) * .5, x = U.lerp(xt, xh, us), y = laneY - A * Math.pow(Math.sin(Math.PI * u), 1.15) - f.hop * 10 * unit;
          x = cx + (x - cx) * f.sx;
          pts.push({ x: x, y: y }); ws.push(w.w * scale * (1 - .12 * Math.abs(u - .5)));
        }
        // contact shadow under the arch
        g.fillStyle = 'rgba(42,38,34,' + (w.lane ? .08 : .12) + ')'; g.beginPath(); g.ellipse(cx, laneY + 3, Math.abs(d) * .55 + 10, 5 * unit, 0, 0, U.TAU); g.fill();
        var col = w.lane ? U.rgb(U.mix(w.color, BG, .22)) : w.color;
        g.fillStyle = col; U.band(g, pts, ws, true);
        // a lighter band along the back, and a cap marking the head
        g.fillStyle = 'rgba(255,255,255,.18)'; U.band(g, pts.map(function (p, i) { return { x: p.x, y: p.y - ws[i] * .22 }; }), ws.map(function (x) { return x * .25; }), true);
        var head = pts[n], hn = pts[n - 3];
        g.fillStyle = U.rgb(U.mix(col, '#ffffff', .45)); g.beginPath(); g.arc(head.x + (head.x - hn.x) * .15, head.y - 2 * unit, ws[n] * .32, 0, U.TAU); g.fill();
      }

      return {
        layout: function (w, h, safe) { W = w; H = h; box = { x: 0, y: safe.t, w: w, h: h - safe.t - safe.b }; build(); },
        seed: function (s) { seed = s; build(); },
        set: function (k, v) { if (k === 'swing') swing = v; if (k === 'stride') { strideK = v; build(); } if (k === 'form') { form = v; build(); } },
        events: events,
        draw: function (g, b) {
          g.fillStyle = BG; g.fillRect(0, 0, W, H);
          // camera follows the group linearly so steps read against it
          var cam = walkedBeats(Math.floor(b)) * step + (walking(U.mod(b, PHR)) ? (b - Math.floor(b)) * step : 0);
          // horizon & ground marks scroll past: no edge wrap
          g.fillStyle = 'rgba(224,122,63,.16)'; g.beginPath(); g.arc(W * .7, groundY, Math.min(W, H) * .24, Math.PI, 0); g.closePath(); g.fill();
          g.fillStyle = 'rgba(224,122,63,.09)'; g.fillRect(0, groundY, W, H - groundY);
          g.strokeStyle = GROUND; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, groundY + .5); g.lineTo(W, groundY + .5); g.stroke();
          var gap = 46 * unit, first = Math.floor((cam - W) / gap);
          for (var k = first; k < first + W / gap * 2 + 4; k++) {
            var x = k * gap - cam + W * .5; if (x < -20 || x > W + 20) continue;
            var hsh = U.at(seed, k, 9), len = (hsh < .2 ? 22 : 8) * unit;
            g.fillStyle = 'rgba(58,58,53,' + (hsh < .2 ? .45 : .22) + ')'; g.fillRect(x, groundY + 12 * unit + (hsh * 18) * unit, len, 1.6);
          }
          if (form === 'lanes') { g.strokeStyle = 'rgba(58,58,53,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, groundY - 46 * unit + .5); g.lineTo(W, groundY - 46 * unit + .5); g.stroke(); }
          walkers.filter(function (w) { return w.lane; }).forEach(function (w) { drawWalker(g, w, b, cam); });
          walkers.filter(function (w) { return !w.lane; }).forEach(function (w) { drawWalker(g, w, b, cam); });
          // bar counter: eight small marks, filled as the phrase goes by
          var inP = U.mod(b, PHR);
          for (var m = 0; m < 8; m++) { g.fillStyle = m <= inP / 4 ? 'rgba(42,38,34,.55)' : 'rgba(42,38,34,.15)'; g.fillRect(W / 2 - 70 * unit + m * 20 * unit, groundY + 54 * unit, (m === 4 ? 4 : 10) * unit, 3 * unit); }
          U.grain(g, W, H, .16);
        },
        audio: function (T, chain) {
          var bass = V.pluck(T, chain.dry, { wave: 'triangle', volume: -8, decay: .5, sustain: .15, release: .3, cutoff: 900, poly: 3 });
          var vib = V.bell(T, chain.bus, { harm: 4, index: 1.1, decay: 1.1, volume: -14 });
          var ride = V.noise(T, chain.dry, { volume: -30, cutoff: 7500, decay: .11, color: 'white' });
          var brush = V.noise(T, chain.dry, { volume: -33, cutoff: 2600, type: 'bandpass', decay: .09, attack: .01 });
          var chime = V.pluck(T, chain.bus, { volume: -15, decay: .25, cutoff: 4200 });
          return {
            list: [bass, vib, ride, brush, chime],
            play: function (e, t, spb) {
              if (e.type === 'bass') { var pat = WALK_BASS[U.mod(e.bar, 4)]; bass.triggerAttackRelease(U.mtof(ROOTS[e.bar] + pat[e.k] - 12 + 12), spb * .8, t, .8); }
              else if (e.type === 'hold') bass.triggerAttackRelease(U.mtof(ROOTS[e.bar]), spb * 3.6, t, .6);
              else if (e.type === 'ride') ride.triggerAttackRelease(.08, t, e.acc ? .55 : .35);
              else if (e.type === 'step') brush.triggerAttackRelease(.08, t, .4);
              else if (e.type === 'mel') vib.triggerAttackRelease(U.mtof(CH[e.bar][e.tone] + 12), .6, t, .55);
              else if (e.type === 'turn') chime.triggerAttackRelease(U.mtof(72 + [0, 4, 7, 9, 12][e.rank % 5]), .2, t, e.leader ? .7 : .5);
              else if (e.type === 'back') chime.triggerAttackRelease(U.mtof(84 - [0, 3, 5, 7, 10][e.rank % 5]), .15, t, .4);
            }
          };
        }
      };
    }
  });
})();
