/* Render sound2/tools/og.html → sound2/assets/og-image.png (1200×630).
 * Serve the repo root on :8765 first; PLAYWRIGHT_MODULE may point at an installed playwright. */
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto((process.env.SOUND2_URL || 'http://127.0.0.1:8765/sound2/') + 'tools/og.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(__dirname, '..', 'assets', 'og-image.png') });
  await b.close();
})();
