// 長時間運行：佇列、聲部、記憶體與幾何是否持續成長。node longrun.cjs [秒數，預設 240]
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), base = process.env.SOUND4_URL || 'http://127.0.0.1:8777/sound/test2/';
const FILES = ['01-resonant-architecture', '02-chord-loom', '03-silence-cuts', '05-phase-tides', '07-echo-labyrinth', '08-stored-energy'];
(async () => {
  const secs = Number(process.argv[2] || 240);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const out = {};
  await Promise.all(FILES.map(async f => {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(base + f + '.html'); await p.waitForFunction(() => window.Sound4); await p.click('#start');
    const samples = [];
    for (let s = 0; s <= secs; s += 20) {
      await p.waitForTimeout(s === 0 ? 3000 : 20000);
      // 1 秒內的峰值與 RMS（壓縮器之後、音量之前），檢查爆音與失衡
      const audio = await p.evaluate(async () => { const an = Sound4.engine.analyser, buf = new Float32Array(an.fftSize); let peak = 0, sum = 0, n = 0; for (let i = 0; i < 40; i++) { an.getFloatTimeDomainData(buf); for (const v of buf) { peak = Math.max(peak, Math.abs(v)); sum += v * v; n++; } await new Promise(r => setTimeout(r, 25)); } return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4) }; });
      samples.push(await p.evaluate(audio => ({ ...audio, ...(() => {
        if (window.gc) gc();
        const w = Sound4.work, r = w.renderer;
        return {
          t: Math.round(Sound4.state.time), queue: Sound4.queueLength, voices: Sound4.engine.voices, sources: Sound4.engine.sources.size,
          heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
          geometries: r ? r.info.memory.geometries : null, textures: r ? r.info.memory.textures : null,
          rows: w.rows ? w.rows.length : undefined, cuts: w.cuts ? w.cuts.length : undefined, samples: w.model ? w.model.samples.length : undefined,
          moves: w.moves ? w.moves.length : undefined, round: w.round, quality: Sound4.quality
        };
      })() }), audio));
    }
    out[f] = { samples, errors };
    console.log(f, JSON.stringify(samples.at(-1)), errors.length ? errors : '');
  }));
  fs.writeFileSync(path.join(root, '_qa/longrun.json'), JSON.stringify({ date: new Date().toISOString(), seconds: secs, pages: out }, null, 2) + '\n');
  await b.close();
})();
