import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5174/');
await page.locator('#quick-draw').click();
const result = await page.evaluate(() => new Promise(resolve => {
  const durations = []; let last;
  function frame(now) {
    if (last) durations.push(now - last); last = now;
    if (durations.length < 180) requestAnimationFrame(frame);
    else {
      const sorted = [...durations].sort((a, b) => a - b);
      resolve({ viewport: '1440x900', samples: durations.length, medianFrameMs: sorted[90],
        p95FrameMs: sorted[171], framesOver33ms: durations.filter(t => t > 33.4).length,
        note: 'Headless Chromium on this host, auto draw; not a real-device benchmark.' });
    }
  }
  requestAnimationFrame(frame);
}));
await writeFile('qa/performance.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
await browser.close();
