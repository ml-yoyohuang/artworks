// SOUND/4 作品頁外殼：播放控制、生命週期、時鐘、畫面迴圈與替代模式。
import { Engine } from './audio.js';
import { rng, clamp } from './rng.js';

const $ = sel => document.querySelector(sel);
const fmt = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };

// 沒有 Web Audio 時的替代時鐘：以 performance.now 推進，可暫停。
class SilentClock {
  constructor() { this.base = 0; this.start = 0; this.running = false; }
  now() { return this.running ? this.base + (performance.now() - this.start) / 1000 : this.base; }
  play() { if (!this.running) { this.start = performance.now(); this.running = true; } }
  pause() { if (this.running) { this.base = this.now(); this.running = false; } }
  reset() { this.base = 0; this.start = performance.now(); }
}

export function runWork(work) {
  const params = new URLSearchParams(location.search);
  const stage = $('#stage'), canvas = $('#art');
  const ui = {
    start: $('#start'), play: $('#play'), replay: $('#replay'), mute: $('#mute'), volume: $('#volume'),
    time: $('#time'), status: $('#status'), readout: $('#readout'), overlay: $('#start-overlay'), poster: $('#poster')
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const engine = new Engine(work.engine || {});
  const silent = new SilentClock();
  const state = { muted: false, started: false, playing: false, ended: false, silent: false, fallback: false, time: 0, autoPaused: false, until: 0 };
  let queue = [], raf = 0, timer = 0, dirty = true, lastT = 0, disposed = false;
  let seed = params.get('seed') || work.defaultSeed || '4172';

  const api = {
    engine, state, canvas, stage, params,
    get seed() { return seed; },
    get reduced() { return reduced.matches; },
    get mobile() { return innerWidth < 760; },
    quality: 1,
    rng: s => rng(`${seed}:${s}`),
    setSeed(s) {
      seed = String(s);
      const u = new URL(location.href); u.searchParams.set('seed', seed); history.replaceState(null, '', u);
    },
    at: t => engine.at(t),
    // 樂譜時間 → 可否發聲（無聲模式或替代畫面時仍保留視覺事件）。
    get audible() { return !state.silent && !!engine.ctx; },
    emit(ev) {
      // 依時間插入，保持佇列有序；上限保護避免無限成長。
      let i = queue.length;
      while (i > 0 && queue[i - 1].t > ev.t) i--;
      queue.splice(i, 0, ev);
      if (queue.length > 4000) queue.splice(0, queue.length - 4000);
    },
    get queueLength() { return queue.length; },
    // 從樂譜時間 t 起重新排程：移除尚未發生的視覺事件，讓排程器由 t 重新補排。
    rewindTo(t, pred = () => true) {
      queue = queue.filter(ev => ev.t < t || !pred(ev));
      state.until = Math.min(state.until, t);
    },
    // 互動事件最早可安排的樂譜時間。
    soonest(pad = 0.035) { return Math.max(0, schedNow() + pad); },
    get horizon() { return state.until; },
    status, readout(text) { if (ui.readout) ui.readout.textContent = text; },
    invalidate() { dirty = true; },
    finish() { finish(); },
    exportPNG(name) {
      try {
        if (!state.fallback && work.render) work.render(api);
        const url = (work.exportCanvas ? work.exportCanvas(api) : canvas).toDataURL('image/png');
        const a = document.createElement('a'); a.href = url; a.download = `${name}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        status('已匯出 PNG。');
      } catch (e) { status('此瀏覽器無法匯出畫面。', 'warn'); }
    },
    // 曲終後觀眾再操作（例如再做一件雕塑）：在原處繼續，不清空作品。
    async continueAfterEnd() {
      if (!state.ended) return;
      state.ended = false; state.playing = true;
      if (state.silent) silent.play(); else { try { await engine.resume(); } catch (e) { /* 維持無聲 */ } }
      fill(); setPlayUI();
    },
    play: () => togglePlay(true), pause: () => togglePlay(false), replay
  };
  api.work = work;
  window.Sound4 = api;

  function schedNow() { return state.silent ? silent.now() : engine.schedNow(); }
  function audibleNow() { return state.silent ? silent.now() : engine.now(); }

  function status(msg = '', kind = '') {
    if (!ui.status) return;
    ui.status.textContent = msg; ui.status.dataset.kind = kind;
    clearTimeout(status.t);
    if (msg && kind !== 'sticky' && kind !== 'warn') status.t = setTimeout(() => { if (ui.status.textContent === msg) ui.status.textContent = ''; }, 4200);
  }

  function setPlayUI() {
    const label = !state.started ? '開始' : state.ended ? '重新開始' : state.playing ? '暫停' : '繼續';
    ui.play.textContent = label;
    ui.play.setAttribute('aria-pressed', String(state.playing));
    ui.play.setAttribute('aria-label', label === '暫停' ? '暫停作品' : `${label}播放作品`);
    document.body.dataset.state = !state.started ? 'idle' : state.ended ? 'ended' : state.playing ? 'playing' : 'paused';
  }

  // ---- 初始化畫面（播放前就要有完整構圖）----
  const forceFallback = params.has('nowebgl');
  try {
    if (forceFallback) throw new Error('webgl');
    work.init(api);
  } catch (e) {
    state.fallback = true;
    stage.classList.add('fallback');
    if (ui.poster) ui.poster.hidden = false;
    canvas.hidden = true;
    status('此瀏覽器無法啟用作品所需的圖形功能，下方為實際運行時擷取的畫面；聲音仍可播放。', 'warn');
    if (!forceFallback) console.warn('[sound4] renderer unavailable:', e && e.message);
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    const cap = api.mobile ? 1.5 : 1.75;
    const dpr = Math.max(0.6, Math.min(devicePixelRatio || 1, cap) * api.quality);
    if (!state.fallback && work.resize) work.resize(Math.max(1, r.width), Math.max(1, r.height), dpr, api);
    dirty = true;
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---- 排程：只補前瞻視窗；時間來源永遠是音訊時鐘 ----
  function fill() {
    if (!state.playing || state.ended) return;
    const horizon = schedNow() + (work.lookahead ?? engine.lookahead);
    if (horizon <= state.until) return;
    work.schedule(state.until, horizon, api);
    state.until = horizon;
  }

  async function start() {
    if (state.started) return;
    state.started = true;
    ui.overlay && ui.overlay.classList.add('gone');
    try {
      await engine.ensure();
      engine.setVolume(Number(ui.volume.value) / 100);
      engine.setMuted(state.muted);
      engine.newSession();
    } catch (e) {
      state.silent = true; silent.reset(); silent.play();
      status('此裝置目前無法播放聲音，作品以無聲展演繼續；時間與事件仍依樂譜進行。', 'warn');
    }
    state.playing = true; state.until = 0; queue = []; lastT = 0;
    work.onStart && work.onStart(api);
    timer = setInterval(fill, 40); fill();
    setPlayUI(); dirty = true;
  }

  async function togglePlay(want) {
    if (!state.started) return start();
    if (state.ended) return replay();
    const next = want ?? !state.playing;
    if (next === state.playing) return;
    state.playing = next; state.autoPaused = false;
    if (state.silent) { next ? silent.play() : silent.pause(); }
    else if (next) { try { await engine.resume(); } catch (e) { status('瀏覽器暫停了聲音，請再按一次繼續。', 'warn'); state.playing = false; } }
    else await engine.suspend();
    if (next) fill();
    work.onPlayState && work.onPlayState(state.playing, api);
    setPlayUI(); dirty = true;
  }

  async function replay() {
    if (!state.started) return start();
    state.ended = false;
    if (state.silent) { silent.reset(); silent.play(); }
    else { try { await engine.resume(); engine.newSession(); } catch (e) { state.silent = true; silent.reset(); silent.play(); } }
    queue = []; state.until = 0; lastT = 0; state.time = 0; state.playing = true;
    work.reset && work.reset(api);
    if (!timer) timer = setInterval(fill, 40);
    fill(); setPlayUI(); dirty = true;
    status('重新開始。');
  }

  function finish() {
    if (state.ended) return;
    state.ended = true; state.playing = false;
    setPlayUI();
    // 讓殘響自然收尾後再暫停音訊，節省資源。
    setTimeout(() => { if (state.ended && !state.silent) engine.suspend(); }, 4500);
    if (state.silent) silent.pause();
  }

  // ---- 畫面迴圈 ----
  let frames = 0, slowSince = 0, lastFrame = 0, lastRender = 0;
  function loop(now = performance.now()) {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    const interval = now - lastFrame; lastFrame = now;
    const minGap = api.reduced ? 1000 / 15 : 0;
    if (now - lastRender < minGap) return;
    if (state.playing) {
      const t = Math.max(0, audibleNow());
      while (queue.length && queue[0].t <= t) { const ev = queue.shift(); if (!state.fallback) work.onEvent && work.onEvent(ev, api); }
      const dt = clamp(t - lastT, 0, 0.25); lastT = t; state.time = t;
      if (!state.fallback) work.update && work.update(t, dt, api);
      dirty = true;
      if (ui.time) ui.time.textContent = fmt(t);
    } else if (!state.fallback && work.idle) {
      if (work.idle(api)) dirty = true;
    }
    if (dirty && !state.fallback && document.visibilityState === 'visible') {
      work.render(api); dirty = false; lastRender = now; frames++;
      // 自動品質：持續慢於約 30fps 時降低解析度。
      // 只計入 40–150ms 的間隔：更長的間隔多半是分頁或面板被節流，不代表繪圖太慢。
      if (interval > 40 && interval < 150 && state.playing && document.hasFocus()) { slowSince = slowSince || now; if (now - slowSince > 4000 && api.quality > 0.7) { api.quality = Math.round((api.quality - 0.15) * 100) / 100; slowSince = 0; resize(); } }
      else slowSince = 0;
    }
  }
  loop();

  // ---- 控制 ----
  ui.start && ui.start.addEventListener('click', () => start());
  ui.play.addEventListener('click', () => togglePlay());
  ui.replay.addEventListener('click', () => replay());
  ui.mute.addEventListener('click', () => {
    state.muted = !state.muted; engine.setMuted(state.muted);
    ui.mute.setAttribute('aria-pressed', String(state.muted));
    ui.mute.textContent = state.muted ? '取消靜音' : '靜音';
    status(state.muted ? '靜音觀看：畫面仍與樂譜同步，這不是作品裡的休止。' : '');
  });
  ui.volume.addEventListener('input', () => engine.setVolume(Number(ui.volume.value) / 100));

  addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (['input', 'select', 'textarea', 'button', 'summary', 'a'].includes(tag)) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'm' || e.key === 'M') ui.mute.click();
    else if (work.onKey && work.onKey(e, api)) e.preventDefault();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && state.playing) {
      togglePlay(false).then(() => { state.autoPaused = true; status('切換到其他分頁時作品已暫停，按「繼續」回到原處。', 'sticky'); });
    }
    if (document.visibilityState === 'visible') dirty = true;
  });

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf); clearInterval(timer);
    try { work.dispose && work.dispose(api); } catch (e) { /* 清理時忽略 */ }
    engine.close();
  }
  addEventListener('pagehide', dispose);
  addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  api.dispose = dispose;
  setPlayUI();
  return api;
}

// 小工具：綁定 aria-pressed 的單選按鈕群組。
export function radioGroup(selector, onChange) {
  const buttons = [...document.querySelectorAll(selector)];
  const set = value => buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === String(value))));
  buttons.forEach(b => b.addEventListener('click', () => { set(b.dataset.value); onChange(b.dataset.value, b); }));
  return set;
}
