/* 07 你唱一句，我回一句 — You Sing, I Answer
 * Two strands grow from opposite edges. Each strand is built by integrating a
 * heading angle along its length, so gestures compose cleanly: a flick bends
 * the tip, a curl winds it into a spiral, a rise tilts the root, a stretch
 * lengthens it. The left asks (a short phrase), leaves a gap, the right
 * answers keeping the rhythm but changing the ending and adding a flourish.
 * Every fourth exchange both reach the centre and join into one wave — the
 * travelling wave is a function of absolute position, so the join is seamless. */
(function () {
  var U = Sound2.U, V = Sound2.V;
  var BG = '#17332b', LEFT = '#f3d9a4', RIGHT = '#f29b8a', GOLD = '#e8c35a';
  var SC = [0, 2, 4, 5, 7, 9, 11];
  function deg(d) { return 65 + SC[U.mod(d, 7)] + 12 * Math.floor(d / 7); }
  // rhythm/gesture patterns: [beat, kind, dur, degree]
  var PATTERNS = {
    twoShortLong: { label: '兩短一長', q: [[0, 'short', .5, 4], [.75, 'short', .5, 4], [1.5, 'long', 1.5, 1]] },
    threeShort: { label: '三連短', q: [[0, 'short', .4, 2], [.5, 'short', .4, 3], [1, 'short', .4, 4], [2, 'rise', 1, 6]] },
    longCurl: { label: '長—捲', q: [[0, 'long', 1.5, 4], [2, 'curl', 1, 5]] },
    rising: { label: '上揚', q: [[0, 'short', .5, 0], [1, 'rise', 1.25, 4], [2.5, 'short', .5, 5]] }
  };
  var KEYS = Object.keys(PATTERNS);
  var CYCLE = 36; // 8 + 8 + 8 + 12 beats
  var STARTS = [0, 8, 16, 24];
  var CHORD_ROOT = [0, 3, 5, 4];

  function answerOf(q, n) {
    // keep the rhythm; resolve the ending downward; swap one gesture; add a flourish
    var a = q.map(function (g, i) { return [g[0], g[1], g[2], g[3] - 2]; });
    var last = a[a.length - 1];
    last[3] = 0;
    if (last[1] === 'long') last[1] = n % 2 ? 'curl' : 'long';
    else if (last[1] === 'rise') last[1] = 'long';
    else if (last[1] === 'curl') last[1] = 'rise';
    var end = last[0] + last[2];
    if (end < 2.9) a.push([Math.max(end + .25, 2.5), 'flourish', .5, 2]);
    return a;
  }

  Sound2.start({
    id: '07-wave-dialogue', bpm: 96, tempoMin: 72, tempoMax: 124, dark: true,
    bg: BG, fg: '#f2ecdc', accent: GOLD, panel: 'rgba(23,51,43,.72)', wet: .28,
    alt: '深綠色背景，左右邊緣各長出一條波形角色。左邊先做出兩短一長的動作，空白一下，右邊用相同的節奏回答並加上一個小捲曲；每四問之後，兩條在中央接成一條完整的波。',
    lede: '左邊先問：兩短、一長。<br>停一下。<br>右邊用同樣的節奏回答，再加一個小捲。',
    about: '<p>兩個波形角色用有限的動作說話：短彈、長伸展、捲曲、上揚、停頓與合攏。左邊提問，右邊回答——回答保留提問的節奏，只在結尾換一個動作、落到穩定的音上，再加一個小小的裝飾。</p><p>問與答之間的空白也是樂句的一部分。每四次問答之後，兩條波一起伸向中央，接成一條完整的波，停留兩拍，再各自回家。</p>',
    how: '按下方的「提問」按鈕，下一輪由你替左邊選問句，右邊會用自己的方式回答。也可以在「調整」裡改變波的起伏。',
    params: [{ key: 'swell', label: '起伏', type: 'range', min: .4, max: 1.6, step: .01, value: 1, format: function (v) { return Math.round(v * 100) + '%'; } }],
    create: function (api) {
      var W = 0, H = 0, VW = 0, VH = 0, portrait = false, cy = 0, margin = 0, unit = 1, seed = 1, swell = 1, picks = {}, phase0 = 0, order = [];

      // user question buttons (touch friendly), rendered by the work
      var bar = document.createElement('div');
      bar.className = 's2-ask'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', '替左邊選一個提問');
      bar.innerHTML = '<span>提問</span>' + KEYS.map(function (k) { return '<button type="button" data-k="' + k + '">' + PATTERNS[k].label + '</button>'; }).join('');
      document.body.appendChild(bar);
      var st = document.createElement('style');
      st.textContent = '.s2-ask{position:fixed;left:40px;bottom:84px;display:flex;gap:6px;align-items:center;z-index:3;font-size:11px;letter-spacing:.08em}.s2-ask span{opacity:.7;margin-right:4px}.s2-ask button{border:1px solid color-mix(in srgb,var(--fg) 22%,transparent);background:var(--panel);color:var(--fg);border-radius:30px;min-height:36px;padding:6px 13px;font-size:12px;cursor:pointer}.s2-ask button[aria-pressed=true]{background:var(--accent);color:#17332b;border-color:var(--accent)}body.s2-hidden .s2-ask{opacity:0;pointer-events:none}@media(max-width:720px){.s2-ask{left:10px;right:10px;bottom:118px;justify-content:center;flex-wrap:wrap}.s2-ask span{display:none}.s2-ask button{min-height:40px;padding:6px 11px}}';
      document.head.appendChild(st);
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var at = api.nextBeat(1), ex = nextExchange(at);
        picks[ex] = b.getAttribute('data-k');
        bar.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        setTimeout(function () { b.setAttribute('aria-pressed', 'false'); }, 2400);
        api.toast('下一輪由左邊問「' + PATTERNS[picks[ex]].label + '」。');
      });

      function exchangeAt(b) { var c = Math.floor(b / CYCLE), p = b - c * CYCLE, k = p < 8 ? 0 : p < 16 ? 1 : p < 24 ? 2 : 3; return { c: c, k: k, id: c * 4 + k, start: c * CYCLE + STARTS[k] }; }
      function nextExchange(b) { var e = exchangeAt(b); return b > e.start ? e.id + 1 : e.id; }
      function patternFor(id) { return picks[id] || order[U.mod(id, order.length)]; }

      function score(id) {
        var c = Math.floor(id / 4), k = U.mod(id, 4), start = c * CYCLE + STARTS[k], key = patternFor(id), q = PATTERNS[key].q, a = answerOf(q, id), root = CHORD_ROOT[k];
        var evs = [];
        q.forEach(function (g) { evs.push({ b: start + g[0], side: 0, kind: g[1], dur: g[2], deg: g[3] + root, id: id }); });
        a.forEach(function (g) { evs.push({ b: start + 4.5 + g[0], side: 1, kind: g[1], dur: g[2], deg: g[3] + root - (g[1] === 'flourish' ? 0 : 0), id: id }); });
        evs.push({ b: start, side: -1, kind: 'bass', dur: 4, deg: root - 14, id: id });
        if (k === 3) { evs.push({ b: start + 8, side: -1, kind: 'close', dur: 3, deg: 0, id: id }); }
        return evs;
      }
      function events(b0, b1) {
        var out = [], e0 = exchangeAt(b0 - 12).id, e1 = exchangeAt(b1).id;
        for (var id = e0; id <= e1; id++) score(id).forEach(function (e) { if (e.b >= b0 && e.b < b1) out.push(e); });
        return out;
      }

      /* gesture envelopes active at b for a side */
      function pose(side, b) {
        var P = { flick: 0, curl: 0, rise: 0, stretch: 0, speak: 0, close: 0, lean: 0 };
        events(b - 6, b + 1.2).forEach(function (e) {
          var t = b - e.b, u = t / e.dur;
          if (e.kind === 'close') { var cl = t < 0 ? 0 : t < .9 ? U.inOut(t / .9) : t < e.dur ? 1 : 1 - U.inOut((t - e.dur) / 1.2); P.close = Math.max(P.close, cl); return; }
          if (e.side !== side) {
            // the listener leans in a touch just before its turn
            if (e.side === 1 - side && side === 1 && e.kind && t > -1 && t < 0) P.lean = Math.max(P.lean, U.smooth(t + 1) * .3);
            return;
          }
          if (t < -.15 || t > e.dur + 1.2) return;
          var att = U.smooth((t + .15) / .3), rel = t < e.dur ? 1 : Math.exp(-(t - e.dur) * 3.2);
          var env = att * rel;
          P.speak = Math.max(P.speak, U.env(t, .03, .45));
          if (e.kind === 'short') P.flick += Math.sin(Math.PI * U.sat(t / Math.max(e.dur, .3))) * 1 * (t < 0 ? 0 : 1) - (t < 0 ? .25 * U.smooth((t + .15) / .15) : 0);
          if (e.kind === 'long') P.stretch += env;
          if (e.kind === 'curl') P.curl += Math.sin(Math.PI * U.sat(t / (e.dur + .6))) * (t < 0 ? 0 : 1);
          if (e.kind === 'rise') P.rise += env;
          if (e.kind === 'flourish') { P.curl += .45 * Math.sin(Math.PI * U.sat(t / .8)); P.flick += .35 * Math.sin(Math.PI * U.sat(t / .4)); }
        });
        return P;
      }

      function strand(side, b) {
        var P = pose(side, b), dir = side ? -1 : 1, ax = side ? VW - margin : margin, half = VW / 2 - margin;
        var L0 = half * .58, L = L0 * (1 + .5 * P.stretch) * (1 + .04 * Math.sin(b * .8 + side));
        L = U.lerp(L, half, P.close);
        var n = Math.round(90 * (api.quality < 1 ? .7 : 1)), pts = [], x = ax, y = cy, ds = L / n, amp = .38 * swell * api.motion, k = U.TAU / (VW * .21);
        var tilt = -P.rise * .55 * (1 - P.close) - P.lean * .1 * 0;
        for (var i = 0; i <= n; i++) {
          var s = i / n, absx = x;
          // travelling wave as a function of absolute x so the two halves join seamlessly
          var wv = amp * Math.cos(k * absx - b * Math.PI * .5 + phase0) * U.smooth(s * 3) * (1 - .5 * P.close * 0);
          var head = tilt * (1 - s * .4) + wv - P.flick * 1.7 * U.smooth((s - .66) / .34) * (1 - P.close) - P.curl * 5.2 * Math.pow(U.smooth((s - .5) / .5), 2) * (1 - P.close);
          pts.push({ x: x, y: y, s: s });
          x += Math.cos(head) * ds * dir; y += Math.sin(head) * ds;
        }
        // during the join, pull the tip onto the centre line so both halves meet
        if (P.close > 0) { var tipy = pts[n].y, dy = cy + (pts[n].y - cy) * 0; pts.forEach(function (p) { p.y = U.lerp(p.y, p.y - (tipy - cy) * Math.pow(p.s, 2), P.close); p.x = U.lerp(p.x, ax + dir * p.s * half, P.close * .9); }); }
        return { pts: pts, P: P };
      }

      function drawStrand(g, S, color, side) {
        var pts = S.pts, n = pts.length, w = [];
        for (var i = 0; i < n; i++) { var s = i / (n - 1); w.push((30 - 18 * s) * unit * (1 + .18 * S.P.speak * U.smooth((s - .6) / .4))); }
        // soft under-glow
        g.save(); g.translate(0, 10 * unit); g.globalAlpha = .22; g.fillStyle = '#081a14'; U.band(g, pts, w, true); g.restore();
        g.fillStyle = color; U.band(g, pts, w, true);
        // a darker spine gives the strand a rolled, tubular read
        g.strokeStyle = 'rgba(23,51,43,.28)'; g.lineWidth = 1.2 * unit; g.beginPath();
        pts.forEach(function (p, i) { var q = { x: p.x, y: p.y + w[i] * .18 }; if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); }); g.stroke();
        var tip = pts[n - 1], r = 8 * unit * (1 - S.P.close) + .01;
        if (S.P.speak > .02) {
          var gr = g.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 46 * unit);
          gr.addColorStop(0, U.alpha(color, .45 * S.P.speak)); gr.addColorStop(1, U.alpha(color, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(tip.x, tip.y, 46 * unit, 0, U.TAU); g.fill();
        }
        g.fillStyle = color; g.beginPath(); g.arc(tip.x, tip.y, r * (1 + .3 * S.P.speak), 0, U.TAU); g.fill();
        // root: a small anchoring disc at the edge
        var root = pts[0]; g.fillStyle = U.rgb(U.mix(color, BG, .35)); g.beginPath(); g.arc(root.x, root.y, 15 * unit, 0, U.TAU); g.fill();
      }

      return {
        layout: function (w, h, safe) {
          W = w; H = h; portrait = h > w * 1.1;
          var off = safe.t + 6, bottom = safe.b + 64;
          VW = portrait ? h - off - bottom : w; VH = portrait ? w : h;
          cy = portrait ? VH / 2 : safe.t + (h - safe.t - safe.b) / 2;
          margin = portrait ? 4 : 30; unit = U.clamp(Math.min(VW, VH * 1.6) / 1200, .5, 1.3);
          if (portrait) { unit = U.clamp(VW / 900, .5, 1); }
          this._off = portrait ? off : 0;
        },
        seed: function (s) { seed = s; var r = U.rng(s * 5 + 1); order = r.shuffle(KEYS).concat(r.shuffle(KEYS)); order[0] = 'twoShortLong'; phase0 = r.range(0, 6); picks = {}; },
        set: function (k, v) { if (k === 'swell') swell = v; },
        events: events,
        draw: function (g, b) {
          g.fillStyle = BG; g.fillRect(0, 0, W, H);
          g.save();
          if (portrait) { g.translate(W, this._off); g.rotate(Math.PI / 2); }
          var gr = g.createRadialGradient(VW / 2, cy, 10, VW / 2, cy, VW * .55);
          gr.addColorStop(0, 'rgba(60,110,90,.35)'); gr.addColorStop(1, 'rgba(10,30,24,0)');
          g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
          // the space between: a dotted centre line
          g.fillStyle = 'rgba(242,236,220,.22)';
          for (var d = -3; d <= 3; d++) { g.beginPath(); g.arc(VW / 2, cy + d * 14 * unit, 1.4 * unit, 0, U.TAU); g.fill(); }
          var A = strand(0, b), B = strand(1, b);
          drawStrand(g, A, LEFT, 0); drawStrand(g, B, RIGHT, 1);
          var cl = Math.max(A.P.close, B.P.close);
          if (cl > .6) {
            var mx = (A.pts[A.pts.length - 1].x + B.pts[B.pts.length - 1].x) / 2, my = (A.pts[A.pts.length - 1].y + B.pts[B.pts.length - 1].y) / 2, e = U.smooth((cl - .6) / .4);
            g.fillStyle = GOLD; g.beginPath(); g.arc(mx, my, 9 * unit * e * (1 + .15 * Math.sin(b * Math.PI * 2)), 0, U.TAU); g.fill();
            g.strokeStyle = U.alpha(GOLD, .4 * e); g.lineWidth = 1.5 * unit; g.beginPath(); g.arc(mx, my, 24 * unit * e, 0, U.TAU); g.stroke();
          }
          g.restore();
          U.grain(g, W, H, .12);
        },
        audio: function (T, chain) {
          var pl = new T.Panner(-.4).connect(chain.bus), pr = new T.Panner(.4).connect(chain.bus);
          var left = V.mallet(T, pl, { harm: 2.01, index: 2.4, decay: .9, volume: -9 });
          var leftLong = V.soft(T, pl, { wave: 'triangle', attack: .03, sustain: .5, release: .7, volume: -16, cutoff: 2400 });
          var right = V.bell(T, pr, { harm: 3.01, index: 3.2, decay: 1.3, volume: -12 });
          var bass = V.bass(T, chain.dry, { volume: -16, cutoff: 360, sustain: .4 });
          var pad = V.soft(T, chain.bus, { volume: -24, attack: .5, release: 2.2, cutoff: 1400 });
          return {
            list: [left, leftLong, right, bass, pad],
            dispose: function () { [left, leftLong, right, bass, pad].forEach(function (v) { V.dispose([v]); }); pl.dispose(); pr.dispose(); },
            play: function (e, t, spb) {
              var f = U.mtof(deg(e.deg)), voice = e.side ? right : left;
              if (e.kind === 'bass') { bass.triggerAttackRelease(U.mtof(deg(e.deg)), spb * 3.5, t, .6); return; }
              if (e.kind === 'close') { pad.triggerAttackRelease([65, 69, 72, 76].map(U.mtof), spb * 3, t, .5); left.triggerAttackRelease(U.mtof(72), .8, t, .6); right.triggerAttackRelease(U.mtof(77), 1.2, t + spb * .5, .5); bass.triggerAttackRelease(U.mtof(41), spb * 3, t, .7); return; }
              if (e.kind === 'short') voice.triggerAttackRelease(f, .25, t, .7);
              else if (e.kind === 'long') { voice.triggerAttackRelease(f, e.dur * spb, t, .7); if (!e.side) leftLong.triggerAttackRelease(f, e.dur * spb * .9, t, .5); }
              else if (e.kind === 'rise') { voice.triggerAttackRelease(U.mtof(deg(e.deg - 2)), .2, t, .55); voice.triggerAttackRelease(f, .5, t + spb * .25, .7); }
              else if (e.kind === 'curl') { [1, 0, -1, 0].forEach(function (d, i) { voice.triggerAttackRelease(U.mtof(deg(e.deg + d)), .16, t + i * spb * .17, .5 + (i === 3 ? .2 : 0)); }); }
              else if (e.kind === 'flourish') { voice.triggerAttackRelease(U.mtof(deg(e.deg + 1)), .12, t, .4); voice.triggerAttackRelease(f, .4, t + spb * .14, .55); }
            }
          };
        }
      };
    }
  });
})();
