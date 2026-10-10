/* 09 這一拍，開花 — Bloom on the Beat
 * A paper rosette of wave-edged petals in layered rings. Each ring has its
 * own rhythmic role (outer: beats 1 & 3, middle: off-beats, inner: sixteenth
 * shimmer) and pulses only on its own events. At the end of every four-bar
 * phrase the rings open in sequence, outer to inner, and the petals peel away
 * from the centre to reveal its colour on the downbeat. Every two bars the
 * flower changes petal count/shape while it is folded small. */
(function () {
  var U = Sound2.U, V = Sound2.V;
  var BG = '#121a35';
  var PALS = [
    { rings: ['#e85d4a', '#f08a5d', '#f6b26b', '#f7d9a8', '#fbeedd'], core: '#f2b134', seed: '#7a3b12' },
    { rings: ['#c9406a', '#e46f8c', '#f2a3a8', '#f8cfc4', '#fdeee6'], core: '#59c3b6', seed: '#164e48' },
    { rings: ['#3f7fbf', '#69a5d6', '#9cc8e6', '#d6e8f1', '#f4f8f6'], core: '#f0c34a', seed: '#6b4a0e' },
    { rings: ['#6d4fa3', '#9a78c4', '#c4a9de', '#e6d6ef', '#f7f0f7'], core: '#ef7b45', seed: '#6e2a0c' }
  ];
  var SHAPES = ['round', 'pointed', 'fringe'];
  var COUNTS = [[8, 7, 6, 5, 5], [12, 10, 8, 6, 5], [6, 6, 6, 6, 6], [10, 9, 7, 6, 4], [16, 12, 9, 7, 5]];
  var PHR = 16;
  // D lydian colours: Dmaj7 · Dmaj7 · Bm7 · G→A, blooming back on D
  var BARS = [[50, [62, 66, 69, 73]], [50, [62, 66, 69, 76]], [47, [62, 66, 69, 71]], [43, [62, 67, 71, 74]]];

  Sound2.start({
    id: '09-rhythm-rosette', bpm: 100, tempoMin: 76, tempoMax: 128, dark: true,
    bg: BG, fg: '#f4ece0', accent: '#f2b134', panel: 'rgba(18,26,53,.72)', wet: .3,
    alt: '夜藍底上一朵多層紙瓣花盤。外圈在一、三拍張開，中圈踩反拍，內圈細細顫動；每四小節的最後，花瓣由外而內完全綻放，露出中心的顏色。',
    lede: '外圈踩重拍，中圈踩反拍，<br>內圈細細地抖。<br>第四小節的最後——開花。',
    about: '<p>一朵紙做的節奏花。每一圈花瓣都有自己的聲部：最外圈在第一、三拍張開，中圈踩在反拍，內圈像十六分音符那樣細細顫動。它們輪流動作，而不是一起抖。</p><p>每四小節的最後兩拍，花瓣由外而內依序打開，在下一個下拍完全綻放，從中心退開，露出藏在裡面的顏色。每兩小節，花會趁著收合的時候換一種花形與瓣數。</p>',
    how: '「圈層」「花形」「展開幅度」在「調整」裡。按「收藏此刻」把目前的姿態收進左下角的小格子，之後點它就能回到那個靜止的花形。',
    params: [
      { key: 'rings', label: '圈層', type: 'select', value: 4, options: [[3, '3'], [4, '4'], [5, '5']] },
      { key: 'shape', label: '花形', type: 'select', value: 'cycle', options: [['cycle', '輪替'], ['round', '圓瓣'], ['pointed', '尖瓣'], ['fringe', '波緣']] },
      { key: 'open', label: '展開幅度', type: 'range', min: .5, max: 1.3, step: .01, value: 1, format: function (v) { return Math.round(v * 100) + '%'; } }
    ],
    create: function (api) {
      var W = 0, H = 0, cx = 0, cy = 0, S = 100, seed = 1, nRings = 4, shapeMode = 'cycle', openK = 1, pal = PALS[0];

      /* --- 收藏 (keep a still pose) */
      var shelf = document.createElement('div'); shelf.className = 's2-shelf';
      shelf.innerHTML = '<button type="button" class="s2-keep">✿ 收藏此刻</button><div class="s2-thumbs" aria-label="收藏的姿態"></div>';
      document.body.appendChild(shelf);
      var css = document.createElement('style');
      css.textContent = '.s2-shelf{position:fixed;left:40px;bottom:84px;display:flex;gap:8px;align-items:center;z-index:3}.s2-keep{border:1px solid color-mix(in srgb,var(--fg) 22%,transparent);background:var(--panel);color:var(--fg);border-radius:30px;min-height:36px;padding:6px 14px;font-size:12px;cursor:pointer}.s2-thumbs{display:flex;gap:6px}.s2-thumbs button{width:40px;height:40px;border-radius:50%;border:1px solid color-mix(in srgb,var(--fg) 30%,transparent);padding:0;overflow:hidden;cursor:pointer;background:#121a35}.s2-thumbs img{width:100%;height:100%;object-fit:cover;display:block}body.s2-hidden .s2-shelf{opacity:0;pointer-events:none}@media(max-width:720px){.s2-shelf{left:12px;bottom:120px}.s2-keep{min-height:40px}}';
      document.head.appendChild(css);
      var kept = [];
      try { kept = JSON.parse(localStorage.getItem('sound2-rosette-kept') || '[]'); } catch (e) { kept = []; }
      function renderShelf() {
        var t = shelf.querySelector('.s2-thumbs');
        t.innerHTML = kept.map(function (k, i) { return '<button type="button" data-i="' + i + '" title="回到 seed ' + k.seed + ' 的這一拍"><img alt="收藏的花形 ' + (i + 1) + '" src="' + k.img + '"></button>'; }).join('');
      }
      shelf.querySelector('.s2-keep').addEventListener('click', function () {
        var c = document.querySelector('.s2-stage canvas'), side = Math.min(c.width, c.height), tmp = document.createElement('canvas'); tmp.width = tmp.height = 80;
        tmp.getContext('2d').drawImage(c, (c.width - side) / 2 + side * .15, (c.height - side) / 2 + side * .1, side * .7, side * .7, 0, 0, 80, 80);
        kept.unshift({ seed: api.seed, beat: api.beat, rings: nRings, shape: shapeMode, open: openK, img: tmp.toDataURL('image/jpeg', .7) });
        kept = kept.slice(0, 5);
        try { localStorage.setItem('sound2-rosette-kept', JSON.stringify(kept)); } catch (e) { }
        renderShelf(); api.toast('已收藏 seed ' + api.seed + ' 的這一拍；點左下角的小圓就能回來。');
      });
      shelf.querySelector('.s2-thumbs').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var k = kept[+b.getAttribute('data-i')], D = Sound2.debug;
        if (k.seed !== api.seed) D.reseed(k.seed);
        D.setParam('rings', k.rings); D.setParam('shape', k.shape); D.setParam('open', k.open);
        D.setPlaying(false); D.seek(k.beat);
        api.toast('回到收藏的姿態（已暫停）；按「繼續」讓它再開一次。');
      });
      renderShelf();

      function shapeFor(seg) { return shapeMode === 'cycle' ? SHAPES[U.mod(seg + seed, 3)] : shapeMode; }
      function countsFor(seg) { return COUNTS[U.mod(seg * 3 + seed, COUNTS.length)]; }
      function layersFor(phrase) { return Math.min(nRings, 2 + U.mod(phrase, 3)); }

      function events(b0, b1) {
        var out = [];
        for (var q = Math.ceil(b0 * 4) / 4; q < b1; q += .25) {
          var p = Math.floor(q / PHR), inP = q - p * PHR, bar = Math.floor(inP / 4), inBar = inP - bar * 4, layers = layersFor(p);
          if (inP >= 14) { if (inP === 14 || inP === 14.5 || inP === 15 || inP === 15.5) out.push({ b: q, type: 'rise', step: (inP - 14) * 2, bar: bar }); continue; }
          if (inBar === 0 || inBar === 2) out.push({ b: q, type: 'outer', bar: bar, beat: inBar, p: p });
          if (layers >= 2 && (inBar === .5 || inBar === 1.5 || inBar === 2.5 || inBar === 3.5)) out.push({ b: q, type: 'middle', bar: bar, n: Math.floor(inBar), p: p });
          if (layers >= 3 && bar % 2 === 1 && inBar % 1 !== .5 && U.at(seed, Math.floor(q * 4), 3) < .7) out.push({ b: q, type: 'inner', bar: bar, n: Math.round(inBar * 4), p: p });
          if (inP === 0) out.push({ b: q, type: 'bloom', p: p });
        }
        return out;
      }

      /* open amount 0..1 for ring j (0 = outer) */
      function openness(j, b) {
        var p = Math.floor(b / PHR), inP = b - p * PHR, role = j === 0 ? 'outer' : j === 1 ? 'middle' : 'inner', o = .18;
        events(b - 1.6, b).forEach(function (e) {
          var t = b - e.b;
          if (e.type === role || (role === 'inner' && j > 2 && e.type === 'inner')) o += (role === 'outer' ? .32 : role === 'middle' ? .2 : .1) * U.env(t, .06, role === 'outer' ? .55 : .3);
        });
        // phrase-end bloom: outer first, inner last; full on the downbeat; then fold
        var start = 13.6 + j * .45 * (4 / nRings), bloomIn = U.smooth((inP - start) / (16 - start));
        var after = inP < 2.2 ? 1 - U.smooth((inP - .9) / 1.3) : 0;
        var bl = Math.max(inP >= 13 ? bloomIn : 0, after);
        return U.clamp(Math.max(o, U.lerp(o, 1, bl)), 0, 1.1);
      }

      function petalPath(g, len, wid, shape, base, phaseW) {
        var n = 26, L = [], R = [];
        for (var i = 0; i <= n; i++) {
          var t = i / n, w;
          if (shape === 'pointed') w = Math.pow(Math.sin(Math.PI * Math.pow(t, .8)), 1.3) * (1 - .25 * t);
          else if (shape === 'fringe') w = Math.pow(Math.sin(Math.PI * Math.pow(t, .7)), .7) * (1 + .16 * Math.sin(t * Math.PI * 9 + phaseW) * U.smooth(t * 2));
          else w = Math.pow(Math.sin(Math.PI * Math.pow(t, .75)), .65);
          var ww = w * wid * (1 + .06 * Math.sin(t * Math.PI * 4 + phaseW));
          L.push([base + t * len, -ww / 2]); R.push([base + t * len, ww / 2]);
        }
        g.beginPath(); g.moveTo(L[0][0], L[0][1]);
        L.forEach(function (p) { g.lineTo(p[0], p[1]); });
        for (var k = R.length - 1; k >= 0; k--) g.lineTo(R[k][0], R[k][1]);
        g.closePath();
      }

      function drawRing(g, j, b, seg, alpha) {
        var shape = shapeFor(seg), counts = countsFor(seg), k = counts[j], o = openness(j, b) * openK, depth = j / Math.max(1, nRings - 1);
        var coreR = S * .17, Lmax = S * (.98 - .62 * depth), lenOpen = Lmax, lenClosed = Lmax * (.52 - .12 * depth);
        var len = U.lerp(lenClosed, lenOpen, Math.min(1, o)) * (o > 1 ? 1 + (o - 1) * .3 : 1);
        var wid = (U.TAU * S * (.36 - .12 * depth) / k) * (1.25 - .25 * Math.min(1, o)) * (shape === 'pointed' ? 1.15 : 1);
        var base = coreR * (.25 + (1.05 + .15 * depth) * U.smooth((o - .5) / .5));
        var rot = U.at(seed, seg, j) * U.TAU + j * Math.PI / k + (1 - Math.min(1, o)) * .22 * (j % 2 ? 1 : -1) + b * .01 * (j % 2 ? 1 : -1);
        var col = pal.rings[Math.min(j, 4)], dark = U.rgb(U.mix(col, BG, .35)), light = U.rgb(U.mix(col, '#ffffff', .25));
        for (var i = 0; i < k; i++) {
          var a = rot + i * U.TAU / k;
          g.save(); g.translate(cx, cy); g.rotate(a); g.globalAlpha = alpha;
          // paper shadow cast toward the lower right
          g.save(); g.translate(3, 5); petalPath(g, len, wid, shape, base, i + j); g.fillStyle = 'rgba(4,8,22,.35)'; g.fill(); g.restore();
          petalPath(g, len, wid, shape, base, i + j);
          var gr = g.createLinearGradient(base, 0, base + len, 0); gr.addColorStop(0, dark); gr.addColorStop(.55, col); gr.addColorStop(1, light);
          g.fillStyle = gr; g.fill();
          // a fold crease down the petal and a lit edge
          g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(base + len * .08, 0); g.lineTo(base + len * .82, 0); g.stroke();
          g.restore();
        }
        g.globalAlpha = 1;
      }

      return {
        layout: function (w, h, safe) { W = w; H = h; var bw = w - safe.l - safe.r, bh = h - safe.t - safe.b; cx = safe.l + bw / 2; cy = safe.t + bh / 2; S = Math.min(bw, bh) * .43; },
        seed: function (s) { seed = s; pal = PALS[s % PALS.length]; },
        set: function (k, v) { if (k === 'rings') nRings = v; if (k === 'shape') shapeMode = v; if (k === 'open') openK = v; },
        events: events,
        draw: function (g, b) {
          g.fillStyle = BG; g.fillRect(0, 0, W, H);
          var vg = g.createRadialGradient(cx, cy, S * .2, cx, cy, Math.max(W, H) * .7); vg.addColorStop(0, 'rgba(48,62,110,.5)'); vg.addColorStop(1, 'rgba(6,10,26,.5)');
          g.fillStyle = vg; g.fillRect(0, 0, W, H);
          // core: the colour waiting in the middle
          var coreR = S * .17;
          g.fillStyle = pal.core; g.beginPath(); g.arc(cx, cy, coreR, 0, U.TAU); g.fill();
          g.fillStyle = pal.seed;
          for (var i = 0; i < 34; i++) { var a = i * 2.39996, rr = coreR * .82 * Math.sqrt((i + .5) / 34); g.beginPath(); g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, coreR * .045, 0, U.TAU); g.fill(); }
          // two-bar segments: shape/count swap while folded (beats 7.5–8.5 of each half)
          // swaps happen at beats 3 and 11 of each phrase, when the flower is folded
          var seg = Math.floor((b - 3) / 8), local = U.mod(b - 3, 8), mix = U.smooth(local / 1);
          for (var j = 0; j < nRings; j++) {
            if (local < 1) { drawRing(g, j, b, seg - 1, 1 - mix); drawRing(g, j, b, seg, mix); }
            else drawRing(g, j, b, seg, 1);
          }
          // bloom halo
          var inP = U.mod(b, PHR), bloom = inP < 2 ? 1 - U.smooth(inP / 2) : 0;
          if (bloom > .01) { g.strokeStyle = U.alpha(pal.core, .3 * bloom); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, S * (1.02 + .1 * (1 - bloom)), 0, U.TAU); g.stroke(); }
          U.grain(g, W, H, .12);
        },
        audio: function (T, chain) {
          var cel = V.bell(T, chain.bus, { harm: 4.01, index: 1.6, decay: .7, volume: -17 });
          var pl = V.pluck(T, chain.bus, { volume: -16, decay: .18, cutoff: 3600 });
          var mar = V.mallet(T, chain.bus, { volume: -11, harm: 3.99, index: 1.4, decay: .9 });
          var bass = V.bass(T, chain.dry, { volume: -13, cutoff: 420, sustain: .3 });
          var chord = V.soft(T, chain.bus, { volume: -20, attack: .02, sustain: .4, release: 2.2, cutoff: 3200 });
          var swell = V.noise(T, chain.bus, { volume: -32, cutoff: 6000, attack: 1.2, decay: .4, release: .9, color: 'white' });
          return {
            list: [cel, pl, mar, bass, chord, swell],
            play: function (e, t, spb) {
              var bar = BARS[e.bar == null ? 0 : e.bar], ch = bar[1];
              if (e.type === 'outer') { mar.triggerAttackRelease(U.mtof(ch[e.beat ? 1 : 0]), .4, t, .6); if (!e.beat) bass.triggerAttackRelease(U.mtof(bar[0] - 12), spb * 1.8, t, .7); }
              else if (e.type === 'middle') pl.triggerAttackRelease(U.mtof(ch[(e.n + 1) % 4] + 12), .1, t, .35);
              else if (e.type === 'inner') cel.triggerAttackRelease(U.mtof(ch[e.n % 4] + 24), .12, t, .18 + .08 * (e.n % 3));
              else if (e.type === 'rise') { cel.triggerAttackRelease(U.mtof(ch[e.step % 4] + 12 + (e.step > 1 ? 12 : 0)), .3, t, .3 + e.step * .06); if (e.step === 0) swell.triggerAttackRelease(spb * 2, t, .5); bass.triggerAttackRelease(U.mtof(e.step < 2 ? 43 : 45), spb * .5, t, .5); }
              else if (e.type === 'bloom' && e.p > 0) { chord.triggerAttackRelease([62, 66, 69, 73, 76].map(U.mtof), spb * 2.5, t, .55); mar.triggerAttackRelease(U.mtof(86), .8, t, .5); bass.triggerAttackRelease(U.mtof(38), spb * 2, t, .8); }
            }
          };
        }
      };
    }
  });
})();
