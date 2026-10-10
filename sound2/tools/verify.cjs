/* /sound2 acceptance run.
 * Serve the repo root (python3 -m http.server 8765 --bind 127.0.0.1), then:
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node sound2/tools/verify.cjs [--only=01-wave-relay,...]
 * Writes sound2/_qa/results.json and screenshots in sound2/_qa/shots/.
 * Audio is checked through the page's own analyser (non-zero signal), the
 * Tone context state and the scheduling log — not by listening.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.SOUND2_URL || 'http://127.0.0.1:8765/sound2/';
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, '_qa'), SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const IDS = ['01-wave-relay', '02-color-surfers', '03-elastic-ensemble', '04-occasional-unison', '05-phrase-bows', '06-beat-pages', '07-wave-dialogue', '08-late-wave', '09-rhythm-rosette', '10-swing-waves'];
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function watch(page, bag) {
  page.on('pageerror', e => bag.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') bag.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400) bag.push('http ' + r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => { if (!/favicon/.test(r.url())) bag.push('failed ' + r.url() + ' ' + (r.failure() || {}).errorText); });
}
const canvasStats = page => page.evaluate(() => {
  const c = document.querySelector('.s2-stage canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, set = new Set();
  let h = 0; for (let i = 0; i < d.length; i += 4 * 97) { set.add(d[i] >> 3 << 10 | d[i + 1] >> 3 << 5 | d[i + 2] >> 3); h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; }
  return { colors: set.size, hash: h };
});
const st = page => page.evaluate(() => { const S = Sound2.state; return { beat: S.beat, audio: S.audio, playing: S.playing, muted: S.muted, notes: S.notes, events: S.events, frames: S.frames, seed: S.seed, repeats: S.repeats, source: S.source, err: S.err }; });

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
  const results = { date: new Date().toISOString(), browser: browser.version(), base: BASE, works: [], index: [], extra: {} };
  for (const device of ['desktop', 'mobile']) {
    const ctx = await browser.newContext({ viewport: device === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 }, deviceScaleFactor: device === 'desktop' ? 1 : 2, isMobile: device === 'mobile', hasTouch: device === 'mobile', acceptDownloads: true });
    for (const id of IDS.filter(i => !only.length || only.includes(i))) {
      const page = await ctx.newPage(), errors = [], r = { id, device, checks: {} }, ok = (k, v, note) => { r.checks[k] = note === undefined ? !!v : { pass: !!v, note }; };
      watch(page, errors);
      await page.goto(BASE + id + '.html?seed=4242', { waitUntil: 'load' });
      await page.waitForFunction(() => window.Sound2 && Sound2.state && Sound2.state.frames > 5);
      await sleep(700);
      const s0 = await st(page), c0 = await canvasStats(page);
      ok('silentOnLoad', s0.audio === 'off' && s0.notes === 0);
      ok('initialFrameDrawn', c0.colors > 8, c0.colors + ' colour bins');
      ok('previewMoving', s0.beat > 0.3, 'beat ' + s0.beat.toFixed(2));
      await page.screenshot({ path: path.join(SHOTS, `${device}-${id}-open.png`) });
      // start sound with a real click
      await page.locator('#s2-sound').click();
      await page.waitForFunction(() => Sound2.state.audio === 'on' || Sound2.state.audio === 'failed', null, { timeout: 15000 });
      await sleep(3200);
      const a = await page.evaluate(async () => {
        let peak = 0; for (let i = 0; i < 20; i++) { peak = Math.max(peak, Sound2.debug.peak()); await new Promise(r => setTimeout(r, 40)); }
        const S = Sound2.state, log = S.schedLog.slice(-120), drift = log.reduce((m, x) => Math.max(m, Math.abs(x.tb - x.b)), 0), lag = S.dispatchLag.slice(-120);
        return { audio: S.audio, ctx: Tone.getContext().state, notes: S.notes, peak, drift, lagMax: lag.length ? Math.max(...lag) : null, lagMean: lag.length ? lag.reduce((x, y) => x + y, 0) / lag.length : null, transport: Sound2.debug.transport(), repeats: S.repeats };
      });
      ok('audioStarts', a.audio === 'on' && a.ctx === 'running', a.ctx);
      ok('notesScheduled', a.notes > 0, a.notes + ' notes');
      ok('nonZeroSignal', a.peak > 1e-4, 'peak ' + a.peak.toFixed(4));
      ok('scheduledOnScoreBeat', a.drift < 0.011, 'max |transport beat at note time − score beat| = ' + a.drift.toFixed(5) + ' beat');
      if (a.lagMax != null) ok('visualDispatchWithinFrame', a.lagMax < 0.05, 'mean ' + (a.lagMean * 1000).toFixed(1) + ' ms, max ' + (a.lagMax * 1000).toFixed(1) + ' ms after the audio-clock beat');
      ok('singleScheduler', a.repeats === 1, 'repeats ' + a.repeats);
      r.audio = a;
      await page.screenshot({ path: path.join(SHOTS, `${device}-${id}-playing.png`) });
      // mute keeps time running
      await page.locator('#s2-sound').click(); await sleep(450);
      const m = await page.evaluate(async () => { const b0 = Sound2.state.beat; let p = 0; for (let i = 0; i < 8; i++) { p = Math.max(p, Sound2.debug.peak()); await new Promise(r => setTimeout(r, 40)); } return { muted: Sound2.state.muted, peak: p, advanced: Sound2.state.beat - b0 }; });
      ok('muteSilencesKeepsTime', m.muted && m.peak < 2e-3 && m.advanced > 0.1, 'peak ' + m.peak.toFixed(5) + ', beat +' + m.advanced.toFixed(2));
      await page.locator('#s2-sound').click();
      await page.locator('#s2-volume').fill('0.3'); ok('volume', (await page.evaluate(() => Sound2.state.volume)) === 0.3);
      // pause / resume
      await page.locator('#s2-pause').click(); await sleep(300);
      const p1 = await page.evaluate(() => Sound2.state.beat); await sleep(400); const p2 = await page.evaluate(() => Sound2.state.beat);
      const tp = await page.evaluate(() => Sound2.debug.transport());
      ok('pauseStopsTime', Math.abs(p2 - p1) < 1e-6 && tp.state !== 'started', tp.state);
      await page.locator('#s2-pause').click(); await sleep(500);
      ok('resume', (await page.evaluate(() => Sound2.state.beat)) > p2 + .2);
      // reseed
      const seedBefore = (await st(page)).seed;
      await page.locator('#s2-seed').click(); await sleep(300);
      const seedAfter = (await st(page)).seed;
      ok('reseed', seedAfter !== seedBefore && page.url().includes('seed=' + seedAfter), seedBefore + ' → ' + seedAfter);
      // parameters: change each, then reset
      await page.locator('#s2-tune').click();
      const params = await page.evaluate(() => [...document.querySelectorAll('#s2-params fieldset[data-key], #s2-params input[data-key]')].map(n => n.getAttribute('data-key')));
      let paramVisual = 0;
      for (const key of params) {
        await page.evaluate(() => Sound2.debug.setPlaying(false)); await sleep(120);
        const h0 = (await canvasStats(page)).hash;
        const isField = await page.locator(`#s2-params fieldset[data-key="${key}"]`).count();
        if (isField) await page.locator(`#s2-params fieldset[data-key="${key}"] button[aria-pressed="false"]`).last().click();
        else await page.locator(`#s2-params input[data-key="${key}"]`).fill(String(await page.evaluate(k => { const i = document.querySelector(`#s2-params input[data-key="${k}"]`); const st = +i.step || 1, v = +i.min + Math.round((+i.max - +i.min) * .85 / st) * st; return +v.toFixed(4); }, key)));
        await page.evaluate(() => Sound2.debug.setPlaying(true)); await sleep(900); await page.evaluate(() => Sound2.debug.setPlaying(false)); await sleep(120);
        if ((await canvasStats(page)).hash !== h0) paramVisual++;
      }
      await page.evaluate(() => Sound2.debug.setPlaying(true));
      await page.locator('#s2-reset').click();
      ok('paramsApplyAndReset', params.length >= 2 && (await page.evaluate(() => Sound2.state.repeats)) === 1, params.join(', ') + ` · ${paramVisual}/${params.length} changed the frame`);
      await page.locator('#s2-tune').click();
      // pointer interaction where offered
      const box = await page.locator('.s2-stage canvas').boundingBox();
      if (device === 'mobile') await page.touchscreen.tap(box.x + box.width * .5, box.y + box.height * .45);
      else { await page.mouse.move(box.x + box.width * .5, box.y + box.height * .45); await page.mouse.down(); await page.mouse.move(box.x + box.width * .55, box.y + box.height * .38, { steps: 6 }); await page.mouse.up(); }
      await sleep(600);
      // export PNG
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.locator('#s2-save').click()]);
      const file = path.join(OUT, 'dl-' + device + '-' + id + '.png'); await dl.saveAs(file);
      const buf = fs.readFileSync(file), isPng = buf.slice(1, 4).toString() === 'PNG', w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
      const exportStats = await page.evaluate(async src => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 64, 64); const d = g.getImageData(0, 0, 64, 64).data, s = new Set(); for (let i = 0; i < d.length; i += 4) s.add(d[i] >> 4 << 8 | d[i + 1] >> 4 << 4 | d[i + 2] >> 4); return s.size; }, 'data:image/png;base64,' + buf.toString('base64'));
      ok('pngExport', isPng && buf.length > 8000 && exportStats > 6 && dl.suggestedFilename().includes(id) && dl.suggestedFilename().includes('seed'), `${dl.suggestedFilename()} ${w}×${h} ${Math.round(buf.length / 1024)} KB, ${exportStats} colour bins`);
      fs.unlinkSync(file);
      // hide / show UI
      await page.keyboard.press('h'); const hidden = await page.evaluate(() => document.body.classList.contains('s2-hidden'));
      await page.screenshot({ path: path.join(SHOTS, `${device}-${id}-clean.png`) });
      await page.keyboard.press('h'); ok('hideUi', hidden && !(await page.evaluate(() => document.body.classList.contains('s2-hidden'))));
      // simulated page hide → pauses; show → resumes
      const vis = await page.evaluate(async () => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
        const hiddenPlaying = Sound2.state.playing;
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'));
        await new Promise(r => setTimeout(r, 300)); return { hiddenPlaying, after: Sound2.state.playing };
      });
      ok('visibilityPauseResume', !vis.hiddenPlaying && vis.after);
      ok('noHorizontalOverflow', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
      const nav = await page.evaluate(() => [...document.querySelectorAll('.s2-nav a')].map(a => a.getAttribute('href')));
      ok('navigation', nav.length === 3 && nav[1] === './', nav.join(' | '));
      // fps sample (headless, this machine)
      r.fps = await page.evaluate(async () => { const f0 = Sound2.state.frames, t0 = performance.now(); await new Promise(r => setTimeout(r, 1500)); return Math.round((Sound2.state.frames - f0) * 1000 / (performance.now() - t0)); });
      r.errors = errors; ok('noErrors', errors.length === 0, errors.slice(0, 4).join(' ; '));
      results.works.push(r);
      console.log(device, id, Object.entries(r.checks).filter(([k, v]) => !(v === true || v.pass)).map(([k]) => 'FAIL ' + k).join(' ') || 'all pass', 'fps', r.fps);
      await page.close();
    }
    // catalogue
    const page = await ctx.newPage(), errors = []; watch(page, errors);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const links = await page.evaluate(() => [...document.querySelectorAll('.ix-card')].map(a => a.getAttribute('href')));
    const codes = []; for (const l of links) codes.push((await ctx.request.get(BASE + l)).status());
    const imgs = await page.evaluate(async () => Promise.all([...document.images].map(i => { i.loading = 'eager'; return i.decode().then(() => i.naturalWidth).catch(() => 0); })));
    await page.screenshot({ path: path.join(SHOTS, `${device}-index.png`), fullPage: true });
    results.index.push({ device, links: links.length, allLinks200: codes.every(c => c === 200), images: imgs.length, imagesDecoded: imgs.every(w => w > 0), audioOnIndex: await page.evaluate(() => !!window.Tone), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), errors });
    console.log('index', device, JSON.stringify(results.index[results.index.length - 1]));
    await page.close(); await ctx.close();
  }

  // resilience: repeated restart, no Tone (blocked), external track mode
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (!only.length || only.includes('01-wave-relay')) {
    const page = await ctx.newPage(), errors = []; watch(page, errors);
    const restarts = [];
    for (let k = 0; k < 3; k++) {
      await page.goto(BASE + '01-wave-relay.html?seed=7', { waitUntil: 'load' });
      await page.waitForFunction(() => window.Sound2 && Sound2.state.frames > 3);
      await page.locator('#s2-sound').click(); await page.waitForFunction(() => Sound2.state.audio === 'on'); await sleep(2000);
      restarts.push(await page.evaluate(async () => { let p = 0; for (let i = 0; i < 15; i++) { p = Math.max(p, Sound2.debug.peak()); await new Promise(r => setTimeout(r, 40)); } return { repeats: Sound2.state.repeats, peak: +p.toFixed(4), notesPerSec: +(Sound2.state.notes / 2).toFixed(1) }; }));
    }
    results.extra.restarts = restarts;
    // external track
    const t = await page.evaluate(async () => { await Sound2.debug.useSource('carefree'); const b0 = Sound2.state.beat; await new Promise(r => setTimeout(r, 4000)); let p = 0; for (let i = 0; i < 15; i++) { p = Math.max(p, Sound2.debug.peak()); await new Promise(r => setTimeout(r, 40)); } const S = Sound2.state; return { source: S.source, info: S.trackInfo, advanced: S.beat - b0, peak: p, transport: Sound2.debug.transport(), notesScored: S.notes }; });
    results.extra.track = t;
    const t2 = await page.evaluate(async () => { await Sound2.debug.useSource('electrodoodle'); await new Promise(r => setTimeout(r, 2500)); const S = Sound2.state; return { source: S.source, info: S.trackInfo, peak: Sound2.debug.peak() }; });
    results.extra.track2 = t2;
    await page.evaluate(async () => { await Sound2.debug.useSource('score'); }); await sleep(1500);
    results.extra.backToScore = await page.evaluate(() => ({ source: Sound2.state.source, repeats: Sound2.state.repeats, transport: Sound2.debug.transport() }));
    results.extra.trackErrors = errors;
    console.log('restarts', JSON.stringify(restarts)); console.log('track', JSON.stringify(t)); console.log('track2', JSON.stringify(t2.info)); console.log('back', JSON.stringify(results.extra.backToScore), errors);
    await page.close();
    // Tone blocked: visual-only fallback
    const p2 = await ctx.newPage(), e2 = []; watch(p2, e2);
    await p2.route('**/tone-15.0.4.min.js', r => r.abort());
    await p2.goto(BASE + '05-phrase-bows.html', { waitUntil: 'load' });
    await p2.waitForFunction(() => window.Sound2 && Sound2.state.frames > 5);
    await p2.locator('#s2-sound').click(); await sleep(800);
    results.extra.noAudio = await p2.evaluate(() => ({ audio: Sound2.state.audio, status: document.querySelector('.s2-status').textContent, beat: Sound2.state.beat, playing: Sound2.state.playing }));
    results.extra.noAudioErrors = e2.filter(x => !/tone-15/.test(x));
    console.log('noAudio', JSON.stringify(results.extra.noAudio), results.extra.noAudioErrors);
    // reduced motion
    const p3 = await browser.newPage({ reducedMotion: 'reduce' });
    await p3.goto(BASE + '09-rhythm-rosette.html', { waitUntil: 'load' }); await p3.waitForFunction(() => window.Sound2 && Sound2.state.frames > 5); await sleep(500);
    results.extra.reducedMotion = await p3.evaluate(() => ({ playing: Sound2.state.playing, motion: Sound2.api.motion }));
    console.log('reduced', JSON.stringify(results.extra.reducedMotion));
    await p3.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
  const fails = results.works.flatMap(w => Object.entries(w.checks).filter(([k, v]) => !(v === true || v.pass)).map(([k]) => w.device + ' ' + w.id + ' ' + k));
  console.log(fails.length ? 'FAILURES:\n' + fails.join('\n') : 'ALL WORK CHECKS PASS');
})();
