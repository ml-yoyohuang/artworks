// 擷取各作品的代表時刻：桌面／手機（模擬）截圖，並以實際畫面產生目錄預覽圖。
// 先在 repo 根目錄啟動 HTTP 伺服器；PLAYWRIGHT_MODULE 指向本機 playwright。
// node sound4/tools/capture.cjs [desktop|mobile|both] [01,02,...]
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), base = process.env.SOUND4_URL || 'http://127.0.0.1:8777/sound4/';
const PAGES = [
  ['01-resonant-architecture', 10.2], ['02-chord-loom', 34], ['03-silence-cuts', 8.7], ['04-sound-fossil', 52],
  ['05-phase-tides', 14.2], ['06-breath-portrait', 30], ['07-echo-labyrinth', 40], ['08-stored-energy', 23.6]
];
const DEV = { desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
(async () => {
  const which = process.argv[2] || 'both', only = process.argv[3] ? process.argv[3].split(',') : null;
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const out = path.join(root, '_qa/shots'); fs.mkdirSync(out, { recursive: true });
  const results = [];
  const jobs = [];
  for (const dev of (which === 'both' ? ['desktop', 'mobile'] : [which])) for (const [file, at] of PAGES) {
    if (only && !only.includes(file.slice(0, 2))) continue;
    jobs.push((async () => {
      const ctx = await b.newContext(DEV[dev]); const p = await ctx.newPage(); const errors = [];
      p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
      await p.goto(base + file + '.html'); await p.waitForFunction(() => window.Sound4); await p.waitForTimeout(900);
      await p.screenshot({ path: path.join(out, `${dev}-${file.slice(0, 2)}-prestart.jpg`), type: 'jpeg', quality: 80 });
      await p.click('#start');
      await p.waitForFunction(t => Sound4.state.time >= t || Sound4.state.ended, at, { timeout: (at + 30) * 1000, polling: 200 });
      await p.waitForTimeout(400);
      const info = await p.evaluate(() => ({ time: Sound4.state.time, silent: Sound4.state.silent, level: Sound4.engine.level(), overflow: document.documentElement.scrollWidth > innerWidth, readout: document.getElementById('readout').textContent }));
      await p.screenshot({ path: path.join(out, `${dev}-${file.slice(0, 2)}-moment.jpg`), type: 'jpeg', quality: 80 });
      if (dev === 'desktop') {
        await p.addStyleTag({ content: '.title-block,.readout,.status,.start-overlay{display:none!important}' });
        await p.waitForTimeout(150);
        await p.locator('#stage').screenshot({ path: path.join(root, 'assets/previews', file + '.jpg'), type: 'jpeg', quality: 84 });
      }
      results.push({ dev, file, at, ...info, errors });
      console.log(dev, file, JSON.stringify(info), errors.length ? errors : '');
      await ctx.close();
    })());
  }
  await Promise.all(jobs);
  fs.writeFileSync(path.join(root, `_qa/capture-${which}.json`), JSON.stringify({ date: new Date().toISOString(), base, results }, null, 2));
  await b.close();
})();
