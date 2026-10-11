/* 02 今天的浪剛剛好 — The Wave Is Just Right
 * Four geometric riders on wide printed waves. The swell's period is one bar;
 * a 16-bar phrase moves through glide → build → relay jumps → glide with one
 * surprise → bigger build → staggered take-off with a shared landing on the
 * next downbeat. Pose comes from the surface slope; air time from the score. */
(function () {
  var U = Sound2.U, V = Sound2.V;
  var SKY = '#f1e6d2', SUN = '#f3c48d', FOAM = '#fbf3e3';
  var WAVES = ['#b7d6cb', '#4b9790', '#1d5a62'];
  var RIDERS = [
    { kind: 'disc', color: '#e5533d', size: 1.0, note: 53 },
    { kind: 'square', color: '#f0b43c', size: .95, note: 60 },
    { kind: 'tri', color: '#232b3a', size: 1.05, note: 65 },
    { kind: 'dot', color: '#ef9c94', size: .55, note: 72 }
  ];
  var ROOTS = [41, 38, 34, 36]; // F Dm Bb C
  var CHORDS = [[65, 69, 72], [62, 65, 69], [62, 65, 70], [64, 67, 72]];
  var PHRASE = 64;

  Sound2.start({
    id: '02-color-surfers', bpm: 92, tempoMin: 70, tempoMax: 124,
    bg: SKY, fg: '#1f2b2c', accent: '#e5533d',
    alt: '圓、方塊、三角與小圓點乘著三層套色浪面滑行、蓄勢、依序騰空，最後在同一拍一起落地。',
    lede: '浪的週期是一小節。<br>滑行、蓄勢、輪流起跳，<br>最後一起落在同一拍上。',
    about: '<p>四個幾何形體各有脾氣：圓會滾、方塊穩穩地壓縮、三角喜歡翻身、小圓點總是跳得最輕。它們依浪面的坡度調整姿態，浪越高，就越想飛。</p><p>十六小節為一段：先滑行，再蓄勢，接著一個接一個騰空；中段只留一次驚喜；結尾大家分別起跳，卻在同一個下拍一起落地。</p>',
    how: '點一下畫面，離指尖最近的形體會在下一個半拍跳一下（每拍最多一次）。「浪高」與「隊形」在「調整」裡。',
    params: [
      { key: 'height', label: '浪高', type: 'range', min: .5, max: 1.4, step: .01, value: 1, format: function (v) { return Math.round(v * 100) + '%'; } },
      { key: 'formation', label: '衝浪隊形', type: 'select', value: 'lead', options: [['lead', '領頭'], ['line', '一字'], ['pairs', '兩兩']] }
    ],
    create: function (api) {
      var ah = 500, W = 0, H = 0, box, unit = 1, seed = 1, form = 'lead', heightK = 1, lam = 800, base = 600, phi = 0, xs = [], userJumps = [[], [], [], []], lastLand = [-99, -99, -99, -99];
      var jumps = []; // per phrase template: {i, at, air, big}

      function amp(b) {
        var p = U.mod(b, PHRASE), A;
        if (p < 6) A = U.lerp(1.25, .55, U.smooth(p / 6));
        else if (p < 16) A = .55;
        else if (p < 24) A = U.lerp(.55, 1, U.smooth((p - 16) / 8));
        else if (p < 32) A = 1;
        else if (p < 36) A = U.lerp(1, .6, U.smooth((p - 32) / 4));
        else if (p < 48) A = .6 + .12 * U.gauss(p - 42, 1.5);
        else if (p < 60) A = U.lerp(.6, 1.18, U.smooth((p - 48) / 12));
        else A = U.lerp(1.18, 1.25, (p - 60) / 4);
        return A * heightK * (.6 + .4 * api.motion);
      }
      function surf(x, b, layer) {
        var k = U.TAU / (lam * (layer === 2 ? 1 : layer === 1 ? .82 : .64)), th = k * x + U.TAU * b / 4 + phi + layer * 1.3;
        var A = amp(b - layer * .5) * ah * (layer === 2 ? .2 : layer === 1 ? .13 : .08);
        var c = Math.pow((1 + Math.sin(th)) / 2, 1.7);
        var y0 = base - (2 - layer) * ah * .13;
        return y0 - A * c - A * .07 * Math.sin(2.7 * k * x - U.TAU * b / 8 + layer);
      }
      function crestAt(x, b) { var k = U.TAU / lam, th = k * x + U.TAU * b / 4 + phi + 2.6; return Math.pow((1 + Math.sin(th)) / 2, 1.7); }
      function slope(x, b) { var e = 2; return Math.atan2(surf(x + e, b, 2) - surf(x - e, b, 2), 2 * e); }

      function build() {
        if (!box) return;
        var r = U.rng(seed * 17 + 3), portrait = box.h > box.w;
        lam = box.w * (portrait ? 1.25 : .78) * r.range(.92, 1.08);
        ah = Math.min(box.h, box.w * .95);
        base = box.y + box.h * (portrait ? .8 : .8);
        phi = r.range(0, U.TAU);
        unit = U.clamp(Math.min(box.w, box.h * 1.25) / 900, .45, 1.4);
        var sp = box.w;
        var slots = form === 'line' ? [.17, .39, .61, .83] : form === 'pairs' ? [.2, .32, .64, .76] : [.68, .44, .3, .16];
        var order = form === 'lead' ? [0, 1, 2, 3] : r.shuffle([0, 1, 2, 3]);
        xs = [];
        order.forEach(function (ri, k) { xs[ri] = box.x + sp * (slots[k] + r.range(-.02, .02)); });
        // phrase template: relay in bars 7–8, one surprise in bar 11, staggered take-off for the shared landing
        var byX = [0, 1, 2, 3].sort(function (a, b) { return xs[b] - xs[a]; });
        jumps = [];
        byX.forEach(function (i, n) { jumps.push({ i: i, at: 24 + n * 1.5, air: 1 + (RIDERS[i].kind === 'dot' ? .25 : 0), h: .55 + (RIDERS[i].kind === 'tri' ? .15 : 0) }); });
        var sur = r.int(0, 3); jumps.push({ i: sur, at: 41 + r.pick([0, .5, 1.5]), air: 1.5, h: .8, surprise: true });
        byX.forEach(function (i, n) { var at = 60.5 + n * .5; jumps.push({ i: i, at: at, air: PHRASE - at, h: .9 + .1 * (3 - n), final: true }); });
      }

      function jumpAt(i, b) {
        var ph = Math.floor(b / PHRASE), list = [];
        for (var d = -1; d <= 0; d++) jumps.forEach(function (j) { if (j.i === i) list.push({ at: j.at + (ph + d) * PHRASE, air: j.air, h: j.h, final: j.final }); });
        userJumps[i].forEach(function (j) { list.push(j); });
        for (var k = 0; k < list.length; k++) { var j = list[k]; if (b >= j.at - .3 && b < j.at + j.air) return j; }
        return null;
      }

      function events(b0, b1) {
        var out = [];
        for (var ph = Math.floor(b0 / PHRASE) - 1; ph <= Math.floor(b1 / PHRASE); ph++) {
          jumps.forEach(function (j) {
            var at = ph * PHRASE + j.at, land = at + j.air;
            if (at >= b0 && at < b1) out.push({ b: at, type: 'jump', i: j.i, final: j.final, surprise: j.surprise });
            if (land >= b0 && land < b1 && !j.final) out.push({ b: land, type: 'land', i: j.i });
          });
          var fl = (ph + 1) * PHRASE; if (fl >= b0 && fl < b1) out.push({ b: fl, type: 'together' });
        }
        api.userEvents(b0, b1, out);
        for (var beat = Math.ceil(b0 * 2) / 2; beat < b1; beat += .5) {
          var p = U.mod(beat, PHRASE), bar = Math.floor(p / 4), inBar = p - bar * 4;
          if (inBar === 0) out.push({ b: beat, type: 'swell', bar: bar });
          var building = (p >= 16 && p < 24) || (p >= 48 && p < 60);
          if (building && beat % .5 === 0) out.push({ b: beat, type: 'pulse', p: p });
          if (!building && (bar < 4 || (bar >= 9 && bar < 12)) && (inBar === 0 || inBar === 2.5)) out.push({ b: beat, type: 'glide', bar: bar, off: inBar });
        }
        return out;
      }

      function drawRider(g, i, b) {
        var R = RIDERS[i], s = R.size * 70 * unit, x = xs[i], j = jumpAt(i, b), motion = api.motion;
        x += Math.cos(U.TAU * b / 4 + i) * 14 * unit * motion;
        var yS = surf(x, b, 2), ang = slope(x, b), y, sx = 1, sy = 1, spin = 0, lift = 0;
        if (j && b >= j.at) {
          var u = (b - j.at) / j.air, yA = surf(x, j.at, 2), yB = surf(x, j.at + j.air, 2);
          var hh = ah * .17 * j.h * Math.min(1.4, .6 + j.air * .4) * motion;
          y = U.lerp(yA, yB, u) - hh * 4 * u * (1 - u);
          ang = U.lerp(slope(x, j.at), slope(x, j.at + j.air), U.smooth(u)) - Math.sin(Math.PI * u) * .25;
          if (R.kind === 'tri') spin = U.TAU * U.inOut(u) * (j.air > 1.4 ? 1 : .5) * (j.final ? 1 : 1);
          if (R.kind === 'square') spin = Math.PI / 2 * U.inOut(u) * (j.final ? 1 : 0);
          sx = 1 - .08 * Math.sin(Math.PI * u); sy = 1 + .12 * Math.sin(Math.PI * u);
          lift = 1;
        } else {
          y = yS;
          if (j && b < j.at) { var c = U.smooth((b - (j.at - .3)) / .3); sx = 1 + .18 * c; sy = 1 - .2 * c; }
          var lt = b - lastLand[i]; if (lt >= 0 && lt < 2) { var q = U.ring(lt, 2.2, 4) * .9 * motion; sx += q * .22; sy -= q * .25; }
        }
        var size = s;
        var shadowOff = 4 * unit;
        g.save(); g.translate(x, y); g.rotate(ang + spin);
        // contact shadow on the water while airborne
        g.scale(sx, sy);
        var roll = R.kind === 'disc' || R.kind === 'dot' ? -(x + lam * b / 4) / (size * .5) : 0;
        shape(g, R, size, roll, shadowOff);
        g.restore();
        if (lift) { var d = Math.max(0, yS - y); g.fillStyle = 'rgba(15,48,52,' + (0.18 * Math.max(0, 1 - d / (box.h * .3))).toFixed(3) + ')'; g.beginPath(); g.ellipse(x, yS + 3, size * .55 * (1 - d / (box.h * .8)), 4 * unit, slope(x, b), 0, U.TAU); g.fill(); }
      }
      function shape(g, R, s, roll, off) {
        var dark = U.rgb(U.mix(R.color, '#1b2224', .35));
        if (R.kind === 'disc' || R.kind === 'dot') {
          var r = s * .5;
          g.translate(0, -r);
          g.fillStyle = dark; g.beginPath(); g.arc(off * .6, off * .6, r, 0, U.TAU); g.fill();
          g.fillStyle = R.color; g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill();
          g.save(); g.rotate(roll); g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.clip();
          g.fillStyle = U.rgb(U.mix(R.color, '#ffffff', .32)); g.fillRect(-r, -r * .22, r * 2, r * .44);
          if (R.kind === 'disc') { g.fillStyle = dark; g.beginPath(); g.arc(r * .48, 0, r * .12, 0, U.TAU); g.fill(); }
          g.restore();
        } else if (R.kind === 'square') {
          var h = s * .92;
          g.translate(0, -h / 2);
          g.fillStyle = dark; rr(g, -h / 2 + off * .6, -h / 2 + off * .6, h, h, h * .08); g.fill();
          g.fillStyle = R.color; rr(g, -h / 2, -h / 2, h, h, h * .08); g.fill();
          g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = Math.max(1, s * .035); rr(g, -h * .3, -h * .3, h * .6, h * .6, h * .04); g.stroke();
        } else {
          var t = s * 1.1, hh = t * .87;
          g.translate(0, -hh / 3);
          var tri = function (dx, dy, k) { g.beginPath(); g.moveTo(dx, dy - hh * 2 / 3 * k); g.lineTo(dx + t / 2 * k, dy + hh / 3 * k); g.lineTo(dx - t / 2 * k, dy + hh / 3 * k); g.closePath(); };
          g.fillStyle = '#0d1117'; tri(off * .6, off * .6, 1); g.fill();
          g.fillStyle = R.color; tri(0, 0, 1); g.fill();
          g.fillStyle = '#f0b43c'; tri(0, hh * .08, .26); g.fill();
        }
      }
      function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

      return {
        layout: function (w, h, safe) { W = w; H = h; box = { x: 0, y: safe.t, w: w, h: h - safe.t - safe.b * .35 }; build(); },
        seed: function (s) { seed = s; build(); },
        set: function (k, v) { if (k === 'height') heightK = v; if (k === 'formation') { form = v; build(); } },
        events: events,
        onEvent: function (e) {
          if (e.type === 'land') lastLand[e.i] = e.b;
          if (e.type === 'together') for (var i = 0; i < 4; i++) lastLand[i] = e.b;
          if (e.type === 'uland') lastLand[e.i] = e.b;
        },
        down: function (x) {
          var best = 0, bd = 1e9; xs.forEach(function (xx, i) { var d = Math.abs(xx - x); if (d < bd) { bd = d; best = i; } });
          var at = api.nextBeat(.5), list = userJumps[best];
          if (list.length && list[list.length - 1].at + list[list.length - 1].air > at - .5) { api.toast('它還在空中，等落地再請它跳。'); return; }
          if (jumpAt(best, at) || jumpAt(best, at + 1)) { api.toast('這一拍它已經有安排了。'); return; }
          list.push({ at: at, air: 1, h: .5 }); if (list.length > 6) list.shift();
          api.add({ b: at, type: 'ujump', i: best }); api.add({ b: at + 1, type: 'uland', i: best });
        },
        draw: function (g, b) {
          g.fillStyle = SKY; g.fillRect(0, 0, W, H);
          // sun: a large, quiet disc low in the sky
          var sr = Math.min(W, H) * .2;
          g.fillStyle = SUN; g.beginPath(); g.arc(box.x + box.w * .78, box.y + box.h * .34, sr, 0, U.TAU); g.fill();
          g.fillStyle = 'rgba(241,230,210,.55)'; for (var k = 0; k < 4; k++) g.fillRect(box.x + box.w * .78 - sr, box.y + box.h * .34 + sr * (.15 + k * .22), sr * 2, sr * .06 * (k + 1));
          var step = Math.max(4, Math.round(W / 220));
          for (var L = 0; L < 3; L++) {
            g.fillStyle = WAVES[L]; g.beginPath(); g.moveTo(0, H);
            for (var x = -step; x <= W + step; x += step) g.lineTo(x, surf(x, b, L));
            g.lineTo(W + step, H); g.closePath(); g.fill();
            if (L === 2) {
              // foam rides the crests only
              g.strokeStyle = FOAM; g.lineCap = 'round';
              for (var x2 = 0; x2 <= W; x2 += step) {
                var y1 = surf(x2, b, 2), y2 = surf(x2 + step, b, 2), crest = U.smooth((crestAt(x2, b) - .62) / .3) * U.sat(amp(b) / .7);
                if (crest < .05) continue;
                g.lineWidth = 2 + 4 * crest * unit; g.globalAlpha = crest;
                g.beginPath(); g.moveTo(x2, y1 + 3 * unit); g.lineTo(x2 + step, y2 + 3 * unit); g.stroke();
              }
              g.globalAlpha = 1;
            }
          }
          var order = [0, 1, 2, 3].sort(function (a, c) { return RIDERS[c].size - RIDERS[a].size; });
          order.forEach(function (i) { drawRider(g, i, b); });
          U.grain(g, W, H, .2);
        },
        audio: function (T, chain) {
          var bass = V.bass(T, chain.dry, { wave: 'sine', volume: -10, cutoff: 360, sustain: .5, release: 1.2 });
          var pad = V.soft(T, chain.bus, { volume: -24, attack: .6, release: 2.4, cutoff: 1300 });
          var mallet = V.mallet(T, chain.bus, { harm: 3.99, index: 1.4, decay: .8, volume: -8 });
          var pluck = V.pluck(T, chain.bus, { decay: .12, volume: -19, cutoff: 2800 });
          var drum = V.drum(T, chain.dry, { volume: -15, decay: .4 });
          var wood = V.wood(T, chain.bus, { volume: -20 });
          var bell = V.bell(T, chain.bus, { volume: -19 });
          return {
            list: [bass, pad, mallet, pluck, drum, wood, bell],
            play: function (e, t, spb) {
              if (e.type === 'swell') {
                var c = U.mod(e.bar, 4);
                bass.triggerAttackRelease(U.mtof(ROOTS[c]), spb * 3.6, t, .75);
                if (e.bar < 4 || (e.bar >= 8 && e.bar < 12)) pad.triggerAttackRelease(CHORDS[c].map(U.mtof), spb * 3.4, t, .5);
              } else if (e.type === 'pulse') {
                var ch = CHORDS[U.mod(Math.floor(e.p / 4), 4)], n = Math.floor(U.mod(e.p * 2, 8));
                pluck.triggerAttackRelease(U.mtof(ch[n % 3] + (n > 3 ? 12 : 0)), .1, t, .25 + .3 * U.sat((e.p % 16) / 12));
              } else if (e.type === 'glide') {
                if (e.off === 2.5) bell.triggerAttackRelease(U.mtof(CHORDS[U.mod(e.bar, 4)][2] + 12), 1.2, t, .18);
              } else if (e.type === 'jump' || e.type === 'ujump') {
                var R = RIDERS[e.i];
                mallet.triggerAttackRelease(U.mtof(R.note + (e.final ? 12 : 0)), .4, t, e.final ? .8 : e.type === 'ujump' ? .5 : .65);
                if (e.surprise) bell.triggerAttackRelease(U.mtof(R.note + 19), 1, t, .3);
              } else if (e.type === 'land' || e.type === 'uland') {
                wood.triggerAttackRelease(U.mtof(R0(e.i)), .05, t, .5);
              } else if (e.type === 'together') {
                drum.triggerAttackRelease(U.mtof(29), .4, t, .8);
                mallet.triggerAttackRelease([65, 69, 72, 77].map(U.mtof), .9, t, .6);
              }
            }
          };
          function R0(i) { return RIDERS[i].note + 7; }
        }
      };
    }
  });
})();
