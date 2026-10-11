/* 03 聲音有彈性 — Sound Has Give
 * Four thick rubber bands pinned between brass pegs. Each band is a damped
 * string (transverse wave equation, fixed 1/240 s substeps) with its own
 * speed, weight and damping. Notes become gestures, not volume multipliers:
 * staccato = a local kick plus a local tightening; long note = the whole band
 * eases into an arc for the note's length; accent = a large pull released on
 * the beat. Rests let the bands settle. Drag is clamped and always returns. */
(function () {
  var U = Sound2.U, V = Sound2.V;
  var BG = '#2a1f2d';
  // A minor pentatonic
  var MEMBERS = [
    { name: 'bass', color: '#f07b62', w: 36, travel: .95, damp: 1.5, notes: [45, 48, 50, 52, 43] },
    { name: 'mid', color: '#7fd1b0', w: 24, travel: .6, damp: 2.4, notes: [57, 60, 62, 64, 67] },
    { name: 'tenor', color: '#f4c84a', w: 17, travel: .45, damp: 2.1, notes: [64, 67, 69, 72, 74] },
    { name: 'high', color: '#b9a4f0', w: 11, travel: .3, damp: 3.2, notes: [76, 79, 81, 84, 86] }
  ];
  var N = 40, PHR = 32;

  Sound2.start({
    id: '03-elastic-ensemble', bpm: 96, tempoMin: 72, tempoMax: 126, dark: true,
    bg: BG, fg: '#f3e9e4', accent: '#f4c84a', panel: 'rgba(42,31,45,.72)', wet: .26,
    alt: '深紫色底上，四條厚實的橡皮帶釘在黃銅釘之間。短音讓局部收緊彈起，長音讓整條帶展開成弧，重音把它們一起拉開後先後回彈。',
    lede: '短音收緊一小段，<br>長音讓整條展開，<br>重音拉開——然後，各自彈回來。',
    about: '<p>四條橡皮帶各有重量：最粗的珊瑚色帶慢而沉，最細的薰衣草色帶又快又緊。聲音沿著帶子傳遞、在釘子處反射，再慢慢安定下來。</p><p>斷奏、延音與休止都能看見：斷奏是局部的一彈，延音是整條帶子撐開的弧，休止是讓它們回到安靜的直線。八小節的結尾，所有成員被同一個重音拉開，依各自的重量先後回彈。</p>',
    how: '按住任何一條帶子拖曳、放手，它會發出與拉伸程度相稱的聲音（拉伸有上限，放手一定回彈安定）。「彈性」與「拉伸」在「調整」裡。',
    params: [
      { key: 'elastic', label: '彈性', type: 'range', min: .5, max: 1.6, step: .01, value: 1, format: function (v) { return v < .8 ? '軟' : v > 1.25 ? '彈' : '適中'; } },
      { key: 'stretch', label: '拉伸程度', type: 'range', min: .4, max: 1.5, step: .01, value: 1, format: function (v) { return Math.round(v * 100) + '%'; } }
    ],
    create: function (api) {
      var W = 0, H = 0, box, unit = 1, seed = 1, elastic = 1, stretchK = 1, bands = [], plan = [], forces = [], grab = null, voices = null, lastBeat = null;

      function build() {
        if (!box) return;
        var r = U.rng(seed * 13 + 5), portrait = box.h > box.w * 1.05;
        unit = U.clamp(Math.min(box.w, box.h) / 640, .5, 1.4);
        var order = [0, 1, 2, 3];
        bands = order.map(function (k, i) {
          var m = MEMBERS[k], y = box.y + box.h * (.14 + .72 * i / 3) + r.range(-.04, .04) * box.h;
          var span = portrait ? r.range(.78, .92) : r.range(.55, .8), cx = box.x + box.w * (portrait ? .5 : r.range(.38, .62));
          var tilt = (portrait ? r.range(-.12, .12) : r.range(-.2, .2)) * box.h * (i % 2 ? 1 : -1);
          var A = { x: cx - box.w * span / 2, y: y - tilt / 2 }, B = { x: cx + box.w * span / 2, y: y + tilt / 2 };
          var L = Math.hypot(B.x - A.x, B.y - A.y), tx = (B.x - A.x) / L, ty = (B.y - A.y) / L;
          return { m: m, k: k, A: A, B: B, L: L, nx: -ty, ny: tx, y: new Float32Array(N), v: new Float32Array(N), pinch: new Float32Array(N), swell: 0, energy: 0, w: m.w * unit };
        });
        // phrase plan: which motif variants each member plays this phrase
        plan = [];
        for (var p = 0; p < 4; p++) plan.push({ bassV: r.int(0, 2), midV: r.int(0, 2), hiV: r.int(0, 1), tenV: r.int(0, 1), deg: r.int(0, 4) });
        forces = [];
      }

      /* Score: a 8-bar phrase (32 beats). */
      var BASS_V = [[[0, 3, 0], [8, 3, 2], [16, 3.5, 1], [24, 2, 4]], [[0, 2, 0], [6, 1.5, 3], [16, 3, 1], [20, 2, 2]], [[0, 3.5, 0], [12, 2, 2], [16, 3, 4], [22, 1.5, 3]]];
      var MID_V = [[4, 4.5, 5, 6, 6.5, 12, 13, 13.5, 20, 20.5, 21.5], [4.5, 5, 5.5, 12.5, 13, 14, 20, 21, 21.5, 22], [5, 5.5, 6.5, 13, 13.5, 20.5, 21, 21.5]];
      var TEN_V = [[[2.5, .5], [10, 2], [14.5, .5], [18, 2], [26.5, .5]], [[3, 1], [9.5, .5], [11, 1.5], [18.5, 2.5], [27, .5]]];
      var HI_V = [[7, 7.25, 7.5, 15, 15.25, 15.5, 15.75, 23.5, 23.75], [7.25, 7.5, 7.75, 14.5, 15, 23, 23.25, 23.5]];

      function events(b0, b1) {
        var out = [];
        for (var ph = Math.floor(b0 / PHR); ph <= Math.floor(b1 / PHR); ph++) {
          var base = ph * PHR, pl = plan[U.mod(ph, 4)] || plan[0];
          if (!pl) return out;
          var add = function (o) { o.b += base; if (o.b >= b0 && o.b < b1) out.push(o); };
          BASS_V[pl.bassV].forEach(function (n, i) { add({ b: n[0], type: 'long', band: 0, dur: n[1], deg: (n[2] + pl.deg) % 5, vel: .7 }); });
          MID_V[pl.midV].forEach(function (t, i) { add({ b: t, type: 'short', band: 1, pos: .2 + .6 * ((i * 37) % 10) / 10, deg: (i * 2 + pl.deg) % 5, vel: .45 + .25 * ((i + 1) % 2) }); });
          TEN_V[pl.tenV].forEach(function (n, i) { add({ b: n[0], type: n[1] >= 1.5 ? 'long' : 'short', band: 2, dur: n[1], pos: .3 + .4 * (i % 2), deg: (i + pl.deg + 2) % 5, vel: .55 }); });
          HI_V[pl.hiV].forEach(function (t, i) { add({ b: t, type: 'short', band: 3, pos: .15 + .7 * (i % 4) / 3, deg: (i + pl.deg) % 5, vel: .4 + .15 * (i % 3) }); });
          // the accent: a pull that builds through the last beat of bar 7, released on bar 8
          add({ b: 27.5, type: 'pull', band: -1, dur: .5, vel: 1 });
          add({ b: 28, type: 'accent', band: -1, vel: 1 });
        }
        api.userEvents(b0, b1, out);
        return out;
      }

      function nearest(x, y) {
        var best = null, bd = 1e9;
        bands.forEach(function (bd0, bi) {
          for (var i = 1; i < N - 1; i++) {
            var s = i / (N - 1), px = U.lerp(bd0.A.x, bd0.B.x, s) + bd0.nx * bd0.y[i], py = U.lerp(bd0.A.y, bd0.B.y, s) + bd0.ny * bd0.y[i], d = Math.hypot(px - x, py - y) - bd0.w / 2;
            if (d < bd) { bd = d; best = { band: bi, i: i }; }
          }
        });
        return bd < 28 * unit ? best : null;
      }

      function step(dt, b0, b1) {
        var sub = Math.max(1, Math.ceil(dt * 240)), h = dt / sub;
        for (var s = 0; s < sub; s++) {
          var beat = U.lerp(b0, b1, (s + 1) / sub);
          bands.forEach(function (bd, bi) {
            var c = bd.L / bd.m.travel * Math.sqrt(elastic), dx = bd.L / (N - 1), c2 = c * c / (dx * dx), damp = bd.m.damp / Math.sqrt(elastic), y = bd.y, v = bd.v;
            var maxY = Math.min(W, H) * .22 * stretchK;
            // target-shape forces from long notes / pull / drag
            var tgt = 0, swell = 0;
            forces.forEach(function (f) {
              if (f.band !== bi && f.band !== -1) return;
              var t = beat - f.b;
              if (f.kind === 'long' && t >= 0 && t < f.dur + 1.2) { var e = U.smooth(t / .35) * (t < f.dur ? 1 : Math.exp(-(t - f.dur) * 5)); tgt += e; swell = Math.max(swell, e); }
            });
            var pull = 0;
            forces.forEach(function (f) { if (f.kind === 'pull' && beat >= f.b && beat < f.b + f.dur) pull = Math.max(pull, U.inCubic((beat - f.b) / f.dur)); });
            bd.swell = swell;
            var dir = bi % 2 ? -1 : 1, lift = maxY * .38 * stretchK * api.motion * dir, pullA = maxY * .8 * stretchK * api.motion * -dir;
            for (var i = 1; i < N - 1; i++) {
              var u = i / (N - 1), a = c2 * (y[i - 1] - 2 * y[i] + y[i + 1]) - damp * v[i];
              if (tgt > 0) a += 60 * (lift * tgt * Math.sin(Math.PI * u) - y[i]) * tgt;
              if (pull > 0) a += 140 * (pullA * pull * U.gauss(u - .5, .22) - y[i]) * pull;
              if (grab && grab.band === bi) { var wgt = U.gauss((i - grab.i) / (N - 1), .09); a += 260 * (grab.target * wgt - y[i]) * wgt - 14 * v[i] * wgt; }
              v[i] += a * h;
            }
            var e = 0;
            for (var j = 1; j < N - 1; j++) {
              v[j] = U.clamp(v[j], -4000, 4000);
              y[j] = U.clamp(y[j] + v[j] * h, -maxY * 1.4, maxY * 1.4);
              e += Math.abs(v[j]);
              bd.pinch[j] *= Math.exp(-h * 7);
            }
            bd.energy = e / N;
          });
        }
        forces = forces.filter(function (f) { return b1 - f.b < (f.dur || 0) + 3; });
      }

      function drawBand(g, bd) {
        var pts = [], ws = [], tw = bd.w * (1 + .16 * bd.swell);
        for (var i = 0; i < N; i++) {
          var s = i / (N - 1);
          pts.push({ x: U.lerp(bd.A.x, bd.B.x, s) + bd.nx * bd.y[i], y: U.lerp(bd.A.y, bd.B.y, s) + bd.ny * bd.y[i] });
        }
        var rest = bd.L / (N - 1);
        for (var k = 0; k < N; k++) {
          var a = pts[Math.max(k - 1, 0)], c = pts[Math.min(k + 1, N - 1)], seg = Math.hypot(c.x - a.x, c.y - a.y) / (k === 0 || k === N - 1 ? 1 : 2);
          var stretch = Math.max(.6, seg / rest);
          ws.push(tw * (1 - .5 * bd.pinch[k]) / Math.sqrt(stretch) * (k === 0 || k === N - 1 ? .9 : 1));
        }
        var smooth = U.spline(pts, 3), sw = U.spline(ws.map(function (w) { return { x: w, y: 0 }; }), 3).map(function (p) { return p.x; });
        // soft cast shadow
        g.save(); g.translate(0, 9 * unit); g.fillStyle = 'rgba(8,4,10,.32)'; U.band(g, smooth, sw.map(function (w) { return w * 1.05; }), true); g.restore();
        var dark = U.rgb(U.mix(bd.m.color, '#1a0f1c', .38)), light = U.rgb(U.mix(bd.m.color, '#ffffff', .45));
        g.fillStyle = dark; U.band(g, smooth, sw, true);
        var off = smooth.map(function (p, i) { return { x: p.x - bd.nx * 0, y: p.y - sw[i] * .09 }; });
        g.fillStyle = bd.m.color; U.band(g, off, sw.map(function (w) { return w * .76; }), true);
        var hi = smooth.map(function (p, i) { return { x: p.x, y: p.y - sw[i] * .24 }; });
        g.fillStyle = light.replace('rgb', 'rgba').replace(')', ',.55)'); U.band(g, hi, sw.map(function (w) { return w * .17; }), true);
        // pegs
        [bd.A, bd.B].forEach(function (p) {
          var r = Math.max(7, bd.w * .62);
          g.fillStyle = 'rgba(8,4,10,.4)'; g.beginPath(); g.arc(p.x + 3 * unit, p.y + 6 * unit, r, 0, U.TAU); g.fill();
          var gr = g.createRadialGradient(p.x - r * .35, p.y - r * .4, r * .1, p.x, p.y, r);
          gr.addColorStop(0, '#fff3d0'); gr.addColorStop(.35, '#d9b36c'); gr.addColorStop(1, '#7a5a2a');
          g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, r, 0, U.TAU); g.fill();
          g.fillStyle = 'rgba(42,31,45,.5)'; g.beginPath(); g.arc(p.x, p.y, r * .28, 0, U.TAU); g.fill();
        });
      }

      return {
        layout: function (w, h, safe) {
          W = w; H = h; var pad = Math.min(w, h) * .04;
          box = { x: safe.l + pad, y: safe.t + pad, w: w - safe.l - safe.r - pad * 2, h: h - safe.t - safe.b - pad * 2 };
          build();
        },
        seed: function (s) { seed = s; build(); },
        set: function (k, v) { if (k === 'elastic') elastic = v; if (k === 'stretch') stretchK = v; },
        events: events,
        onEvent: function (e) {
          var mot = api.motion * stretchK;
          if (e.type === 'short') {
            var bd = bands[e.band]; if (!bd) return;
            var center = Math.round(e.pos * (N - 1)), kick = (bd.m.name === 'high' ? 900 : 700) * unit * e.vel * mot * (e.band % 2 ? 1 : -1);
            for (var i = 1; i < N - 1; i++) { var gw = U.gauss((i - center) / (N - 1), .045); bd.v[i] += kick * gw; bd.pinch[i] = Math.max(bd.pinch[i], .85 * gw); }
          } else if (e.type === 'long') forces.push({ kind: 'long', band: e.band, b: e.b, dur: e.dur });
          else if (e.type === 'pull') forces.push({ kind: 'pull', band: -1, b: e.b, dur: e.dur });
          else if (e.type === 'accent') bands.forEach(function (bd) { for (var i = 1; i < N - 1; i++) bd.pinch[i] = Math.max(bd.pinch[i], .3 * U.gauss(i / (N - 1) - .5, .2)); });
        },
        down: function (x, y) {
          var n = nearest(x, y); if (!n) return;
          var bd = bands[n.band], s = n.i / (N - 1), px = U.lerp(bd.A.x, bd.B.x, s), py = U.lerp(bd.A.y, bd.B.y, s);
          grab = { band: n.band, i: n.i, target: (x - px) * bd.nx + (y - py) * bd.ny };
          api.canvasCursor = 'grabbing';
        },
        move: function (x, y, pressed) {
          if (!grab || !pressed) return;
          var bd = bands[grab.band], s = grab.i / (N - 1), px = U.lerp(bd.A.x, bd.B.x, s), py = U.lerp(bd.A.y, bd.B.y, s);
          var lim = Math.min(W, H) * .2 * stretchK * Math.sin(Math.PI * U.clamp(s, .12, .88));
          grab.target = U.clamp((x - px) * bd.nx + (y - py) * bd.ny, -lim, lim);
        },
        up: function () {
          if (!grab) return;
          var bd = bands[grab.band], amt = Math.abs(bd.y[grab.i]) / (Math.min(W, H) * .2);
          if (voices && api.audioOn && amt > .03) voices.release(grab.band, amt);
          grab = null;
        },
        draw: function (g, b, dt) {
          if (lastBeat == null) lastBeat = b;
          var b0 = Math.abs(b - lastBeat) > 4 ? b : lastBeat;
          if (dt > 0) step(Math.min(dt, .05), b0, b); else if (grab) step(1 / 60, b, b);
          lastBeat = b;
          g.fillStyle = BG; g.fillRect(0, 0, W, H);
          var vg = g.createRadialGradient(W * .5, H * .45, Math.min(W, H) * .1, W * .5, H * .5, Math.max(W, H) * .75);
          vg.addColorStop(0, 'rgba(70,48,74,.55)'); vg.addColorStop(1, 'rgba(15,8,17,.6)');
          g.fillStyle = vg; g.fillRect(0, 0, W, H);
          bands.forEach(function (bd) { drawBand(g, bd); });
          U.grain(g, W, H, .12);
        },
        audio: function (T, chain) {
          var bass = V.soft(T, chain.bus, { wave: 'fatsine', volume: -10, attack: .04, sustain: .6, release: .9, cutoff: 900 });
          var boing = new T.PolySynth(T.MembraneSynth, { maxPolyphony: 4, volume: -14, options: { pitchDecay: .06, octaves: .7, oscillator: { type: 'triangle' }, envelope: { attack: .002, decay: .22, sustain: 0, release: .1 } } }).connect(chain.bus);
          var tenor = V.mallet(T, chain.bus, { harm: 2.01, index: 1.1, decay: .9, volume: -13 });
          var high = V.pluck(T, chain.bus, { decay: .1, volume: -15, cutoff: 4200 });
          var snap = V.noise(T, chain.dry, { volume: -22, cutoff: 2500, type: 'bandpass', decay: .08 });
          var drum = V.drum(T, chain.dry, { volume: -13, octaves: 2.5, decay: .5 });
          voices = {
            list: [bass, boing, tenor, high, snap, drum],
            play: function (e, t, spb) {
              if (e.type === 'accent') { drum.triggerAttackRelease(U.mtof(33), .5, t, .8); snap.triggerAttackRelease(.08, t, .5); [0, 1, 2, 3].forEach(function (i) { tenor.triggerAttackRelease(U.mtof(MEMBERS[i].notes[0] + (i ? 0 : 12)), .6, t + i * .012, .5); }); return; }
              if (e.type === 'pull') return;
              var m = MEMBERS[e.band], note = U.mtof(m.notes[e.deg || 0]);
              if (e.band === 0) bass.triggerAttackRelease(note, e.dur * spb * .95, t, e.vel);
              else if (e.band === 1) boing.triggerAttackRelease(note, .1, t, e.vel);
              else if (e.band === 2) (e.type === 'long' ? bass : tenor).triggerAttackRelease(note, e.type === 'long' ? e.dur * spb * .9 : .3, t, e.vel * (e.type === 'long' ? .55 : 1));
              else high.triggerAttackRelease(note, .08, t, e.vel);
            },
            release: function (band, amt) {
              var t = T.now() + .01, m = MEMBERS[band], note = U.mtof(m.notes[Math.min(4, Math.floor(amt * 5))]);
              boing.triggerAttackRelease(note, .2, t, U.clamp(.3 + amt * .6, .3, .9));
            }
          };
          return voices;
        }
      };
    }
  });
})();
