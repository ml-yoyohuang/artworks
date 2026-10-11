// 開發用：依序截圖。node seq.cjs <url> <outPrefix> <w> <h> <json steps: [[ms, js|null, name]]>
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const [url, prefix, w, h, stepsJson] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const mobile = Number(w) < 700;
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const logs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/404/.test(m.text())) logs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => logs.push('pageerror: ' + e.message));
  await p.goto(url); await p.waitForTimeout(700);
  for (const [ms, js, name] of JSON.parse(stepsJson)) {
    if (js) { const r = await p.evaluate(js); if (r !== undefined && r !== null) console.log(name || 'js', JSON.stringify(r)); }
    if (ms) await p.waitForTimeout(ms);
    if (name) await p.screenshot({ path: `${prefix}-${name}.png` });
  }
  if (logs.length) console.log(logs.join('\n'));
  await b.close();
})();
