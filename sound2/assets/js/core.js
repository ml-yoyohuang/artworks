/* 接得剛剛好 — /sound2 shared exhibition core.
 *
 * One clock, one score. Each work exposes `events(b0, b1)`: a pure, seeded
 * function that returns the musical events inside a beat window. The same
 * function feeds two consumers:
 *   - the audio scheduler (Tone.Transport, one repeat every 16th note) which
 *     hands each event's exact audio time to the work's voices;
 *   - the frame loop, which reads the beat from the *audio* clock
 *     (Transport ticks at AudioContext.currentTime minus output latency) and
 *     dispatches `onEvent` when the drawn beat crosses an event.
 * Without audio, the same beat advances from a single visual clock.
 * requestAnimationFrame only draws; it never decides musical time.
 */
(function () {
  'use strict';

  var WORKS = [
    { id: '01-wave-relay', no: '01', zh: '快樂傳到下一個', en: 'Pass It On', kind: '波峰接力' },
    { id: '02-color-surfers', no: '02', zh: '今天的浪剛剛好', en: 'The Wave Is Just Right', kind: '色塊衝浪' },
    { id: '03-elastic-ensemble', no: '03', zh: '聲音有彈性', en: 'Sound Has Give', kind: '橡皮筋樂隊' },
    { id: '04-occasional-unison', no: '04', zh: '這一拍，我們一起', en: 'This Beat, Together', kind: '偶爾同步' },
    { id: '05-phrase-bows', no: '05', zh: '把旋律打個結', en: 'Tie the Tune', kind: '樂句蝴蝶結' },
    { id: '06-beat-pages', no: '06', zh: '每一拍都有另一面', en: 'Every Beat Has a Back', kind: '拍點翻頁' },
    { id: '07-wave-dialogue', no: '07', zh: '你唱一句，我回一句', en: 'You Sing, I Answer', kind: '波形問答' },
    { id: '08-late-wave', no: '08', zh: '等一下，我也要！', en: 'Wait, Me Too!', kind: '慢半拍的小波' },
    { id: '09-rhythm-rosette', no: '09', zh: '這一拍，開花', en: 'Bloom on the Beat', kind: '節奏花盤' },
    { id: '10-swing-waves', no: '10', zh: '走路也可以是一首歌', en: 'A Walk Is a Song', kind: '搖擺波形' }
  ];

  var TRACKS = [
    { id: 'carefree', title: 'Carefree', artist: 'Kevin MacLeod', src: 'assets/audio/carefree-kevin-macleod.mp3', bpm: 96,
      page: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037' },
    { id: 'electrodoodle', title: 'Electrodoodle', artist: 'Kevin MacLeod', src: 'assets/audio/electrodoodle-kevin-macleod.mp3', bpm: 120,
      page: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200079' }
  ];

  /* ---------------------------------------------------------------- utils */
  var U = {};
  U.TAU = Math.PI * 2;
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.inv = function (a, b, v) { return b === a ? 0 : (v - a) / (b - a); };
  U.sat = function (t) { return t < 0 ? 0 : t > 1 ? 1 : t; };
  U.smooth = function (t) { t = U.sat(t); return t * t * (3 - 2 * t); };
  U.smoother = function (t) { t = U.sat(t); return t * t * t * (t * (t * 6 - 15) + 10); };
  U.inOut = function (t) { t = U.sat(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  U.outCubic = function (t) { t = U.sat(t); return 1 - Math.pow(1 - t, 3); };
  U.inCubic = function (t) { t = U.sat(t); return t * t * t; };
  U.outBack = function (t, s) { t = U.sat(t); s = s == null ? 1.7 : s; var u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
  U.window = function (t, a, b) { return t >= a && t < b; };
  /* Phase 0..1 inside [a,b], clamped. */
  U.seg = function (t, a, b) { return U.sat((t - a) / (b - a)); };
  /* Analytic damped oscillation after an impulse at t=0 (t in beats or s). */
  U.ring = function (t, freq, decay) { return t < 0 ? 0 : Math.exp(-decay * t) * Math.sin(U.TAU * freq * t); };
  /* Smooth attack/decay envelope shaped like a struck note. */
  U.env = function (t, attack, decay) { if (t < 0) return 0; if (t < attack) return U.smooth(t / attack); return Math.exp(-(t - attack) / decay); };
  U.gauss = function (x, w) { return Math.exp(-(x * x) / (2 * w * w)); };
  U.mod = function (a, n) { return ((a % n) + n) % n; };
  U.hash = function (str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  U.rng = function (seed) {
    var a = (seed >>> 0) || 1;
    var f = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.range = function (a, b) { return a + (b - a) * f(); };
    f.int = function (a, b) { return Math.floor(a + (b - a + 1) * f()); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    f.chance = function (p) { return f() < p; };
    f.shuffle = function (arr) { var r = arr.slice(); for (var i = r.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var x = r[i]; r[i] = r[j]; r[j] = x; } return r; };
    return f;
  };
  /* Deterministic noise for a (seed, integer) pair: score decisions per bar. */
  U.at = function (seed, n, salt) { return U.rng((seed * 9973 + n * 7919 + (salt || 0) * 104729) >>> 0)(); };
  U.mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  U.hex = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  U.rgb = function (c, a) { return a == null || a >= 1 ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')'; };
  U.mix = function (a, b, t) { var A = typeof a === 'string' ? U.hex(a) : a, B = typeof b === 'string' ? U.hex(b) : b; return [U.lerp(A[0], B[0], t), U.lerp(A[1], B[1], t), U.lerp(A[2], B[2], t)]; };
  U.col = function (a, b, t, alpha) { return U.rgb(U.mix(a, b, t), alpha); };
  U.alpha = function (h, a) { return U.rgb(U.hex(h), a); };
  /* Centripetal-ish Catmull-Rom through points, `n` samples per span. */
  U.spline = function (P, n, closed) {
    var out = [], L = P.length, spans = closed ? L : L - 1;
    for (var i = 0; i < spans; i++) {
      var p0 = P[closed ? U.mod(i - 1, L) : Math.max(i - 1, 0)], p1 = P[i % L], p2 = P[(i + 1) % L], p3 = P[closed ? (i + 2) % L : Math.min(i + 2, L - 1)];
      for (var j = 0; j < n; j++) {
        var t = j / n, t2 = t * t, t3 = t2 * t, o = {};
        for (var k in p1) if (typeof p1[k] === 'number') o[k] = .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        out.push(o);
      }
    }
    if (!closed) { var last = {}; for (var q in P[L - 1]) last[q] = P[L - 1][q]; out.push(last); }
    return out;
  };
  /* Arc-length table for a polyline: returns cumulative lengths. */
  U.arc = function (pts) { var s = [0]; for (var i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)); return s; };
  /* Point & tangent at arc fraction u along a polyline with arc table. */
  U.along = function (pts, S, u) {
    var L = S[S.length - 1], d = U.clamp(u, 0, 1) * L, lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (S[m] < d) lo = m; else hi = m; }
    var a = pts[lo], b = pts[hi], seg = S[hi] - S[lo] || 1, t = (d - S[lo]) / seg, tx = (b.x - a.x) / seg, ty = (b.y - a.y) / seg;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: tx, ty: ty, nx: -ty, ny: tx };
  };
  /* Fill a variable-width stroke (ribbon) along points with widths w[i]. */
  U.band = function (g, pts, w, capRound) {
    var n = pts.length; if (n < 2) return;
    var L = [], R = [];
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, hw = (typeof w === 'number' ? w : w[i]) / 2;
      L.push(pts[i].x + nx * hw, pts[i].y + ny * hw); R.push(pts[i].x - nx * hw, pts[i].y - ny * hw);
    }
    g.beginPath(); g.moveTo(L[0], L[1]);
    for (var j = 2; j < L.length; j += 2) g.lineTo(L[j], L[j + 1]);
    if (capRound) { var e = pts[n - 1], we = (typeof w === 'number' ? w : w[n - 1]) / 2, ae = Math.atan2(L[L.length - 1] - e.y, L[L.length - 2] - e.x); g.arc(e.x, e.y, we, ae, ae - Math.PI, true); }
    for (var k = R.length - 2; k >= 0; k -= 2) g.lineTo(R[k], R[k + 1]);
    if (capRound) { var s = pts[0], ws = (typeof w === 'number' ? w : w[0]) / 2, as = Math.atan2(R[1] - s.y, R[0] - s.x); g.arc(s.x, s.y, ws, as, as - Math.PI, true); }
    g.closePath(); g.fill();
  };
  U.poly = function (g, pts, close) { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); if (close) g.closePath(); };
  /* Paper grain: a cached tile of soft noise, drawn with low alpha. */
  var grainTile = null;
  U.grain = function (g, w, h, alpha) {
    if (!grainTile) {
      grainTile = document.createElement('canvas'); grainTile.width = grainTile.height = 160;
      var x = grainTile.getContext('2d'), id = x.createImageData(160, 160), r = U.rng(7);
      for (var i = 0; i < id.data.length; i += 4) { var v = 110 + r() * 145; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = r() * 70; }
      x.putImageData(id, 0, 0);
    }
    g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(grainTile, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
  };

  /* ------------------------------------------------------------- voices */
  /* Small instrument presets shared by works; each work still chooses its own
   * registers, rhythms and envelopes. All are PolySynths with low polyphony. */
  var V = {};
  V.mallet = function (T, out, o) {
    o = o || {};
    return new T.PolySynth(T.FMSynth, { maxPolyphony: o.poly || 8, volume: o.volume == null ? -10 : o.volume,
      options: { harmonicity: o.harm || 4, modulationIndex: o.index || 2.2, oscillator: { type: 'sine' }, modulation: { type: 'sine' },
        envelope: { attack: .002, decay: o.decay || .7, sustain: 0, release: o.release || .6 },
        modulationEnvelope: { attack: .002, decay: o.mdecay || .12, sustain: 0, release: .2 } } }).connect(out);
  };
  V.bell = function (T, out, o) {
    o = o || {};
    return new T.PolySynth(T.FMSynth, { maxPolyphony: o.poly || 6, volume: o.volume == null ? -16 : o.volume,
      options: { harmonicity: o.harm || 3.5, modulationIndex: o.index || 5, oscillator: { type: 'sine' }, modulation: { type: 'sine' },
        envelope: { attack: .003, decay: o.decay || 1.6, sustain: 0, release: 1.2 },
        modulationEnvelope: { attack: .002, decay: o.mdecay || .5, sustain: .1, release: .8 } } }).connect(out);
  };
  V.pluck = function (T, out, o) {
    o = o || {};
    var f = new T.Filter({ frequency: o.cutoff || 2600, type: 'lowpass', rolloff: -12 }).connect(out);
    var s = new T.PolySynth(T.Synth, { maxPolyphony: o.poly || 8, volume: o.volume == null ? -12 : o.volume,
      options: { oscillator: { type: o.wave || 'triangle' }, envelope: { attack: .003, decay: o.decay || .28, sustain: o.sustain || 0, release: o.release || .25 } } }).connect(f);
    s._s2extra = [f];
    return s;
  };
  V.soft = function (T, out, o) {
    o = o || {};
    var f = new T.Filter({ frequency: o.cutoff || 1800, type: 'lowpass', rolloff: -24 }).connect(out);
    var s = new T.PolySynth(T.Synth, { maxPolyphony: o.poly || 6, volume: o.volume == null ? -16 : o.volume,
      options: { oscillator: { type: o.wave || 'fattriangle', count: 2, spread: 14 }, envelope: { attack: o.attack || .25, decay: .3, sustain: o.sustain == null ? .7 : o.sustain, release: o.release || 1.6 } } }).connect(f);
    s._s2extra = [f];
    return s;
  };
  V.bass = function (T, out, o) {
    o = o || {};
    var f = new T.Filter({ frequency: o.cutoff || 520, type: 'lowpass', rolloff: -24 }).connect(out);
    var s = new T.PolySynth(T.Synth, { maxPolyphony: 3, volume: o.volume == null ? -10 : o.volume,
      options: { oscillator: { type: o.wave || 'triangle' }, envelope: { attack: .008, decay: o.decay || .5, sustain: o.sustain == null ? .25 : o.sustain, release: o.release || .35 } } }).connect(f);
    s._s2extra = [f];
    return s;
  };
  V.drum = function (T, out, o) {
    o = o || {};
    return new T.MembraneSynth({ volume: o.volume == null ? -14 : o.volume, pitchDecay: o.pitchDecay || .03, octaves: o.octaves || 4,
      envelope: { attack: .001, decay: o.decay || .3, sustain: 0, release: .2 } }).connect(out);
  };
  V.noise = function (T, out, o) {
    o = o || {};
    var f = new T.Filter({ frequency: o.cutoff || 6000, type: o.type || 'highpass' }).connect(out);
    var s = new T.NoiseSynth({ volume: o.volume == null ? -26 : o.volume, noise: { type: o.color || 'pink' },
      envelope: { attack: o.attack || .001, decay: o.decay || .05, sustain: 0, release: o.release || .03 } }).connect(f);
    s._s2extra = [f];
    return s;
  };
  V.wood = function (T, out, o) {
    o = o || {};
    return new T.PolySynth(T.FMSynth, { maxPolyphony: 4, volume: o.volume == null ? -14 : o.volume,
      options: { harmonicity: 1.5, modulationIndex: 8, oscillator: { type: 'sine' }, modulation: { type: 'square' },
        envelope: { attack: .001, decay: o.decay || .07, sustain: 0, release: .05 },
        modulationEnvelope: { attack: .001, decay: .03, sustain: 0, release: .02 } } }).connect(out);
  };
  V.release = function (list, time) { list.forEach(function (v) { if (v && v.releaseAll) try { v.releaseAll(time); } catch (e) { } }); };
  V.dispose = function (list) { list.forEach(function (v) { if (!v) return; (v._s2extra || []).forEach(function (x) { try { x.dispose(); } catch (e) { } }); try { v.dispose(); } catch (e) { } }); };

  /* ------------------------------------------------- beat estimation (tracks) */
  /* A plain onset-energy analysis: frame energy rise (low + full band),
   * autocorrelation for tempo (or confirm a catalogue BPM) and a comb search
   * for the beat phase. It is an estimate of a beat grid, not an
   * understanding of the music's phrases or harmony. */
  function analyseBeat(buffer, hintBpm) {
    var sr = buffer.sampleRate, ch0 = buffer.getChannelData(0), ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
    var hop = 512, maxFrames = Math.min(Math.floor(ch0.length / hop), Math.floor(90 * sr / hop));
    var env = new Float32Array(maxFrames), prev = 0, lp = 0, prevLow = 0;
    for (var f = 0; f < maxFrames; f++) {
      var e = 0, el = 0;
      for (var i = f * hop, end = i + hop; i < end; i++) { var s = (ch0[i] + ch1[i]) * .5; lp += (s - lp) * .02; e += s * s; el += lp * lp; }
      var le = Math.log(1e-6 + e), ll = Math.log(1e-6 + el);
      env[f] = Math.max(0, le - prev) + 1.4 * Math.max(0, ll - prevLow); prev = le; prevLow = ll;
    }
    var fps = sr / hop, best = { score: -1, bpm: hintBpm || 120 };
    var lo = hintBpm ? hintBpm * .97 : 70, hi = hintBpm ? hintBpm * 1.03 : 180;
    for (var bpm = lo; bpm <= hi; bpm += .1) {
      var lag = fps * 60 / bpm, sc = 0, l0 = Math.floor(lag), fr = lag - l0;
      for (var k = 0; k + l0 + 1 < maxFrames; k++) sc += env[k] * (env[k + l0] * (1 - fr) + env[k + l0 + 1] * fr);
      if (sc > best.score) best = { score: sc, bpm: bpm };
    }
    var period = fps * 60 / best.bpm, phaseBest = 0, phaseScore = -1;
    for (var p = 0; p < period; p += .25) {
      var ps = 0;
      for (var b = p; b < maxFrames - 1; b += period) { var bi = Math.floor(b); ps += env[bi] + .5 * env[bi + 1]; }
      if (ps > phaseScore) { phaseScore = ps; phaseBest = p; }
    }
    return { bpm: Math.round(best.bpm * 10) / 10, offset: phaseBest / fps, period: 60 / best.bpm };
  }

  /* --------------------------------------------------------------- shell */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var Sound2 = { works: WORKS, tracks: TRACKS, U: U, V: V, analyseBeat: analyseBeat };
  window.Sound2 = Sound2;

  Sound2.start = function (def) {
    var meta = WORKS.filter(function (w) { return w.id === def.id; })[0];
    var idx = WORKS.indexOf(meta), prev = WORKS[(idx + WORKS.length - 1) % WORKS.length], next = WORKS[(idx + 1) % WORKS.length];
    var root = document.documentElement, body = document.body;
    root.style.setProperty('--bg', def.bg); root.style.setProperty('--fg', def.fg); root.style.setProperty('--accent', def.accent);
    root.style.setProperty('--panel', def.panel || (def.dark ? 'rgba(14,14,16,.72)' : 'rgba(255,255,255,.72)'));
    body.classList.add('s2-work'); if (def.dark) body.classList.add('s2-dark');

    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var query = new URLSearchParams(location.search);
    var seed = parseInt(query.get('seed'), 10); if (!(seed > 0)) seed = def.seed || (1 + Math.floor(Math.random() * 9998));

    /* --- DOM */
    var stage = el('main', 's2-stage'); stage.id = 'stage';
    var canvas = el('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', meta.zh + '：' + def.alt); canvas.tabIndex = 0;
    stage.appendChild(canvas);
    var top = el('header', 's2-top');
    top.innerHTML = '<div class="s2-title"><span class="s2-no">' + meta.no + '<i>/10</i></span><div><h1>' + meta.zh + '</h1><p class="s2-en">' + meta.kind + ' · <em>' + meta.en + '</em></p></div></div>' +
      '<nav class="s2-nav" aria-label="作品導覽"><a href="' + prev.id + '.html" rel="prev" title="上一件：' + prev.zh + '">← <span>上一件</span></a><a href="./" class="s2-home">目錄</a><a href="' + next.id + '.html" rel="next" title="下一件：' + next.zh + '"><span>下一件</span> →</a></nav>';
    var lede = el('p', 's2-lede', def.lede);
    var bar = el('div', 's2-bar'); bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', '作品控制');
    bar.innerHTML =
      '<button class="s2-sound primary" id="s2-sound" aria-pressed="false"><b class="s2-ico">▶</b><span>開啟聲音</span></button>' +
      '<button id="s2-pause" aria-pressed="false" title="暫停／繼續（空白鍵）"><b class="s2-ico">❙❙</b><span>暫停</span></button>' +
      '<label class="s2-vol" title="音量"><span class="s2-vis">音量</span><b class="s2-ico" aria-hidden="true">◔</b><input id="s2-volume" type="range" min="0" max="1" step="0.01" value="0.65" aria-label="音量"></label>' +
      '<button id="s2-seed" title="換一個構圖（R）"><b class="s2-ico">↻</b><span>換一個</span></button>' +
      '<button id="s2-tune" aria-expanded="false" aria-controls="s2-params" title="調整參數"><b class="s2-ico">≋</b><span>調整</span></button>' +
      '<button id="s2-save" title="保存畫面為 PNG（S）"><b class="s2-ico">⤓</b><span>存圖</span></button>' +
      '<button id="s2-info" aria-expanded="false" aria-controls="s2-about" title="關於這件作品"><b class="s2-ico">i</b><span>關於</span></button>' +
      '<button id="s2-hide" title="隱藏介面（H）"><b class="s2-ico">◐</b><span>專心看</span></button>';
    var status = el('p', 's2-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    var params = el('aside', 's2-panel'); params.id = 's2-params'; params.hidden = true; params.setAttribute('aria-label', '參數');
    var about = el('aside', 's2-panel s2-about'); about.id = 's2-about'; about.hidden = true; about.setAttribute('aria-label', '關於作品');
    var show = el('button', 's2-show', '顯示介面'); show.title = '顯示介面（H）';
    [stage, top, lede, bar, status, params, about, show].forEach(function (n) { body.appendChild(n); });

    var g = canvas.getContext('2d');
    var api, work;
    var S = {
      seed: seed, beat: def.startBeat || 0, bpm: def.bpm, playing: !reduced, audio: 'off', muted: false, volume: .65,
      source: 'score', frames: 0, notes: 0, events: 0, repeats: 0, quality: 1, dpr: 1, W: 0, H: 0, fadeT: 0,
      track: null, trackInfo: null, err: null, schedLog: [], dispatchLag: []
    };
    var values = {};
    (def.params || []).forEach(function (p) { values[p.key] = p.value; });

    /* --- audio state */
    var T = null, Transport = null, chain = null, voices = null, repeatId = null, schedEnd = 0, guardUntil = 0;
    var PPQ = 192, STEP = 48;
    var player = null, trackGain = null, trackT0 = 0, trackPos = 0, analyser = null;

    var userEvents = [];
    function horizon() { return S.audio === 'on' && S.source === 'score' && S.playing ? Math.max(schedEnd, S.beat) : S.beat; }

    api = {
      U: U, V: V, values: values, reduced: reduced,
      get W() { return S.W; }, get H() { return S.H; }, get safe() { return safe; }, get seed() { return S.seed; },
      get beat() { return S.beat; }, get bpm() { return S.bpm; }, get quality() { return S.quality; },
      get motion() { return reduced ? .45 : 1; }, get audioOn() { return S.audio === 'on' && !S.muted; },
      get level() { return analyserLevel(); },
      /* Next grid beat that the scheduler has not yet passed. */
      nextBeat: function (div) { div = div || 1; var h = horizon() + .03; return Math.ceil(h / div) * div; },
      /* Add a one-off score event (both heard and drawn). */
      add: function (e) { userEvents.push(e); if (userEvents.length > 64) userEvents.splice(0, userEvents.length - 64); return e; },
      userEvents: function (b0, b1, out) { for (var i = 0; i < userEvents.length; i++) { var e = userEvents[i]; if (e.b >= b0 && e.b < b1) out.push(e); } return out; },
      toast: function (m) { say(m); },
      crossfade: function () { snapshot(); }
    };
    var safe = { t: 80, r: 24, b: 96, l: 24 };

    work = def.create(api);

    /* --- layout */
    var fadeCanvas = document.createElement('canvas'), fadeCtx = fadeCanvas.getContext('2d');
    function resize() {
      var r = stage.getBoundingClientRect(), W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
      var dpr = Math.min(window.devicePixelRatio || 1, S.quality < 1 ? 1.25 : 2);
      S.W = W; S.H = H; S.dpr = dpr;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      var mobile = W < 720;
      safe = { t: mobile ? 92 : W >= 1100 ? 150 : 96, r: mobile ? 18 : 40, b: mobile ? 132 : 104, l: mobile ? 18 : 40 };
      if (body.classList.contains('s2-hidden')) safe = { t: safe.t * .6, r: safe.r, b: safe.b * .45, l: safe.l };
      if (work.layout) work.layout(W, H, safe);
    }
    var resizeTimer = 0;
    window.addEventListener('resize', function () { snapshot(); clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 60); resize(); });

    function snapshot() {
      if (!canvas.width) return;
      fadeCanvas.width = canvas.width; fadeCanvas.height = canvas.height;
      fadeCtx.drawImage(canvas, 0, 0); S.fadeT = 1; S.fadeW = S.W; S.fadeH = S.H;
    }

    /* --- status line */
    var sayTimer = 0;
    function baseStatus() {
      var src = S.source === 'score' ? '原創生成樂譜' : S.source === 'file' ? '本地音檔' : (S.trackInfo ? S.trackInfo.title + ' — ' + S.trackInfo.artist : '外部曲目');
      var a = S.audio === 'on' ? (S.muted ? '靜音中' : '聲音開') : S.audio === 'failed' ? '純視覺（聲音無法啟動）' : S.audio === 'starting' ? '聲音啟動中…' : '靜音預覽';
      return a + ' · ' + src + ' · seed ' + S.seed + (S.source === 'score' ? ' · ' + Math.round(S.bpm) + ' BPM' : '');
    }
    function say(m, ms) { status.textContent = m; clearTimeout(sayTimer); sayTimer = setTimeout(function () { status.textContent = baseStatus(); }, ms || 4200); }
    function refresh() {
      var sb = $('#s2-sound');
      var on = S.audio === 'on' && !S.muted;
      sb.setAttribute('aria-pressed', on ? 'true' : 'false');
      sb.querySelector('span').textContent = S.audio === 'on' ? (S.muted ? '聲音已關' : '聲音開') : S.audio === 'starting' ? '啟動中…' : '開啟聲音';
      sb.querySelector('.s2-ico').textContent = S.audio === 'on' ? (S.muted ? '♪̸' : '♪') : '▶';
      sb.classList.toggle('on', on);
      var pb = $('#s2-pause');
      pb.setAttribute('aria-pressed', S.playing ? 'false' : 'true');
      pb.querySelector('span').textContent = S.playing ? '暫停' : '繼續';
      pb.querySelector('.s2-ico').textContent = S.playing ? '❙❙' : '▶';
      if (!sayTimer || status.textContent === '') status.textContent = baseStatus();
      var tempo = params.querySelector('[data-key="__tempo"]'); if (tempo) tempo.disabled = S.source !== 'score';
    }
    function $(s) { return document.querySelector(s); }

    /* --- audio */
    function buildChain() {
      var master = new T.Gain(0).toDestination();
      var limiter = new T.Limiter(-4).connect(master);
      var comp = new T.Compressor({ threshold: -20, ratio: 3, attack: .01, release: .2 }).connect(limiter);
      var verb = new T.Reverb({ decay: def.reverb || 2.6, preDelay: .02, wet: 1 }).connect(comp);
      var send = new T.Gain(def.wet == null ? .22 : def.wet).connect(verb);
      var bus = new T.Gain(1); bus.connect(comp); bus.connect(send);
      var dry = new T.Gain(1).connect(comp);
      analyser = new T.Analyser('waveform', 512); master.connect(analyser);
      return { master: master, limiter: limiter, comp: comp, verb: verb, send: send, bus: bus, dry: dry, list: [master, limiter, comp, verb, send, bus, dry, analyser] };
    }
    function targetGain() { return S.muted ? 0 : Math.pow(S.volume, 2) * .95; }
    function rampMaster() { if (chain) chain.master.gain.rampTo(targetGain(), .12); }

    function startAudio() {
      if (S.audio === 'on' || S.audio === 'starting') return Promise.resolve();
      if (!window.Tone) { S.audio = 'failed'; refresh(); say('聲音元件沒有載入；作品以純視覺繼續。'); return Promise.resolve(); }
      S.audio = 'starting'; refresh();
      T = window.Tone;
      return T.start().then(function () {
        var ctx = T.getContext(); ctx.lookAhead = .08;
        if (ctx.state !== 'running') throw new Error('context ' + ctx.state);
        Transport = T.getTransport();
        chain = buildChain();
        voices = work.audio(T, chain, api);
        S.audio = 'on';
        if (S.source === 'score') beginScore();
        rampMaster();
        if (!S.playing) { S.playing = true; }
        refresh(); say('聲音已開啟。作品的畫面與聲音共用同一份樂譜時間。');
      }).catch(function (err) {
        S.audio = 'failed'; S.err = String(err && err.message || err); refresh();
        say('聲音無法啟動（' + S.err + '）。作品以純視覺繼續。', 7000);
      });
    }
    function beginScore() {
      Transport.cancel(); Transport.stop();
      Transport.bpm.value = S.bpm;
      var startTick = Math.ceil(S.beat * 4) * STEP;
      Transport.ticks = startTick;
      S.beat = startTick / PPQ; lastBeat = S.beat;
      repeatId = Transport.scheduleRepeat(onStep, STEP + 'i', 0); S.repeats++;
      guardUntil = T.getContext().currentTime + T.getContext().lookAhead + .06;
      if (S.playing) Transport.start('+0.04');
    }
    function endScore() {
      if (!Transport) return;
      if (repeatId != null) { Transport.clear(repeatId); repeatId = null; S.repeats--; }
      Transport.pause(); Transport.cancel(0);
      V.release(voices ? voices.list || [] : [], T.now());
    }
    function onStep(time) {
      try {
        var t0 = Math.round(Transport.getTicksAtTime(time) / STEP) * STEP, b0 = t0 / PPQ, b1 = (t0 + STEP) / PPQ;
        schedEnd = b1;
        var spb = 60 / Transport.bpm.getValueAtTime(time), evs = work.events(b0, b1);
        for (var i = 0; i < evs.length; i++) {
          var e = evs[i]; if (e.b < b0 || e.b >= b1 || e.audio === false) continue;
          var at = time + (e.b - b0) * spb;
          voices.play(e, at, spb); S.notes++;
          // QA: where the transport actually is at this note's audio time
          if (S.schedLog.length < 400) S.schedLog.push({ b: e.b, at: at, tb: Transport.getTicksAtTime(at) / PPQ });
        }
      } catch (err) { S.err = String(err); }
    }
    function audioBeat() {
      var ctx = T.getContext(), raw = ctx.rawContext || ctx, lat = (raw.outputLatency || 0);
      var now = ctx.currentTime - lat;
      if (S.source === 'score') {
        if (now < guardUntil) return S.beat;
        return Transport.getTicksAtTime(now) / PPQ;
      }
      if (!player) return S.beat;
      var info = S.trackInfo, pos = S.playing ? (now - trackT0) : trackPos;
      return (pos - info.offset) * info.bpm / 60;
    }
    function analyserLevel() {
      if (!analyser || S.audio !== 'on') return 0;
      var v = analyser.getValue(), s = 0; for (var i = 0; i < v.length; i += 4) s += v[i] * v[i];
      return Math.sqrt(s / (v.length / 4));
    }

    /* --- external track mode */
    function stopTrack(keepPos) {
      if (!player) return;
      if (keepPos) trackPos = T.getContext().currentTime - trackT0;
      player.onstop = function () { };
      try { player.stop(); } catch (e) { }
    }
    function playTrackFrom(pos) {
      var ctx = T.getContext();
      player.onstop = function () { if (S.playing && S.source !== 'score') { trackPos = 0; snapshot(); playTrackFrom(0); } };
      trackT0 = ctx.currentTime + .05 - pos;
      player.start('+0.05', Math.max(0, pos));
    }
    function useSource(id, file) {
      return startAudio().then(function () {
        if (S.audio !== 'on') return;
        if (id === 'score') {
          stopTrack(false); if (player) { player.dispose(); player = null; }
          S.source = 'score'; S.trackInfo = null; snapshot(); S.beat = 0; lastBeat = 0; beginScore(); refresh(); say('回到原創生成樂譜。');
          return;
        }
        endScore();
        var meta = TRACKS.filter(function (t) { return t.id === id; })[0];
        say('正在載入與分析音檔…', 20000);
        var getBuf = file ? file.arrayBuffer().then(function (ab) { return T.getContext().decodeAudioData(ab); })
          : fetch(meta.src).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(function (ab) { return T.getContext().decodeAudioData(ab); });
        return getBuf.then(function (buf) {
          var est = analyseBeat(buf, meta ? meta.bpm : null);
          stopTrack(false); if (player) player.dispose();
          if (!trackGain) trackGain = new T.Gain(.8).connect(chain.comp);
          player = new T.Player(buf).connect(trackGain); player.playbackRate = 1;
          S.trackInfo = { title: meta ? meta.title : file.name, artist: meta ? meta.artist : '本地檔案', bpm: meta ? meta.bpm : est.bpm, offset: est.offset, estBpm: est.bpm, duration: buf.duration };
          S.source = file ? 'file' : 'track';
          snapshot(); S.playing = true; playTrackFrom(0); lastBeat = -999;
          refresh();
          say((meta ? '目錄 BPM ' + meta.bpm + '，分析估測 ' + est.bpm : '估測 ' + est.bpm + ' BPM') + '，第一拍約在 ' + est.offset.toFixed(2) + ' 秒。畫面依此節拍格線運動，音樂原樣播放。', 9000);
        });
      }).catch(function (err) { say('音檔無法使用（' + (err && err.message || err) + '），已回到原創樂譜。', 7000); useSource('score'); });
    }

    /* --- transport controls */
    function setPlaying(p) {
      if (p === S.playing) return;
      S.playing = p;
      if (S.audio === 'on') {
        if (S.source === 'score') {
          if (p) { guardUntil = T.getContext().currentTime + T.getContext().lookAhead; Transport.start('+0.03'); }
          else { Transport.pause(); V.release(voices.list || [], T.now()); }
        } else if (player) {
          if (p) playTrackFrom(trackPos); else stopTrack(true);
        }
      }
      refresh();
    }
    function setBpm(v) {
      S.bpm = v;
      if (Transport) Transport.bpm.rampTo(v, .2);
      refresh();
    }
    function reseed(s) {
      snapshot();
      S.seed = s || (1 + Math.floor(Math.random() * 9998));
      if (work.seed) work.seed(S.seed);
      try { var q = new URLSearchParams(location.search); q.set('seed', S.seed); history.replaceState(null, '', location.pathname + '?' + q.toString()); } catch (e) { }
      say('新的構圖：seed ' + S.seed + '。網址已記下這個版本。');
      aboutSeed();
    }

    /* --- panels */
    function buildParams() {
      var html = '<h2>調整</h2>';
      (def.params || []).forEach(function (p) {
        if (p.type === 'select') {
          html += '<fieldset data-key="' + p.key + '"><legend>' + p.label + '</legend><div class="s2-seg">' +
            p.options.map(function (o) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (values[p.key] === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>' + (p.note ? '<small>' + p.note + '</small>' : '') + '</fieldset>';
        } else {
          html += '<label class="s2-range"><span>' + p.label + '<output>' + fmt(p, values[p.key]) + '</output></span><input type="range" data-key="' + p.key + '" min="' + p.min + '" max="' + p.max + '" step="' + (p.step || .01) + '" value="' + values[p.key] + '">' + (p.note ? '<small>' + p.note + '</small>' : '') + '</label>';
        }
      });
      if (def.tempo !== false) html += '<label class="s2-range"><span>速度<output>' + Math.round(S.bpm) + ' BPM</output></span><input type="range" data-key="__tempo" min="' + (def.tempoMin || 70) + '" max="' + (def.tempoMax || 140) + '" step="1" value="' + S.bpm + '"></label>';
      html += '<div class="s2-row"><button type="button" id="s2-reset">還原預設</button></div>';
      params.innerHTML = html;
      params.querySelectorAll('fieldset').forEach(function (fs) {
        fs.addEventListener('click', function (ev) {
          var b = ev.target.closest('button'); if (!b) return;
          var key = fs.getAttribute('data-key'), p = def.params.filter(function (q) { return q.key === key; })[0];
          var v = b.getAttribute('data-v'); if (typeof p.value === 'number') v = +v;
          setParam(key, v);
        });
      });
      params.querySelectorAll('input[type=range]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var key = inp.getAttribute('data-key'), v = +inp.value;
          if (key === '__tempo') { setBpm(v); inp.previousElementSibling.querySelector('output').textContent = v + ' BPM'; return; }
          setParam(key, v, true);
        });
      });
      $('#s2-reset').addEventListener('click', function () {
        snapshot();
        (def.params || []).forEach(function (p) { setParam(p.key, p.value, false, true); });
        setBpm(def.bpm); buildParams(); say('已還原預設。');
      });
    }
    function fmt(p, v) { return p.format ? p.format(v) : (Math.round(v * 100) / 100); }
    function setParam(key, v, live, quiet) {
      var p = (def.params || []).filter(function (q) { return q.key === key; })[0];
      if (!live && !quiet) snapshot();
      values[key] = v;
      if (work.set) work.set(key, v);
      var fs = params.querySelector('fieldset[data-key="' + key + '"]');
      if (fs) fs.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') == v)); });
      var inp = params.querySelector('input[data-key="' + key + '"]');
      if (inp) { inp.value = v; inp.previousElementSibling.querySelector('output').textContent = fmt(p, v); }
    }
    function aboutSeed() { var s = about.querySelector('.s2-seedline'); if (s) s.textContent = 'seed ' + S.seed + ' · 網址加上 ?seed=' + S.seed + ' 即可重現'; }
    function buildAbout() {
      var credits = TRACKS.map(function (t) { return '<li><b>' + t.title + '</b> Kevin MacLeod (incompetech.com)<br>Licensed under Creative Commons: By Attribution 4.0<br><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">creativecommons.org/licenses/by/4.0/</a> · <a href="' + t.page + '" target="_blank" rel="noopener">曲目頁</a></li>'; }).join('');
      about.innerHTML = '<h2>' + meta.zh + '</h2><p class="s2-about-en">' + meta.en + '</p>' + def.about +
        '<p class="s2-how">' + def.how + '</p>' +
        '<fieldset class="s2-source"><legend>音源</legend><div class="s2-seg">' +
        '<button type="button" data-src="score" aria-pressed="true">原創生成樂譜</button>' +
        TRACKS.map(function (t) { return '<button type="button" data-src="' + t.id + '" aria-pressed="false">' + t.title + '</button>'; }).join('') +
        '<label class="s2-file"><input type="file" accept="audio/*">本地音檔…</label></div>' +
        '<small>預設是為這件作品寫的原創生成配樂。外部曲目原樣播放（播放速率 1、不剪輯），畫面依自動估測的節拍格線運動；本地檔案只在你的瀏覽器裡解碼，不會上傳。</small></fieldset>' +
        '<h3>音樂署名</h3><p class="s2-small">原創生成配樂：本作品的樂譜程式與即時合成（Tone.js 15.0.4，MIT）。</p><ul class="s2-credits">' + credits + '</ul>' +
        '<p class="s2-small s2-seedline"></p><p class="s2-small">鍵盤：空白鍵 暫停／繼續 · M 聲音 · R 換一個 · S 存圖 · H 隱藏介面</p>';
      aboutSeed();
      about.querySelector('.s2-source').addEventListener('click', function (ev) {
        var b = ev.target.closest('button'); if (!b) return;
        about.querySelectorAll('.s2-source button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        useSource(b.getAttribute('data-src'));
      });
      about.querySelector('.s2-file input').addEventListener('change', function (ev) {
        var f = ev.target.files && ev.target.files[0]; if (!f) return;
        about.querySelectorAll('.s2-source button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        useSource('file', f);
      });
    }
    function toggle(panel, btn) {
      var open = panel.hidden;
      [params, about].forEach(function (p) { p.hidden = true; }); $('#s2-tune').setAttribute('aria-expanded', 'false'); $('#s2-info').setAttribute('aria-expanded', 'false');
      panel.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    }

    /* --- export */
    function savePng() {
      var name = 'sound2-' + def.id + '-seed' + S.seed + '-beat' + Math.floor(S.beat) + '.png';
      var done = function (blob) {
        if (!blob) { say('這個瀏覽器無法匯出畫面。'); return; }
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        Sound2.lastExport = { name: name, size: blob.size };
        say('已保存 ' + name);
      };
      try { canvas.toBlob(done, 'image/png'); } catch (e) { say('匯出失敗：' + e.message); }
    }

    /* --- events wiring */
    $('#s2-sound').addEventListener('click', function () {
      if (S.audio === 'on') { S.muted = !S.muted; rampMaster(); refresh(); say(S.muted ? '聲音已關；畫面與樂譜時間照常進行。' : '聲音開。'); }
      else if (S.audio === 'failed') { S.audio = 'off'; startAudio(); }
      else startAudio();
    });
    $('#s2-pause').addEventListener('click', function () { setPlaying(!S.playing); });
    $('#s2-volume').addEventListener('input', function (e) { S.volume = +e.target.value; if (S.muted && S.volume > 0) { S.muted = false; refresh(); } rampMaster(); });
    $('#s2-seed').addEventListener('click', function () { reseed(); });
    $('#s2-tune').addEventListener('click', function () { toggle(params, $('#s2-tune')); });
    $('#s2-info').addEventListener('click', function () { toggle(about, $('#s2-info')); });
    $('#s2-save').addEventListener('click', savePng);
    function setHidden(h) { body.classList.toggle('s2-hidden', h); if (h) { params.hidden = about.hidden = true; } resize(); if (!h) $('#s2-hide').focus(); else show.focus(); }
    $('#s2-hide').addEventListener('click', function () { setHidden(true); });
    show.addEventListener('click', function () { setHidden(false); });
    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'range') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key.toLowerCase();
      if (k === ' ' && (e.target === document.body || e.target === canvas)) { e.preventDefault(); setPlaying(!S.playing); }
      else if (k === 'h') setHidden(!body.classList.contains('s2-hidden'));
      else if (k === 's') savePng();
      else if (k === 'r') reseed();
      else if (k === 'm') $('#s2-sound').click();
      else if (k === 'escape') { params.hidden = about.hidden = true; if (body.classList.contains('s2-hidden')) setHidden(false); }
      else if (work.key) work.key(e);
    });

    /* pointer → work coordinates (css px) */
    var activePointer = null;
    function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    canvas.addEventListener('pointerdown', function (e) {
      if (!work.down) return; activePointer = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (x) { }
      var p = pos(e); work.down(p.x, p.y, e);
    });
    canvas.addEventListener('pointermove', function (e) { if (work.move) { var p = pos(e); work.move(p.x, p.y, activePointer === e.pointerId, e); } });
    function up(e) { if (activePointer !== e.pointerId) return; activePointer = null; if (work.up) { var p = pos(e); work.up(p.x, p.y, e); } }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

    /* visibility & lifecycle */
    var resumeOnShow = false;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { resumeOnShow = S.playing; if (S.playing) setPlaying(false); }
      else if (resumeOnShow) { resumeOnShow = false; setPlaying(true); }
    });
    window.addEventListener('pagehide', function () {
      running = false;
      try {
        if (Transport) { Transport.cancel(0); Transport.stop(); if (repeatId != null) Transport.clear(repeatId); }
        if (player) { player.onstop = function () { }; player.dispose(); }
        if (voices) { V.release(voices.list || [], T.now()); if (voices.dispose) voices.dispose(); else V.dispose(voices.list || []); }
        if (chain) chain.list.forEach(function (n) { n.dispose(); });
      } catch (e) { }
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });

    /* --- frame loop */
    var running = true, lastT = performance.now(), lastBeat = S.beat, slow = 0;
    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      var dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
      if (document.hidden) return;
      // adaptive quality: a long run of slow frames lowers pixel ratio once
      if (dt > .026) slow++; else slow = Math.max(0, slow - 1);
      if (slow > 90 && S.quality === 1) { S.quality = .6; resize(); }

      var vdt = S.playing ? dt : 0;
      if (S.audio === 'on' && (S.source !== 'score' || Transport)) S.beat = audioBeat();
      else if (S.playing) S.beat += dt * S.bpm / 60;

      if (S.beat > lastBeat && S.beat - lastBeat < 8) {
        if (work.onEvent) { var evs = work.events(lastBeat, S.beat); for (var i = 0; i < evs.length; i++) { if (evs[i].b >= lastBeat && evs[i].b < S.beat) { work.onEvent(evs[i], S.beat); S.events++; if (S.dispatchLag.length < 400) S.dispatchLag.push((S.beat - evs[i].b) * 60 / S.bpm); } } }
      }
      lastBeat = S.beat;

      g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      work.draw(g, S.beat, vdt);
      if (S.fadeT > 0) {
        S.fadeT = Math.max(0, S.fadeT - dt / .7);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = U.smooth(S.fadeT);
        g.drawImage(fadeCanvas, 0, 0, canvas.width, canvas.height); g.restore();
      }
      S.frames++;
    }

    /* --- go */
    buildParams(); buildAbout(); resize();
    if (work.seed) work.seed(S.seed);
    refresh();
    say(reduced ? '已依系統的「減少動態」設定停在靜止構圖；按「繼續」觀看降低幅度的動態。' : '目前是靜音預覽。按「開啟聲音」聆聽，或就這樣看。', 6500);
    requestAnimationFrame(frame);

    /* QA hooks (non-UI): read-only state for automated checks. */
    Sound2.state = S; Sound2.api = api; Sound2.work = work;
    Sound2.debug = {
      startAudio: startAudio, setPlaying: setPlaying, reseed: reseed, setParam: setParam, useSource: useSource, setBpm: setBpm,
      peak: function () { if (!analyser) return 0; var v = analyser.getValue(), m = 0; for (var i = 0; i < v.length; i++) m = Math.max(m, Math.abs(v[i])); return m; },
      transport: function () { return Transport ? { state: Transport.state, ticks: Transport.ticks, bpm: Transport.bpm.value } : null; },
      seek: function (b) { snapshot(); S.beat = b; lastBeat = b; if (Transport && S.source === 'score') { Transport.ticks = Math.round(b * 4) * STEP; guardUntil = T.getContext().currentTime + T.getContext().lookAhead; } }
    };
  };
})();
