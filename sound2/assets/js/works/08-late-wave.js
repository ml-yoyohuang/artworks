/* 08 等一下，我也要！ — Wait, Me Too!
 * A row of standing wave-strands hops together on the beat. Now and then one
 * of them drifts (distracted), misses the beat, jumps half a beat late as the
 * others land, catches up with two quick sixteenth hops, and is back in step
 * on the next beat. Every hop, including the late ones, is a score event;
 * poses are pure functions of beat, so lateness never accumulates drift. */
(function () {
  var U = Sound2.U, V = Sound2.V;
  var BG = '#f3ecd6', INK = '#2a2b2e';
  var HUES = ['#2f5d62', '#3b6f73', '#3f7f8c', '#4a7fa6', '#5577a8', '#6170a8', '#6c6aa6', '#7a68a0', '#866497', '#8f5f8c', '#985a80', '#3a6a6e', '#4f7c95', '#646ea6', '#80669c'];
  var PHR = 16;

  Sound2.start({
    id: '08-late-wave', bpm: 108, tempoMin: 80, tempoMax: 136,
    bg: BG, fg: INK, accent: '#e8743b',
    alt: '淡奶黃底上一排直立的波形小線條隨拍整齊起跳。其中一條偶爾分心、慢了半拍，在大家落地時才跳起來，再用兩個小跳追上隊伍。',
    lede: '大家一起跳、一起落。<br>有一個在發呆——<br>等一下，我也要！',
    about: '<p>一排小波整齊地起伏，每一拍都是同一個動作。其中一條偶爾分心：先晃神、錯過一拍，在大家落地的瞬間才猛然跳起，接著用兩個很快的小跳追上，下一拍又和大家一樣了。旁邊的成員會稍微側身等它。</p><p>遲到是設計好的時間差，不是失誤：它的每一下都寫在樂譜裡，追上之後與隊伍完全同步。</p>',
    how: '點一下任何一條小波，它會在下一小節慢半拍一次（每小節最多一次）。「人數」與「頻率」在「調整」裡。',
    params: [
      { key: 'count', label: '人數', type: 'select', value: 11, options: [[7, '7'], [11, '11'], [15, '15']] },
      { key: 'often', label: '慢半拍的頻率', type: 'select', value: 'some', options: [['rare', '偶爾'], ['some', '不時'], ['often', '常常']] }
    ],
    create: function (api) {
      var W = 0, H = 0, box, unit = 1, seed = 1, count = 11, often = 'some', members = [], ground = 0, userLate = [];

      function build() {
        if (!box) return;
        var n = box.w < 520 ? Math.min(count, 7) : count, r = U.rng(seed * 19 + 7);
        var gap = box.w / (n + .4), hh = Math.min(box.h * .5, gap * (box.w < 520 ? 4.8 : 3.4));
        unit = U.clamp(gap / 90, .45, 1.3);
        ground = box.y + box.h * .78;
        var start = r.int(0, HUES.length - 1);
        members = [];
        for (var i = 0; i < n; i++) members.push({ x: box.x + gap * (i + .7), h: hh * r.range(.86, 1.06), color: HUES[(start + i) % HUES.length], ph: r.range(0, 6), sway: r.range(.6, 1.1) });
        userLate = [];
      }

      /* scripted lateness: first one in bar 2 so it appears within seconds */
      function lateAt(phrase) {
        var every = often === 'rare' ? 4 : often === 'some' ? 2 : 1;
        if (phrase !== 0 && U.mod(phrase, every) !== 0) return null;
        var r = U.rng(seed * 7 + phrase * 13 + 1);
        return { b: phrase * PHR + (phrase === 0 ? 4 : r.pick([4, 6, 8, 10])), m: r.int(0, members.length - 1) };
      }
      function lates(b0, b1) {
        var out = [];
        for (var p = Math.floor((b0 - 4) / PHR); p <= Math.floor(b1 / PHR); p++) { var l = lateAt(p); if (l) out.push(l); }
        userLate.forEach(function (l) { out.push(l); });
        return out.filter(function (l) { return l.b + 3 >= b0 && l.b - 3 < b1; });
      }

      function events(b0, b1) {
        var out = [], L = lates(b0 - 3, b1 + 3);
        for (var beat = Math.ceil(b0 * 4) / 4; beat < b1; beat += .25) {
          var inP = U.mod(beat, PHR);
          if (beat % 1 === 0) {
            var rest = inP === 15;
            if (!rest) out.push({ b: beat, type: 'hop', big: U.mod(inP, 2) === 0, bar: Math.floor(inP / 4), beat: U.mod(inP, 4), phr: Math.floor(beat / PHR) });
          }
          L.forEach(function (l) {
            if (beat === l.b + .5) out.push({ b: beat, type: 'late', m: l.m });
            if (beat === l.b + 1) out.push({ b: beat, type: 'catch', m: l.m, n: 0 });
            if (beat === l.b + 1.25) out.push({ b: beat, type: 'catch', m: l.m, n: 1 });
            if (beat === l.b + 2) out.push({ b: beat, type: 'resync', m: l.m });
          });
        }
        return out;
      }

      /* pose of member m at beat b */
      function pose(m, b) {
        var L = lates(b - 3, b + 3).filter(function (l) { return l.m === m; })[0], y = 0, sq = 0, tilt = 0, distract = 0, spark = 0;
        var hopShape = function (t, D, Hh) { if (t < -.14 || t > D + .45) return null; var s = 0, hy = 0; if (t < 0) s = -.5 * U.smooth((t + .14) / .14); else if (t < D) { var u = t / D; hy = Hh * 4 * u * (1 - u); s = .35 * Math.sin(Math.PI * u) * (1 - u); } else s = -.55 * U.ring(t - D, 2.4, 6) - .25 * Math.exp(-(t - D) * 12); return { y: hy, s: s }; };
        var take = function (h) { if (!h) return; if (h.y > y) y = h.y; sq = Math.abs(h.s) > Math.abs(sq) ? h.s : sq; };
        var base = Math.floor(b);
        for (var k = base - 1; k <= base + 1; k++) {
          var inP = U.mod(k, PHR); if (inP === 15) continue;
          var skip = L && (k === L.b || k === L.b + 1);
          if (skip) continue;
          var big = U.mod(inP, 2) === 0, Hh = (big ? .2 : .12) * members[m].h * api.motion;
          take(hopShape(b - k, .62, Hh));
        }
        if (L) {
          var t = b - L.b;
          distract = U.smooth((t + 2.5) / 1.5) * (1 - U.smooth((t - .3) / .3));
          tilt = .2 * distract * (m % 2 ? 1 : -1);
          if (t > -.2 && t < .5) sq = Math.min(sq, -.25 * U.smooth((t + .2) / .3)); // stays crouched, startled
          take(hopShape(t - .5, .52, .32 * members[m].h * api.motion));
          take(hopShape(t - 1, .22, .12 * members[m].h * api.motion));
          take(hopShape(t - 1.25, .22, .14 * members[m].h * api.motion));
          spark = U.env(t - .5, .03, .5) + .6 * U.env(t - 2, .03, .4);
          if (t > 2.62 && t < 3.4) sq += -.2 * U.ring(t - 2.62, 3, 5);
        }
        // neighbours glance at the latecomer
        var look = 0;
        lates(b - 3, b + 3).forEach(function (l) { if (l.m === m) return; var d = Math.abs(l.m - m); if (d > 2) return; var t = b - l.b; look += (l.m > m ? 1 : -1) * .12 * (1 - (d - 1) * .5) * U.smooth((t - .1) / .4) * (1 - U.smooth((t - 1.6) / .5)); });
        return { y: y, sq: sq, tilt: tilt + look, distract: distract, spark: spark };
      }

      function drawMember(g, mb, i, b) {
        var P = pose(i, b), h = mb.h * (1 + .22 * P.sq), foot = ground - P.y, n = 26, pts = [], w = [];
        var swayPh = b * Math.PI + mb.ph * (P.distract * 1.2) + (P.distract ? Math.sin(b * 2.3) * P.distract : 0);
        for (var k = 0; k <= n; k++) {
          var s = k / n, sway = (Math.sin(Math.PI * s * 1.4 + swayPh) * .09 * mb.sway * api.motion) * h * s;
          var lean = Math.sin(P.tilt) * h * s * s;
          pts.push({ x: mb.x + sway + lean, y: foot - s * h * Math.cos(P.tilt * s) });
          w.push((15 - 3 * s) * unit * (1 - .25 * P.sq));
        }
        // ground shadow shrinks as it leaves the floor
        var air = U.sat(P.y / (mb.h * .4));
        g.fillStyle = 'rgba(42,43,46,' + (.16 * (1 - air * .6)).toFixed(3) + ')';
        g.beginPath(); g.ellipse(mb.x, ground + 4 * unit, 16 * unit * (1 - air * .4) * (1 - .4 * P.sq), 4 * unit, 0, 0, U.TAU); g.fill();
        g.fillStyle = mb.color; U.band(g, pts, w, true);
        var head = pts[n];
        g.beginPath(); g.arc(head.x, head.y, 10.5 * unit * (1 - .2 * P.sq), 0, U.TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(head.x - 3 * unit, head.y - 3 * unit, 3 * unit, 0, U.TAU); g.fill();
        if (P.spark > .02) { g.fillStyle = 'rgba(232,116,59,' + Math.min(1, P.spark).toFixed(3) + ')'; g.beginPath(); g.arc(head.x, head.y - 22 * unit, 4.5 * unit * Math.min(1, P.spark + .3), 0, U.TAU); g.fill(); }
      }

      return {
        layout: function (w, h, safe) { W = w; H = h; var pad = Math.min(w, h) * .04; box = { x: safe.l + pad, y: safe.t, w: w - safe.l - safe.r - pad * 2, h: h - safe.t - safe.b }; build(); },
        seed: function (s) { seed = s; build(); },
        set: function (k, v) { if (k === 'count') { count = v; build(); } if (k === 'often') often = v; },
        events: events,
        down: function (x) {
          var best = 0, bd = 1e9; members.forEach(function (m, i) { var d = Math.abs(m.x - x); if (d < bd) { bd = d; best = i; } });
          var at = Math.ceil((api.nextBeat(1) + 1) / 4) * 4;
          if (userLate.some(function (l) { return l.b === at; }) || lates(at - 3, at + 3).length) { api.toast('這一小節已經有人遲到了，下一小節再試。'); return; }
          userLate.push({ b: at, m: best }); if (userLate.length > 4) userLate.shift();
          api.toast('第 ' + (best + 1) + ' 條會在下一小節慢半拍。');
        },
        draw: function (g, b) {
          g.fillStyle = BG; g.fillRect(0, 0, W, H);
          g.strokeStyle = 'rgba(42,43,46,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(box.x - 10, ground + .5); g.lineTo(box.x + box.w + 10, ground + .5); g.stroke();
          // beat ticks under the floor: the shared count
          var inP = U.mod(b, PHR);
          for (var k = 0; k < 16; k++) { var x = box.x + box.w * (.3 + .4 * k / 15), on = k <= inP; g.fillStyle = on ? 'rgba(42,43,46,.6)' : 'rgba(42,43,46,.15)'; g.fillRect(x - 1, ground + 22 * unit, 2, (k % 4 ? 5 : 10) * unit); }
          members.forEach(function (m, i) { drawMember(g, m, i, b); });
          U.grain(g, W, H, .16);
        },
        audio: function (T, chain) {
          var mar = V.mallet(T, chain.bus, { harm: 3.99, index: 1.2, decay: .5, volume: -12 });
          var bass = V.bass(T, chain.dry, { volume: -13, cutoff: 480, decay: .3, sustain: .1 });
          var clap = V.noise(T, chain.bus, { volume: -26, cutoff: 1800, type: 'bandpass', decay: .07, color: 'white' });
          var late = V.wood(T, chain.bus, { volume: -9, decay: .09 });
          var pip = V.pluck(T, chain.bus, { volume: -11, decay: .08, cutoff: 5000 });
          var bell = V.bell(T, chain.bus, { volume: -16, decay: .9 });
          var ROOT = [48, 45, 41, 43], TRI = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
          return {
            list: [mar, bass, clap, late, pip, bell],
            play: function (e, t, spb) {
              if (e.type === 'hop') {
                var ch = TRI[e.bar];
                if (e.beat === 0 || e.beat === 2) { bass.triggerAttackRelease(U.mtof(ROOT[e.bar] - (e.beat ? 0 : 12)), .3, t, .7); mar.triggerAttackRelease(U.mtof(ch[e.beat ? 1 : 0] + 12), .3, t, .55); }
                else { clap.triggerAttackRelease(.06, t, .5); mar.triggerAttackRelease(U.mtof(ch[2] + 12), .2, t, .35); }
              } else if (e.type === 'late') late.triggerAttackRelease(U.mtof(84), .08, t, .8);
              else if (e.type === 'catch') pip.triggerAttackRelease(U.mtof(e.n ? 88 : 86), .06, t, .55);
              else if (e.type === 'resync') bell.triggerAttackRelease(U.mtof(91), .6, t + .005, .35);
            }
          };
        }
      };
    }
  });
})();
