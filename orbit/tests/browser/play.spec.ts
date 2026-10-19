import { test, expect, type Page } from '@playwright/test';
import { PlayModel } from '../../src/play/model';
import { readFile } from 'node:fs/promises';
async function open(page: Page): Promise<void> { await page.goto('/'); await page.locator('#enter-play').click(); await expect(page.locator('#play-root')).toBeVisible(); }
async function circle(page: Page, direction = 1): Promise<void> {
  const b = (await page.locator('#p-mechanism').boundingBox())!, x = b.x + b.width / 2, y = b.y + b.height / 2, r = b.width * .28;
  await page.mouse.move(x + r, y); await page.mouse.down();
  for (let i = 1; i <= 30; i++) await page.mouse.move(x + r * Math.cos(i * .15 * direction), y + r * Math.sin(i * .15 * direction));
  await page.mouse.up();
}
test('mode state isolation, partial stroke, cached mode and no hidden animation', async ({ page }) => {
  await page.goto('/'); await page.locator('#mechanism').focus(); await page.keyboard.press('Shift+ArrowRight');
  const old = await page.locator('#moving-gear').getAttribute('transform');
  await page.locator('#enter-play').click(); await expect(page.locator('#p-count')).toHaveText('00');
  await circle(page); await expect(page.locator('#p-count')).toHaveText('01');
  const play = await page.locator('#p-mechanism-gear').getAttribute('transform');
  await page.locator('#p-back').click(); await expect(page.locator('#moving-gear')).toHaveAttribute('transform', old!);
  await expect(page.locator('#stroke-count')).toHaveText('02 STROKES');
  await page.locator('#enter-play').click(); await expect(page.locator('#p-mechanism-gear')).toHaveAttribute('transform', play!);
  await page.locator('#p-auto').click(); await page.waitForTimeout(150); await page.locator('#p-back').click();
  const paused = await page.locator('#p-mechanism-gear').getAttribute('transform'); await page.waitForTimeout(300);
  expect(await page.locator('#p-mechanism-gear').getAttribute('transform')).toBe(paused);
  await page.locator('#enter-studio').click(); await expect(page.locator('#s-art svg')).toBeVisible();
});
test('manual next preserves actual canvas and reversed drawing; new set waits', async ({ page }) => {
  await open(page); await circle(page, -1);
  await page.locator('#p-next').click(); await expect(page.locator('#play-root')).toHaveAttribute('data-phase', 'ready');
  expect(await page.locator('#p-done').evaluate((el: HTMLCanvasElement) => el.getContext('2d')!.getImageData(0,0,el.width,el.height).data.some((v, i) => i % 4 === 3 && v > 0))).toBe(true);
  expect(await page.locator('#p-active').evaluate((el: HTMLCanvasElement) => el.getContext('2d')!.getImageData(0,0,el.width,el.height).data.every((v, i) => i % 4 !== 3 || v === 0))).toBe(true);
  await page.waitForTimeout(1400); await expect(page.locator('#p-count')).toHaveText('01');
  await expect(page.locator('#p-auto')).toHaveAttribute('aria-pressed', 'false');
});
test('closure completes at geometric period and automatically prepares exactly one next set', async ({ page }) => {
  await page.goto('/'); const fixture = new PlayModel(42);
  await page.evaluate(async value => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('orbit.play', 1); r.onupgradeneeded = () => r.result.createObjectStore('papers');
      r.onsuccess = () => { const t = r.result.transaction('papers', 'readwrite'); t.objectStore('papers').put({ current: value, previous: null }, 'session'); t.oncomplete = () => { r.result.close(); resolve(); }; }; r.onerror = () => reject(r.error);
    });
  }, fixture.snapshot());
  await page.locator('#enter-play').click(); await expect(page.locator('#play-root')).toBeVisible(); await page.clock.install();
  await page.locator('#p-auto').click();
  const duration = fixture.drawing.end / 2.4 * 1000;
  await page.clock.runFor(duration - 100); await expect(page.locator('#play-root')).toHaveAttribute('data-phase', 'drawing');
  await page.clock.runFor(150); await expect(page.locator('#play-root')).toHaveAttribute('data-phase', 'completed');
  await expect(page.locator('#p-count')).toHaveText('01');
  await page.clock.runFor(1450); await expect(page.locator('#play-root')).toHaveAttribute('data-phase', 'ready');
  const tool = await page.locator('#p-mechanism-gear').getAttribute('transform'); await page.clock.runFor(5000);
  await expect(page.locator('#p-mechanism-gear')).toHaveAttribute('transform', tool!); await expect(page.locator('#p-count')).toHaveText('01');
});
test('change paper and restore preserve partial progress, color and survive reload', async ({ page }) => {
  await open(page); await circle(page); const old = await page.locator('#p-mechanism-gear').getAttribute('transform');
  const paper = await page.locator('#p-paper-name').textContent();
  await page.locator('#p-new').click(); await expect(page.locator('#p-count')).toHaveText('00');
  await expect(page.locator('#p-paper-name')).not.toHaveText(paper!);
  await page.locator('#p-restore').click(); await expect(page.locator('#p-count')).toHaveText('01');
  await expect(page.locator('#p-paper-name')).toHaveText(paper!); await expect(page.locator('#p-mechanism-gear')).toHaveAttribute('transform', old!);
  await page.locator('#p-back').click(); await page.waitForTimeout(150); await page.reload(); await page.locator('#enter-play').click();
  await expect(page.locator('#p-count')).toHaveText('01'); await expect(page.locator('#p-mechanism-gear')).toHaveAttribute('transform', old!);
});
test('rapid next, paper and mode actions cancel scheduled work', async ({ page }) => {
  await open(page); await circle(page); await page.clock.install();
  await page.locator('#p-next').evaluate((el: HTMLButtonElement) => { for (let i = 0; i < 10; i++) el.click(); });
  await page.locator('#p-new').evaluate((el: HTMLButtonElement) => { for (let i = 0; i < 10; i++) el.click(); });
  await page.locator('#p-back').click(); await page.clock.runFor(5000); await expect(page.locator('#app')).toBeVisible();
  await page.locator('#enter-play').click(); await expect(page.locator('#p-count')).toHaveText('00');
  await expect(page.locator('#p-auto')).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator('#p-paper-name')).toContainText('LEMON');
  await page.locator('#p-restore').click(); await expect(page.locator('#p-count')).toHaveText('01');
});
test('blur and pointer cancellation pause without losing progress', async ({ page }) => {
  await open(page); await page.locator('#p-auto').click(); await page.waitForTimeout(180);
  await page.evaluate(() => dispatchEvent(new Event('blur'))); await expect(page.locator('#p-auto')).toHaveAttribute('aria-pressed', 'false');
  const old = await page.locator('#p-mechanism-gear').getAttribute('transform'); await page.waitForTimeout(200);
  await expect(page.locator('#p-mechanism-gear')).toHaveAttribute('transform', old!);
  const box = (await page.locator('#p-mechanism').boundingBox())!;
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .5); await page.mouse.down();
  await page.locator('#p-mechanism').dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  await expect(page.locator('#play-root')).toHaveAttribute('data-phase', 'paused');
});
test('all six papers, touch targets, resize, keyboard and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  const colors = new Set<string>();
  for (let i = 0; i < 6; i++) { colors.add(await page.locator('#p-paper').evaluate(el => getComputedStyle(el).backgroundColor)); await page.locator('#p-new').click(); await expect(page.locator('#play-root')).toHaveAttribute('data-phase', 'ready'); }
  expect(colors.size).toBe(6);
  for (const [width, height] of [[360,640],[390,844],[768,1024],[844,390],[1440,900]]) {
    await page.setViewportSize({ width, height });
    for (const selector of ['#p-paper', '#p-back', '#p-next', '#p-new', '#p-auto', '#p-restore', '#p-save']) {
      const b = (await page.locator(selector).boundingBox())!;
      expect(b.x, selector).toBeGreaterThanOrEqual(-1); expect(b.y, selector).toBeGreaterThanOrEqual(-1);
      expect(b.x + b.width, selector).toBeLessThanOrEqual(width + 1); expect(b.y + b.height, selector).toBeLessThanOrEqual(height + 1);
      if (selector !== '#p-paper') expect(b.height, selector).toBeGreaterThanOrEqual(44);
    }
  }
  await page.locator('#p-mechanism').focus(); await page.keyboard.press('ArrowRight'); await expect(page.locator('#p-count')).toHaveText('01');
  await expect(page.locator('#p-mechanism')).toHaveCSS('user-select', 'none');
});
test('mobile touch circle and cancellation never scroll the paper', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await context.newPage();
  await open(page); const box = (await page.locator('#p-paper').boundingBox())!, cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx + 85, y: cy }] });
  for (let i = 1; i <= 30; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + 85 * Math.cos(i / 5), y: cy + 85 * Math.sin(i / 5) }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('#p-count')).toHaveText('01'); await expect(page.locator('#play-root')).toHaveAttribute('data-phase', 'paused');
  expect(await page.locator('#p-paper').boundingBox()).toEqual(box); expect(await page.evaluate(() => getSelection()?.toString())).toBe('');
  await context.close();
});
test('unavailable storage keeps session restore working and reports the limitation', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw new Error('disabled'); } }));
  await open(page); await circle(page); await page.locator('#p-new').click(); await page.locator('#p-restore').click();
  await expect(page.locator('#p-count')).toHaveText('01'); await expect(page.locator('#p-storage-note')).toContainText('暫存不可用');
});
test('PNG download uses shared renderer and selected colored paper', async ({ page }) => {
  await open(page); await page.locator('#p-new').click(); await expect(page.locator('#play-root')).toHaveAttribute('data-phase', 'ready');
  await page.locator('#p-mechanism').focus(); await page.keyboard.press('ArrowRight');
  const pending = page.waitForEvent('download'); await page.locator('#p-save').click(); const file = await pending;
  const bytes = await readFile((await file.path())!); expect(bytes.readUInt32BE(16)).toBe(3200); expect(bytes.readUInt32BE(20)).toBe(3200);
  const color = await page.evaluate(async data => { const blob = await fetch(`data:image/png;base64,${data}`).then(r => r.blob()); const image = await createImageBitmap(blob); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const c = canvas.getContext('2d')!; c.drawImage(image, 0, 0); return Array.from(c.getImageData(0,0,1,1).data); }, bytes.toString('base64'));
  expect(color).toEqual([239,228,174,255]);
});
