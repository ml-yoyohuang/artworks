import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const results = [];
for (const [width, height, dpr] of [[1440, 900, 1], [390, 844, 3]]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  for (const speed of [1, 10, 20]) {
    const page = await context.newPage(); await page.goto('http://127.0.0.1:5174/');
    await page.locator('[data-gear="63"]').click();
    await page.locator('#speed').selectOption(String(speed));
    await page.locator('#quick-draw').click();
    const timing = await page.evaluate(() => new Promise(resolve => {
      const durations = []; let last;
      const frame = now => {
        if (last) durations.push(now - last); last = now;
        if (durations.length < 120) requestAnimationFrame(frame);
        else {
          const sorted = [...durations].sort((a,b) => a-b);
          resolve({ medianFrameMs: sorted[60], p95FrameMs: sorted[114], framesOver33ms: durations.filter(t => t > 33.4).length });
        }
      };
      requestAnimationFrame(frame);
    }));
    results.push({ viewport: `${width}x${height}`, dpr, speed, samples: 120, ...timing });
    await page.close();
  }
  await context.close();
}
await browser.close();
const result = { note: 'Headless Chromium on this host; mobile viewport and DPR emulation, not physical-phone performance.', results };
await writeFile('qa/performance-speeds.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
