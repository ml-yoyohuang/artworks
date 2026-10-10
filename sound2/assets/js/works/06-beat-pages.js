/* 06 每一拍都有另一面 — Every Beat Has a Back
 * A wall of paper cards, each pivoting on a vertical pin. Each face shows its
 * slice of a generated composition; the face that is hidden is always the
 * *next* composition. During a phrase, small clusters flip on the detail
 * rhythm and preview it in patches; on bar 7 a large wave sweeps the rest.
 * Every card flips exactly once per phrase, so a card's angle is a pure
 * function of the beat and the phrase flip table. */
(function () {
  var U = Sound2.U, V = Sound2.V;
  var BOARD = '#d8d2c6', PAPER_EDGE = '#f7f2e8';
  var PALETTES = [
    ['#efe6d4', '#1f3a6e', '#e2583e', '#f2c14e', '#7aa58f'],
    ['#f1ebe0', '#2d2a32', '#d9a5b3', '#4f86c6', '#e9b44c'],
    ['#ece4d6', '#174b4f', '#ef7b45', '#b7c9b3', '#c9475b'],
    ['#f3eee5', '#3b3561', '#f28f3b', '#86c5da', '#e8d33f']
  ];
  var PHR = 32, SWEEP = 24;
  var DETAIL = [1.5, 2.5, 3.5, 5, 6, 6.75, 7.5, 9.5, 10.5, 11.5, 13, 14, 14.75, 15.5, 17.5, 18.5, 19.5, 21, 22, 22.5];

  Sound2.start({
    id: '06-beat-pages', bpm: 104, tempoMin: 80, tempoMax: 132,
    bg: BOARD, fg: '#24221f', accent: '#e2583e',
    alt: '暖灰背板上的一整面紙片，每張都以中軸釘住。細碎的節奏讓幾張翻面、露出另一幅構圖的一角；重音時一道翻頁波掃過整面牆，換成新的圖。',
    lede: '每一張紙的背面，<br>都藏著下一幅畫的一小片。<br>細碎的拍子先偷看，重音時整面翻過來。',
    about: '<p>這是一面紙製的動態牆。每張紙片以中央的細軸鉸接，正面與背面各是一幅生成構圖的一小片；藏在背後的，永遠是下一幅。</p><p>細碎的節奏讓零星幾張先翻過來，像有人偷翻了幾頁；第七小節的重音帶來一道翻頁波，穿過整面牆，把其餘的一起翻開。之後安靜兩小節，留下完整的新畫面。</p>',
    how: '點一下牆面，從那裡發出一道翻頁漣漪（每張翻一圈後回到原位；每拍最多一次）。「方向」「跨度」「隊形」在「調整」裡。',
    params: [
      { key: 'dir', label: '翻頁方向', type: 'select', value: 'cycle', options: [['cycle', '輪替'], ['lr', '由左而右'], ['center', '由中心'], ['diag', '對角']] },
      { key: 'span', label: '翻動跨度', type: 'range', min: .4, max: 1.6, step: .01, value: 1, format: function (v) { return v < .75 ? '細碎' : v > 1.25 ? '寬闊' : '適中'; } },
      { key: 'form', label: '紙片隊形', type: 'select', value: 'grid', options: [['grid', '整齊'], ['brick', '錯位'], ['tall', '長頁']] }
    ],
    create: function (api) {
      var W = 0, H = 0, box, seed = 1, cards = [], cols = 0, rows = 0, cw = 0, ch = 0, dir = 'cycle', span = 1, form = 'grid', pal = PALETTES[0], comps = {}, tables = {}, ripples = [];

      function build() {
        if (!box) return;
        var portrait = box.h > box.w;
        if (form === 'tall') { cols = portrait ? 4 : 10; rows = portrait ? 5 : 3; }
        else { cols = portrait ? 6 : 14; rows = portrait ? 9 : 7; }
        var gap = Math.min(box.w, box.h) * (form === 'tall' ? .016 : .012);
        cw = (box.w - gap * (cols - 1)) / cols; ch = (box.h - gap * (rows - 1)) / rows;
        if (form !== 'tall') { var s = Math.min(cw, ch / 1.3); cw = s; ch = s * 1.3; }
        var gw = cols * cw + (cols - 1) * gap, gh = rows * ch + (rows - 1) * gap, ox = box.x + (box.w - gw) / 2, oy = box.y + (box.h - gh) / 2;
        cards = [];
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
          var shift = form === 'brick' && j % 2 ? (cw + gap) / 2 : 0;
          if (form === 'brick' && j % 2 && i === cols - 1) continue;
          cards.push({ i: i, j: j, x: ox + i * (cw + gap) + shift, y: oy + j * (ch + gap), u: (i + .5) / cols, v: (j + .5) / rows });
        }
        cards.forEach(function (c, n) { c.n = n; });
        pal = PALETTES[seed % PALETTES.length];
        comps = {}; tables = {};
        wall = { x: ox, y: oy, w: gw + (form === 'brick' ? (cw + gap) / 2 : 0), h: gh };
      }
      var wall = { x: 0, y: 0, w: 1, h: 1 };

      /* Composition k: a few large printed shapes in wall coordinates (0..1). */
      function comp(k) {
        if (comps[k]) return comps[k];
        var r = U.rng(seed * 977 + k * 131), cs = r.shuffle(pal), type = ['disc', 'bands', 'arcs', 'split', 'sun'][U.mod(k + seed, 5)], shapes = [];
        if (type === 'disc') shapes.push({ t: 'circle', x: r.range(.3, .7), y: r.range(.35, .65), r: r.range(.28, .42), c: cs[1] }, { t: 'band', a: r.range(-.6, .6), o: r.range(-.2, .2), w: .09, c: cs[2] });
        if (type === 'bands') { var a = r.pick([.5, -.5, .9]); for (var b = -3; b <= 3; b++) shapes.push({ t: 'band', a: a, o: b * .17, w: .085, c: cs[1 + U.mod(b, 3)] }); }
        if (type === 'arcs') { var qx = r.pick([0, 1]), qy = r.pick([0, 1]); for (var q = 6; q >= 1; q--) shapes.push({ t: 'circle', x: qx, y: qy, r: q * .2, c: cs[q % 2 ? 1 : 0] }); shapes.push({ t: 'circle', x: 1 - qx * .8 - .1, y: 1 - qy * .7 - .15, r: .09, c: cs[2] }); }
        if (type === 'split') shapes.push({ t: 'tri', p: r.pick([[[0, 0], [1, 0], [0, 1]], [[1, 0], [1, 1], [0, 1]], [[0, 0], [1, 1], [0, 1]]]), c: cs[1] }, { t: 'rect', x: r.range(.15, .6), y: r.range(.2, .55), w: .22, h: .3, c: cs[2] }, { t: 'circle', x: r.range(.2, .8), y: r.range(.2, .8), r: .07, c: cs[3] });
        if (type === 'sun') { shapes.push({ t: 'rect', x: 0, y: .62, w: 1, h: .38, c: cs[1] }); shapes.push({ t: 'circle', x: r.range(.3, .7), y: .62, r: .26, c: cs[2] }); shapes.push({ t: 'rect', x: 0, y: .62, w: 1, h: .38, c: cs[1], alpha: .0 }); shapes.push({ t: 'band', a: 0, o: .27, w: .03, c: cs[3] }); }
        comps[k] = { bg: cs[0], shapes: shapes, type: type };
        return comps[k];
      }

      function dirFor(p) { return dir === 'cycle' ? ['lr', 'center', 'diag'][U.mod(p, 3)] : dir; }
      /* flip table for phrase p: start beat for each card */
      function table(p) {
        var key = p + ':' + dirFor(p) + ':' + span.toFixed(2);
        if (tables[key]) return tables[key];
        var r = U.rng(seed * 3301 + p * 17), t = new Float32Array(cards.length).fill(-1), local = [];
        var px = r.range(.2, .8), py = r.range(.2, .8);
        DETAIL.forEach(function (beat, n) {
          px = U.clamp(px + r.range(-.25, .25), .05, .95); py = U.clamp(py + r.range(-.25, .25), .05, .95);
          var quota = Math.round(cards.length * .2 * span / DETAIL.length * (1 + (n % 3 === 0 ? 1 : 0)) + r.range(-.4, .4)), k = Math.max(1, quota), cand = cards.filter(function (c) { return t[c.n] < 0; }).sort(function (a, b) { return Math.hypot(a.u - px, a.v - py) - Math.hypot(b.u - px, b.v - py); }).slice(0, k);
          cand.forEach(function (c, m) { t[c.n] = beat + m * .125; });
          if (cand.length) local.push({ b: beat, n: cand.length, x: px });
        });
        var d = dirFor(p), spread = 2.6 * span;
        cards.forEach(function (c) {
          if (t[c.n] >= 0) return;
          var f = d === 'lr' ? c.u : d === 'center' ? Math.hypot(c.u - .5, (c.v - .5) * rows / cols) * 1.5 : (c.u + c.v) / 2;
          t[c.n] = SWEEP + f * spread;
        });
        var keys = Object.keys(tables); if (keys.length > 8) delete tables[keys[0]];
        tables[key] = { t: t, local: local, dir: d };
        return tables[key];
      }
      function cardAngle(c, b) {
        var p = Math.floor(b / PHR), inP = b - p * PHR, tb = table(p), st = tb.t[c.n], dur = st >= SWEEP ? .8 : .55;
        var prog = U.sat((inP - st) / dur), ang = Math.PI * (p + (prog <= 0 ? 0 : U.outBack(prog, st >= SWEEP ? 1.1 : .7)));
        var count = Math.round(ang / Math.PI);
        ripples.forEach(function (rp) { var dd = Math.hypot(c.u - rp.u, (c.v - rp.v) * rows / cols), rs = rp.b + dd * 2.2, q = U.sat((b - rs) / .9); if (q > 0 && q < 1) ang += U.TAU * U.inOut(q); });
        return { a: ang, count: count };
      }

      function drawFace(g, c, k, x, y, w, h) {
        var C = comp(k);
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
        g.fillStyle = C.bg; g.fillRect(x, y, w, h);
        // shapes are defined on the wall; map wall → this card's face
        var sx = w / cw, X = function (u) { return x + (u * wall.w - (c.x - wall.x)) * sx; }, Y = function (v) { return y + (v * wall.h - (c.y - wall.y)); };
        C.shapes.forEach(function (s) {
          if (s.alpha === 0) return;
          g.fillStyle = s.c; g.beginPath();
          if (s.t === 'circle') g.ellipse(X(s.x), Y(s.y), s.r * Math.min(wall.w, wall.h) * sx, s.r * Math.min(wall.w, wall.h), 0, 0, U.TAU);
          else if (s.t === 'rect') g.rect(X(s.x), Y(s.y), s.w * wall.w * sx, s.h * wall.h);
          else if (s.t === 'tri') { g.moveTo(X(s.p[0][0]), Y(s.p[0][1])); g.lineTo(X(s.p[1][0]), Y(s.p[1][1])); g.lineTo(X(s.p[2][0]), Y(s.p[2][1])); }
          else if (s.t === 'band') {
            var ca = Math.cos(s.a), sa = Math.sin(s.a), L = 2, cxw = .5 + s.o * -sa, cyw = .5 + s.o * ca, hw = s.w / 2;
            var pts = [[-L, -hw], [L, -hw], [L, hw], [-L, hw]].map(function (q) { return [cxw + q[0] * ca - q[1] * sa, cyw + (q[0] * sa + q[1] * ca) * wall.w / wall.h]; });
            g.moveTo(X(pts[0][0]), Y(pts[0][1])); pts.slice(1).forEach(function (q) { g.lineTo(X(q[0]), Y(q[1])); });
          }
          g.closePath(); g.fill();
        });
        g.restore();
      }

      function drawCard(g, c, b) {
        var st = cardAngle(c, b), a = st.a, co = Math.cos(a), si = Math.sin(a), w = Math.abs(co) * cw, cxp = c.x + cw / 2;
        var lift = Math.abs(si), thick = Math.max(1.2, cw * .045);
        // shadow on the board grows as the card lifts off it
        g.fillStyle = 'rgba(40,32,24,' + (.13 + .12 * lift).toFixed(3) + ')';
        g.fillRect(cxp - w / 2 + 3 + lift * cw * .12, c.y + 5 + lift * 4, Math.max(w, thick), ch);
        // two physical faces: the one turned away always carries the next composition
        var k = st.count + U.mod(Math.round(a / Math.PI) - st.count, 2), x0 = cxp - w / 2;
        if (w > .5) drawFace(g, c, k, x0, c.y, w, ch);
        // light: from the upper left
        var lam = U.clamp(.5 + .5 * (-.7 * si * (co >= 0 ? 1 : -1) + .7 * Math.abs(co)), 0, 1);
        if (lam < .98) { g.fillStyle = 'rgba(20,16,12,' + (.42 * (1 - lam)).toFixed(3) + ')'; g.fillRect(x0, c.y, w, ch); }
        // paper edge on the side swinging toward us
        if (lift > .05) { g.fillStyle = PAPER_EDGE; var ex = si * co > 0 ? x0 + w : x0 - thick * lift; g.fillRect(ex, c.y, thick * lift, ch); }
        // pivot pins
        g.fillStyle = 'rgba(36,34,31,.65)';
        g.beginPath(); g.arc(cxp, c.y - 3, 1.8, 0, U.TAU); g.arc(cxp, c.y + ch + 3, 1.8, 0, U.TAU); g.fill();
      }

      function events(b0, b1) {
        var out = [];
        for (var p = Math.floor(b0 / PHR); p <= Math.floor(b1 / PHR); p++) {
          if (!cards.length) return out;
          var tb = table(p), base = p * PHR;
          tb.local.forEach(function (l, i) { var bb = base + l.b; if (bb >= b0 && bb < b1) out.push({ b: bb, type: 'local', n: l.n, x: l.x, i: i, p: p }); });
          var sw = base + SWEEP; if (sw >= b0 && sw < b1) out.push({ b: sw, type: 'sweep', p: p });
          for (var k = 0; k < 8; k++) { var nb = base + SWEEP + k * .25 * span * 1.3; if (nb >= b0 && nb < b1) out.push({ b: nb, type: 'arp', k: k, p: p }); }
          for (var beat = Math.ceil(b0 - base); beat < b1 - base; beat++) { if (beat < 0 || beat >= PHR) continue; if (beat % 4 === 0 && beat < SWEEP) out.push({ b: base + beat, type: 'bar', bar: beat / 4, p: p }); }
        }
        api.userEvents(b0, b1, out);
        return out;
      }

      return {
        layout: function (w, h, safe) { W = w; H = h; var pad = Math.min(w, h) * .03; box = { x: safe.l + pad, y: safe.t + pad, w: w - safe.l - safe.r - pad * 2, h: h - safe.t - safe.b - pad * 2 }; build(); },
        seed: function (s) { seed = s; build(); },
        set: function (k, v) { if (k === 'dir') { dir = v; tables = {}; } if (k === 'span') { span = v; tables = {}; } if (k === 'form') { form = v; build(); } },
        events: events,
        down: function (x, y) {
          if (ripples.length && api.beat - ripples[ripples.length - 1].b < 1) { api.toast('等這道翻頁波走遠一點。'); return; }
          var at = api.nextBeat(.5), u = (x - wall.x) / wall.w, v = (y - wall.y) / wall.h;
          if (u < -.05 || u > 1.05 || v < -.05 || v > 1.05) return;
          ripples.push({ b: at, u: u, v: v }); if (ripples.length > 4) ripples.shift();
          api.add({ b: at, type: 'ripple' });
        },
        draw: function (g, b) {
          g.fillStyle = BOARD; g.fillRect(0, 0, W, H);
          ripples = ripples.filter(function (r) { return b - r.b < 6; });
          g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(wall.x - 14, wall.y - 14, wall.w + 28, wall.h + 28);
          cards.forEach(function (c) { drawCard(g, c, b); });
          U.grain(g, W, H, .22);
        },
        audio: function (T, chain) {
          var tick = V.wood(T, chain.bus, { volume: -14, decay: .05 });
          var paper = V.noise(T, chain.dry, { volume: -24, cutoff: 3500, type: 'bandpass', decay: .06, color: 'white' });
          var mar = V.mallet(T, chain.bus, { volume: -10, harm: 3.99, index: 1.5, decay: .9 });
          var drum = V.drum(T, chain.dry, { volume: -11, octaves: 3, decay: .5 });
          var bass = V.bass(T, chain.dry, { volume: -15, cutoff: 420 });
          var PROG = [[50, 62, 65, 69, 72], [43, 62, 67, 71, 74], [48, 60, 64, 67, 71], [45, 61, 64, 67, 69]];
          return {
            list: [tick, paper, mar, drum, bass],
            play: function (e, t, spb) {
              var ch = PROG[U.mod(e.p || 0, 4)];
              if (e.type === 'local') { tick.triggerAttackRelease(U.mtof(ch[1 + (e.i % 4)] + 12), .05, t, .45 + .1 * e.n); paper.triggerAttackRelease(.05, t + .01, .4); }
              else if (e.type === 'sweep') { drum.triggerAttackRelease(U.mtof(ch[0] - 12), .4, t, .85); bass.triggerAttackRelease(U.mtof(ch[0] - 12), spb * 6, t, .7); }
              else if (e.type === 'arp') mar.triggerAttackRelease(U.mtof(ch[1 + (e.k % 4)] + (e.k > 3 ? 12 : 0)), .5, t, .55 + e.k * .03);
              else if (e.type === 'bar') bass.triggerAttackRelease(U.mtof(ch[0]), spb * 1.5, t, .45);
              else if (e.type === 'ripple') { [0, 1, 2].forEach(function (k) { mar.triggerAttackRelease(U.mtof(ch[3 - k] + 12), .3, t + k * spb * .25, .4); }); paper.triggerAttackRelease(.05, t, .5); }
            }
          };
        }
      };
    }
  });
})();
