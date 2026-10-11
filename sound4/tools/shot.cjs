// 開發用截圖：node shot.cjs <url> <out.png> [waitMs] [w] [h] [js-before-shot]
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const [url, out, wait = '3000', w = '1440', h = '900', js = ''] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--use-angle=metal'] });
  const mobile = Number(w) < 700;
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const logs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => logs.push('pageerror: ' + e.message));
  await p.goto(url);
  await p.waitForTimeout(800);
  if (js) { const r = await p.evaluate(js); if (r !== undefined) console.log('js:', JSON.stringify(r)); }
  await p.waitForTimeout(+wait);
  await p.screenshot({ path: out });
  console.log(logs.join('\n'));
  await b.close();
})();
