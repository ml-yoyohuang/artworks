import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { PlayModel } from '../src/play/model';
const round = process.argv[2] || 'round-1', directory = `qa/play/${round}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const errors: string[] = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    const prefix = mobile ? 'mobile' : 'desktop', model = new PlayModel(42);
    const shot = async (name: string) => { await page.screenshot({ path: `${directory}/${prefix}-${name}.png`, fullPage: false }); };
    await page.goto('http://127.0.0.1:5174/'); await page.evaluate(() => document.fonts.ready);
    if (!mobile) await shot('classic');
    await page.evaluate(async value => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('orbit.play', 1); request.onupgradeneeded = () => request.result.createObjectStore('papers');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result, t = db.transaction('papers', 'readwrite'); t.objectStore('papers').put({ current: value, previous: null }, 'session'); t.oncomplete = () => { db.close(); resolve(); }; };
      });
    }, model.snapshot());
    await page.locator('#enter-play').click(); await page.locator('#p-mechanism').waitFor(); await page.waitForTimeout(300); await shot('play');
    await page.clock.install();
    for (let i = 0; i < 4; i++) {
      const duration = model.drawing.end / 2.4 * 1000;
      await page.locator('#p-auto').click();
      if (i === 0) { await page.clock.runFor(1600); await shot('drawing'); await page.clock.runFor(duration - 1600 + 70); }
      else await page.clock.runFor(duration + 70);
      if (i === 0 && !mobile) { await page.waitForTimeout(260); await shot('complete'); }
      await page.clock.runFor(1250);
      if (i === 0 && !mobile) await shot('gear-change');
      await page.clock.runFor(250); model.next();
    }
    await shot('layered');
    if (!mobile) {
      await page.locator('#p-new').click(); await page.clock.runFor(160); await shot('paper-change'); await page.clock.runFor(500); await shot('lemon-paper');
    }
    await page.close();
  }
  await writeFile(`${directory}/review.json`, JSON.stringify({ viewport: ['1440x900', '390x844@2x'], seed: 42, screenshots: 11, runtimeErrors: errors }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Play visual review saved to ${directory}; no browser errors`);
} finally { await browser.close(); }
