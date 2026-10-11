// 瀏覽器驗收：九個入口、播放生命週期、作品專屬因果、錯誤處理與資源清理。
// 先在 repo 根目錄啟動 HTTP（例：python3 -m http.server 8777 --bind 127.0.0.1）。
// PLAYWRIGHT_MODULE=/path/to/playwright node sound4/tools/qa.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), base = process.env.SOUND4_URL || 'http://127.0.0.1:8777/sound4/';
const FILES = ['01-resonant-architecture', '02-chord-loom', '03-silence-cuts', '04-sound-fossil', '05-phase-tides', '06-breath-portrait', '07-echo-labyrinth', '08-stored-energy'];
const DEV = { desktop: { viewport: { width: 1440, height: 900 } }, mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
// 同時最多 3 頁，避免單執行緒的測試伺服器與 GPU 過載而造成假性失敗
let running = 0; const waiting = [];
const limit = fn => new Promise((res, rej) => { const go = () => { running++; fn().then(res, rej).finally(() => { running--; waiting.length && waiting.shift()(); }); }; running < 3 ? go() : waiting.push(go); });
const record = (name, fn) => limit(fn).then(detail => { results.push({ name, pass: true, detail }); console.log('✓', name, detail ? JSON.stringify(detail).slice(0, 160) : ''); })
  .catch(e => { results.push({ name, pass: false, error: e.message.split('\n').slice(0, 4).join(' | ') }); console.log('✗', name, e.message.split('\n').slice(0, 6).join(' | ')); process.exitCode = 1; });

async function open(b, file, dev = 'desktop', opts = {}) {
  const ctx = await b.newContext({ ...DEV[dev], ...(opts.ctx || {}) });
  if (opts.init) await ctx.addInitScript(opts.init);
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + file + '.html' + (opts.query || ''));
  await p.waitForFunction(() => window.Sound4); await sleep(500);
  return { ctx, p, errors };
}
const st = p => p.evaluate(() => ({ t: Sound4.state.time, playing: Sound4.state.playing, ended: Sound4.state.ended, ctx: Sound4.engine.ctx ? Sound4.engine.ctx.state : null }));
async function maxLevel(p, ms) { let m = 0; for (let i = 0; i < ms / 100; i++) { m = Math.max(m, await p.evaluate(() => Sound4.engine.level())); await sleep(100); } return m; }

async function generic(b, file, dev) {
  const { ctx, p, errors } = await open(b, file, dev);
  const pre = await p.evaluate(() => ({ ctx: !!Sound4.engine.ctx, w: document.getElementById('art').width, overlay: !!document.querySelector('#start-overlay:not(.gone)'), overflow: document.documentElement.scrollWidth > innerWidth, prev: document.querySelector('a[rel=prev]').getAttribute('href'), next: document.querySelector('a[rel=next]').getAttribute('href'), index: !!document.querySelector('.pager a[href="index.html"]') }));
  assert.equal(pre.ctx, false, 'no AudioContext before user gesture'); assert.ok(pre.w > 100); assert.ok(pre.overlay); assert.equal(pre.overflow, false, 'no horizontal overflow'); assert.ok(pre.index);
  await p.click('#start'); await sleep(300);
  const lvl = await maxLevel(p, 3200);
  const s1 = await st(p); assert.equal(s1.ctx, 'running', 'ctx running'); assert.ok(s1.t > 2.5, 'clock advances'); assert.ok(lvl > 0.003, 'audible signal ' + lvl);
  // 暫停：時間凍結、音訊暫停
  await p.click('#play'); await sleep(300); const a = await st(p); await sleep(700); const b2 = await st(p);
  assert.equal(a.playing, false, 'paused'); assert.equal(a.t, b2.t, 'time frozen'); assert.equal(b2.ctx, 'suspended', 'ctx suspended');
  await p.click('#play'); await sleep(600); const c = await st(p); assert.ok(c.t > b2.t && c.playing);
  // 靜音：時間繼續、輸出增益為 0
  await p.click('#mute'); await sleep(400);
  const mute = await p.evaluate(() => ({ g: Sound4.engine.mute.gain.value, pressed: document.getElementById('mute').getAttribute('aria-pressed') }));
  const t1 = (await st(p)).t; await sleep(500); assert.ok((await st(p)).t > t1); assert.ok(mute.g < 0.05, 'mute gain'); assert.equal(mute.pressed, 'true', 'mute pressed');
  await p.click('#mute');
  await p.locator('#volume').fill('25'); assert.ok(Math.abs(await p.evaluate(() => Sound4.engine.volume) - 0.25) < 0.01);
  // 鍵盤：空白鍵播放／暫停
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press('Space'); await sleep(250); assert.equal((await st(p)).playing, false, 'space pauses');
  await p.keyboard.press('Space'); await sleep(250); assert.equal((await st(p)).playing, true, 'space resumes');
  // 重播
  await sleep(500); await p.click('#replay'); await sleep(400); const r = await st(p); assert.ok(r.t < 1.2 && r.playing, 'replay restarts ' + r.t);
  // 視窗縮放
  await p.setViewportSize(dev === 'desktop' ? { width: 1024, height: 700 } : { width: 360, height: 700 }); await sleep(400);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no overflow after resize');
  // 離開頁面：清理
  const cleaned = await p.evaluate(async () => { Sound4.dispose(); await new Promise(r => setTimeout(r, 300)); return { ctx: Sound4.engine.ctx }; });
  assert.equal(cleaned.ctx, null, 'audio closed on dispose');
  assert.deepEqual(errors.filter(e => !/favicon/.test(e)), []);
  await ctx.close();
  return { level: +lvl.toFixed(3), pre: { prev: pre.prev, next: pre.next } };
}

const specific = {
  async '01-resonant-architecture'(b) {
    const { ctx, p } = await open(b, FILES[0]);
    await p.click('#start'); await sleep(2000);
    const w0 = await p.evaluate(() => Sound4.work.walls.map(w => ({ ...w.tg })));
    const stabLong = await p.evaluate(() => Sound4.work.walls[3].stab);
    await p.waitForFunction(() => Sound4.state.time > 9.5, null, { timeout: 15000 });
    const w1 = await p.evaluate(() => Sound4.work.walls.map(w => ({ ...w.tg })));
    assert.notDeepEqual(w0[0], w1[0], 'bass wall moves on chord change'); assert.deepEqual(w0[2].x, w1[2].x, 'common-tone wall stays');
    await p.click('[data-set][data-value="1"]');
    await p.waitForFunction(() => document.getElementById('readout').textContent.includes('迴廊'), null, { timeout: 4000 });
    const ro = await p.evaluate(() => document.getElementById('readout').textContent);
    assert.ok(ro.includes('迴廊'));
    const w2 = await p.evaluate(() => Sound4.work.walls.map(w => ({ ...w.tg })));
    assert.notDeepEqual(w1.map(w => w.x), w2.map(w => w.x));
    await p.click('[data-mode][data-value="court"]'); await sleep(200);
    const court = await p.evaluate(() => Sound4.work.walls.map(w => w.tg.z));
    // 短音只留下低穩定度的懸掛片
    const fins = await p.evaluate(() => Math.max(...Sound4.work.fins.map(f => f.presence)));
    await ctx.close();
    return { stabLong: +stabLong.toFixed(2), readout: ro, courtSpread: Math.max(...court) - Math.min(...court), fins: +fins.toFixed(2) };
  },
  async '02-chord-loom'(b) {
    const { ctx, p } = await open(b, FILES[1]);
    await p.click('#start'); await p.waitForFunction(() => Sound4.state.time > 22, null, { timeout: 30000 });
    // 重複樂句 → 相同紋樣：第 1 與第 2 個 A 的列描述相同
    const same = await p.evaluate(() => { const rows = Sound4.work.rows.filter(r => !r.header); const a = rows.slice(0, 32), b = rows.slice(32, 64); const k = r => JSON.stringify([r.mel, r.bass, r.kick, r.snare, r.hat, r.ps, r.weave]); return a.length === 32 && b.length === 32 && a.every((r, i) => k(r) === k(b[i])); });
    assert.ok(same, 'repeated phrase rows identical');
    await p.click('[data-voice="melody"]'); await sleep(1600);
    const off = await p.evaluate(() => Sound4.work.rows.slice(-3).every(r => r.mel == null));
    assert.ok(off, 'melody off → rows without melody weft');
    await p.click('[data-voice="melody"]'); await p.click('[data-weave][data-value="2"]'); await sleep(1600);
    const w = await p.evaluate(() => Sound4.work.rows.at(-1).weave);
    assert.equal(w, 2);
    const n = await p.evaluate(() => Sound4.work.rows.length);
    await ctx.close();
    return { rows: n };
  },
  async '03-silence-cuts'(b) {
    const { ctx, p } = await open(b, FILES[2]);
    await p.click('#start');
    // 以狀態而非時間窗判斷：等到 4 秒強音之後的長休止切口出現
    await p.waitForFunction(() => Sound4.work.active && Sound4.work.active.stats && Sound4.work.active.stats.dur === 4, null, { timeout: 15000, polling: 50 });
    await p.click('#play'); // 暫停在休止中
    const o1 = await p.evaluate(() => Sound4.work.active.open); await sleep(800);
    assert.equal(await p.evaluate(() => Sound4.work.active.open), o1, 'pause does not keep cutting');
    await p.click('#play'); await sleep(500);
    const o2 = await p.evaluate(() => Sound4.work.active ? Sound4.work.active.open : Sound4.work.cuts.find(c => c.stats && c.stats.dur === 4).peakOpen);
    assert.ok(o2 > o1, 'opening grows with rest duration');
    // 短休止 (0.35 s) 的切口比長休止窄
    await p.waitForFunction(() => Sound4.state.time > 12.6, null, { timeout: 8000 });
    const cuts = await p.evaluate(() => Sound4.work.cuts.filter(c => c.stats).map(c => ({ peak: c.peakOpen ?? c.open, dur: c.stats.dur })));
    const long = cuts.find(c => c.dur === 4), short = cuts.find(c => c.dur === 1.5);
    assert.ok(long && short && long.peak > short.peak * 5, JSON.stringify(cuts));
    // 靜音不會產生切口
    const n0 = cuts.length; await p.click('#mute'); await sleep(500); const n1 = await p.evaluate(() => Sound4.work.cuts.filter(c => c.stats).length);
    assert.ok(n1 <= n0 + 1);
    await ctx.close();
    return { o1, o2, long: long.peak, short: short.peak };
  },
  async '04-sound-fossil'(b) {
    const { ctx, p } = await open(b, FILES[3]);
    const fp = await p.evaluate(async () => { const m = await import('./assets/js/models/fossil.js'); return m.fingerprint(Sound4.work.sim); });
    await p.click('#start');
    await p.waitForFunction(() => Sound4.work.complete, null, { timeout: 60000, polling: 500 });
    const done = await p.evaluate(() => ({ visible: Sound4.work.visible, N: Sound4.work.N, ended: Sound4.state.ended, time: Sound4.state.time }));
    assert.equal(done.visible, done.N); assert.equal(done.ended, true);
    await sleep(3000);
    assert.equal(await p.evaluate(() => Sound4.work.visible), done.N, 'specimen not cleared after the end');
    await p.click('#replay'); await sleep(500);
    const fp2 = await p.evaluate(async () => { const m = await import('./assets/js/models/fossil.js'); return m.fingerprint(Sound4.work.sim); });
    assert.deepEqual(fp, fp2);
    await p.click('#regen'); await sleep(500);
    const fp3 = await p.evaluate(async () => { const m = await import('./assets/js/models/fossil.js'); return { fp: m.fingerprint(Sound4.work.sim), seed: Sound4.seed, url: location.search }; });
    assert.notEqual(fp3.fp.hash, fp.hash); assert.ok(fp3.url.includes(fp3.seed));
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#export')]);
    await ctx.close();
    return { fp, completeAt: +done.time.toFixed(1), newSeed: fp3.seed, download: dl.suggestedFilename() };
  },
  async '05-phase-tides'(b) {
    const { ctx, p } = await open(b, FILES[4]);
    await p.click('#start'); await p.waitForFunction(() => Sound4.state.time > 13.9, null, { timeout: 18000 });
    const sync = await p.evaluate(() => Sound4.work.clock.sync(Sound4.state.time));
    assert.ok(sync > 0.98, 'first convergence ~14 s: ' + sync);
    const old = await p.evaluate(() => { const c = Sound4.work.clock; return { aT: c.anchorT, aB: c.anchorB, r: c.rateB }; });
    await p.click('[data-cycle][data-value="45"]');
    const now = await p.evaluate(() => { const c = Sound4.work.clock; return { aT: c.anchorT, aB: c.anchorB }; });
    assert.ok(Math.abs(old.aB + (now.aT - old.aT) * old.r - now.aB) < 1e-9, 'phase continuous on change');
    assert.equal(await p.evaluate(() => Sound4.work.clock.cycle), 45);
    await p.click('#play'); const d1 = await p.evaluate(() => Sound4.work.clock.delta(Sound4.state.time)); await sleep(800); const d2 = await p.evaluate(() => Sound4.work.clock.delta(Sound4.state.time));
    assert.equal(d1, d2, 'paused phase relation frozen');
    await ctx.close();
    return { sync };
  },
  async '06-breath-portrait'(b) {
    const { ctx, p } = await open(b, FILES[5]);
    await p.click('#start'); await p.waitForFunction(() => Sound4.work.items.filter(i => !i.pre).length >= 2, null, { timeout: 16000, polling: 200 });
    const two = await p.evaluate(() => Sound4.work.items.map(i => ({ demo: i.demo, ...i.sum })));
    assert.equal(two[0].demo, 'soft'); assert.equal(two[1].demo, 'urgent');
    assert.notEqual(two[0].height.toFixed(2), two[1].height.toFixed(2));
    await p.click('[data-demo][data-value="air"]'); await sleep(600);
    assert.equal(await p.evaluate(() => Sound4.work.active && Sound4.work.active.demo), 'air');
    await p.click('#play'); await sleep(200); const tAt = await p.evaluate(() => Sound4.work.active.growth.slices.length); await sleep(800);
    assert.equal(await p.evaluate(() => Sound4.work.active.growth.slices.length), tAt, 'paused breath does not grow');
    await p.click('#play');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#export')]);
    await ctx.close();
    return { soft: two[0], urgent: two[1], download: dl.suggestedFilename() };
  },
  async '07-echo-labyrinth'(b) {
    const { ctx, p } = await open(b, FILES[6]);
    await p.click('#start'); await sleep(1500);
    const r1 = await p.evaluate(() => Sound4.work.maze.segs.filter(s => s.revealAt <= Sound4.state.time).length);
    await p.click('#ping'); await sleep(200);
    const q = await p.evaluate(() => Sound4.queueLength);
    assert.ok(q > 3, 'manual ping queued echo arrivals');
    await p.waitForFunction(() => Sound4.state.time > 12, null, { timeout: 15000 });
    const r2 = await p.evaluate(() => ({ n: Sound4.work.maze.segs.filter(s => s.revealAt <= Sound4.state.time).length, cell: Sound4.work.cell }));
    assert.ok(r2.n > r1, 'walls revealed over time');
    await p.click('#relocate'); await sleep(2800);
    const moved = await p.evaluate(() => Sound4.work.cell);
    assert.notDeepEqual(moved, r2.cell);
    await ctx.close();
    return { revealedAt1_5s: r1, revealedAt12s: r2.n, queue: q };
  },
  async '08-stored-energy'(b) {
    const { ctx, p } = await open(b, FILES[7]);
    await p.click('#start'); await sleep(1500);
    const e0 = await p.evaluate(() => Sound4.work.model.E);
    await p.click('#inject'); await sleep(400);
    const e1 = await p.evaluate(() => Sound4.work.model.E);
    assert.ok(e1 > e0, 'inject adds energy');
    await p.click('#play'); const pe = await p.evaluate(() => Sound4.work.model.E); await sleep(800); assert.equal(await p.evaluate(() => Sound4.work.model.E), pe, 'paused: no charging');
    await p.click('#play');
    await p.waitForFunction(() => Sound4.work.model.releases >= 1, null, { timeout: 30000, polling: 200 });
    const rel = await p.evaluate(() => ({ t: Sound4.state.time, phase: Sound4.work.model.phase }));
    await sleep(2000);
    assert.equal(await p.evaluate(() => Sound4.work.model.releases), 1, 'no repeated trigger while locked');
    await p.click('[data-mode][data-value="fragile"]');
    assert.equal(await p.evaluate(() => Sound4.work.model.mode), 'fragile');
    await ctx.close();
    return { firstReleaseSchedTime: +rel.t.toFixed(1) };
  }
};

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const jobs = [];
  // 目錄頁
  jobs.push(record('index: 8 cards, real links and previews', async () => {
    const ctx = await b.newContext(DEV.desktop), p = await ctx.newPage(); const bad = [];
    p.on('response', r => { if (r.status() >= 400) bad.push(r.url()); });
    await p.goto(base); await sleep(800);
    const info = await p.evaluate(() => ({ links: [...document.querySelectorAll('.card')].map(a => a.getAttribute('href')), imgs: [...document.querySelectorAll('.card img')].map(i => i.naturalWidth) }));
    assert.equal(info.links.length, 8); assert.ok(info.imgs.every(w => w > 300)); assert.deepEqual(bad, []);
    await ctx.close(); return info.links;
  }));
  for (const f of FILES) {
    if (only && !only.includes(f.slice(0, 2))) continue;
    for (const dev of ['desktop', 'mobile']) jobs.push(record(`${f} ${dev}: lifecycle & controls`, () => generic(b, f, dev)));
    jobs.push(record(`${f}: causal behaviour`, () => specific[f](b)));
  }
  // 錯誤處理
  jobs.push(record('no WebGL → poster + status, audio still works', async () => {
    const { ctx, p } = await open(b, FILES[3], 'desktop', { query: '?nowebgl=1' });
    const info = await p.evaluate(() => ({ poster: !document.getElementById('poster').hidden, status: document.getElementById('status').textContent }));
    assert.ok(info.poster && info.status.length > 10);
    await p.click('#start'); await sleep(1500); assert.ok((await st(p)).t > 0.8);
    await ctx.close(); return info.status;
  }));
  jobs.push(record('no Web Audio → silent mode, clock still runs', async () => {
    const { ctx, p } = await open(b, FILES[1], 'desktop', { init: () => { delete window.AudioContext; delete window.webkitAudioContext; } });
    await p.click('#start'); await sleep(1500);
    const s = await p.evaluate(() => ({ silent: Sound4.state.silent, t: Sound4.state.time, status: document.getElementById('status').textContent, rows: Sound4.work.rows.length }));
    assert.ok(s.silent && s.t > 1 && s.rows > 14);
    await ctx.close(); return s;
  }));
  jobs.push(record('microphone denied → stays on demo (06, 03)', async () => {
    const out = [];
    for (const f of [FILES[5], FILES[2]]) {
      const { ctx, p } = await open(b, f, 'desktop', { init: () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })); } });
      await p.click('#mic'); await sleep(900);
      const s = await p.evaluate(() => ({ status: document.getElementById('status').textContent, mic: !!Sound4.work.mic, playing: Sound4.state.playing, pressed: document.getElementById('mic').getAttribute('aria-pressed') }));
      assert.equal(s.mic, false); assert.equal(s.pressed, 'false'); assert.ok(s.status.includes('權限'));
      out.push(s.status); await ctx.close();
    }
    return out;
  }));
  jobs.push(record('microphone unavailable device → message (06)', async () => {
    const { ctx, p } = await open(b, FILES[5], 'desktop', { init: () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('none'), { name: 'NotFoundError' })); } });
    await p.click('#mic'); await sleep(900);
    const s = await p.evaluate(() => document.getElementById('status').textContent); assert.ok(s.includes('找不到'));
    await ctx.close(); return s;
  }));
  jobs.push(record('microphone granted (synthetic 220 Hz stream) → local pitch analysis, stops on pause', async () => {
    // 此 headless 環境的真實 getUserMedia 會停在作業系統權限；改以合成串流驗證分析與生命週期
    const init = () => { navigator.mediaDevices.getUserMedia = async () => { const c = new AudioContext(); const o = c.createOscillator(), g = c.createGain(), d = c.createMediaStreamDestination(); o.type = 'sawtooth'; o.frequency.value = 220; g.gain.value = 0.25; o.connect(g); g.connect(d); o.start(); await c.resume(); window.__fakeMic = { c, g }; return d.stream; }; };
    const { ctx, p } = await open(b, FILES[5], 'desktop', { init });
    await p.click('#mic'); await sleep(1800);
    const s = await p.evaluate(() => ({ mic: !!Sound4.work.mic, active: Sound4.work.active && Sound4.work.active.demo, f: Sound4.work.mic && Sound4.work.mic.features(), slices: Sound4.work.active && Sound4.work.active.growth.slices.length }));
    assert.ok(s.mic && s.active === 'mic', 'mic mode active');
    assert.ok(s.f.pitch && Math.abs(s.f.pitch - 57) < 0.6, 'pitch ≈ A3: ' + s.f.pitch);
    assert.ok(s.slices > 10, 'sculpture grows from the stream');
    await p.evaluate(() => window.__fakeMic.g.gain.setValueAtTime(0, window.__fakeMic.c.currentTime)); await sleep(1800);
    const fin = await p.evaluate(() => Sound4.work.items.length);
    assert.ok(fin >= 1, 'silence finalizes the sculpture');
    await p.click('#play'); await sleep(300);
    assert.equal(await p.evaluate(() => !!Sound4.work.mic), false, 'pause stops the microphone');
    await ctx.close(); return { pitch: +s.f.pitch.toFixed(2), clarity: +s.f.clarity.toFixed(2), slices: s.slices };
  }));
  jobs.push(record('prefers-reduced-motion → works render, still causal', async () => {
    const { ctx, p, errors } = await open(b, FILES[4], 'desktop', { ctx: { reducedMotion: 'reduce' } });
    await p.click('#start'); await sleep(1500);
    assert.ok(await p.evaluate(() => Sound4.reduced)); assert.ok((await st(p)).t > 1); assert.deepEqual(errors, []);
    await ctx.close(); return 'ok';
  }));
  await Promise.all(jobs);
  fs.writeFileSync(path.join(root, '_qa/qa-results.json'), JSON.stringify({ date: new Date().toISOString(), base, browser: b.version(), results }, null, 2) + '\n');
  console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
  await b.close();
})();
