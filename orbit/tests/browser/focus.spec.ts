import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function fallback(page: Page): Promise<void> {
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false }));
  await page.goto('/'); await page.evaluate(() => document.fonts.ready);
}
test('fullscreen fallback locks scroll, preserves ink, restores position and focus', async ({ page }) => {
  await fallback(page);
  await page.locator('#mechanism').focus(); await page.keyboard.press('Shift+ArrowRight');
  const transform = await page.locator('#moving-gear').getAttribute('transform');
  await page.locator('#focus-toggle').scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => scrollY);
  await page.locator('#focus-toggle').click();
  await expect(page.locator('.atelier')).toHaveClass(/is-focused/);
  await expect(page.locator('#moving-gear')).toHaveAttribute('transform', transform!);
  const box = await page.locator('#paper').boundingBox();
  await page.mouse.move(20, 100); await page.mouse.wheel(0, 1000);
  await page.keyboard.press('PageDown');
  expect(await page.locator('#paper').boundingBox()).toEqual(box);
  expect(await page.locator('body').evaluate(el => getComputedStyle(el).position)).toBe('fixed');
  await page.locator('#export-button').click(); await page.keyboard.press('Escape');
  await expect(page.locator('.atelier')).toHaveClass(/is-focused/);
  await page.keyboard.press('Escape'); await expect(page.locator('.atelier')).not.toHaveClass(/is-focused/);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await expect(page.locator('#focus-toggle')).toBeFocused();
  await expect(page.locator('#stroke-count')).toHaveText('02 STROKES');
});
test('native fullscreen exits cleanly and rejected requests retain the fallback', async ({ page }) => {
  await page.goto('/'); await page.locator('#focus-toggle').click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator('.atelier')).not.toHaveClass(/is-focused/);
  await page.evaluate(() => { document.documentElement.requestFullscreen = () => Promise.reject(new Error('Not allowed')); });
  await page.locator('#focus-toggle').click();
  await expect(page.locator('.atelier')).toHaveClass(/is-focused/);
  await page.locator('#focus-toggle').click(); await expect(page.locator('body')).not.toHaveCSS('position', 'fixed');
});
test('focus controls fit portrait, landscape, desktop and orientation changes', async ({ page }) => {
  await fallback(page); await page.locator('#focus-toggle').click();
  for (const [width, height] of [[360,800], [390,844], [844,390], [800,360], [768,1024], [1440,900]]) {
    await page.setViewportSize({ width, height });
    for (const selector of ['#paper', '#focus-toggle', '#contrast-toggle', '#draw-button', '#speed', '#undo', '#export-button']) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(0); expect(box.y, selector).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, selector).toBeLessThanOrEqual(width + 1);
      expect(box.y + box.height, selector).toBeLessThanOrEqual(height + 1);
    }
    await page.screenshot({ path: `qa/focus-${width}x${height}.png` });
  }
});
test('touch circles and swipes cannot move the fullscreen drawing surface', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage(); await fallback(page); await page.locator('#focus-toggle').tap();
  const paper = (await page.locator('#paper').boundingBox())!, cx = paper.x + paper.width / 2, cy = paper.y + paper.height / 2;
  const client = await context.newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy - 90 }] });
  for (let i = 1; i <= 30; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + 90 * Math.sin(i / 30 * 6), y: cy - 90 * Math.cos(i / 30 * 6) }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#stroke-count')).toHaveText('02 STROKES');
  expect(await page.locator('#paper').boundingBox()).toEqual(paper);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 12, y: 580 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 12, y: 180 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.locator('#paper').boundingBox()).toEqual(paper);
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('');
  await context.close();
});
test('contrast persists, strengthens rendered ink, and preserves export colors', async ({ page }) => {
  await page.goto('/');
  const before = await page.locator('#completed-canvas').evaluate((el: HTMLCanvasElement) => el.toDataURL());
  await page.locator('#contrast-toggle').click();
  await expect(page.locator('html')).toHaveClass(/high-contrast/);
  expect(await page.locator('#completed-canvas').evaluate((el: HTMLCanvasElement) => el.toDataURL())).not.toBe(before);
  await page.locator('#export-button').click();
  const pending = page.waitForEvent('download'); await page.locator('#save-svg').click();
  const saved = await pending, svg = await readFile((await saved.path())!, 'utf8');
  expect(svg).toContain('stroke="#234f68"'); expect(svg).not.toContain('#103d5b');
  await page.reload(); await expect(page.locator('#contrast-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#focus-toggle').click();
  await page.screenshot({ path: 'qa/focus-high-contrast.png' });
  await page.locator('#contrast-toggle').click(); await expect(page.locator('html')).not.toHaveClass(/high-contrast/);
});
test('10x and 20x close correctly, hide the spinning gear, and restore it on pause', async ({ page }) => {
  await page.goto('/');
  for (const speed of ['10', '20']) {
    await page.locator('#speed').selectOption(speed); await page.locator('#quick-draw').click();
    await expect(page.locator('#moving-gear')).toHaveCSS('opacity', '0');
    await page.locator('#quick-draw').click(); await expect(page.locator('#moving-gear')).toHaveCSS('opacity', '1');
    await page.locator('#quick-draw').click();
    await expect(page.locator('#progress-text')).toHaveText('100%', { timeout: 8000 });
    await expect(page.locator('#moving-gear')).toHaveCSS('opacity', '1');
  }
  await expect(page.locator('#stroke-count')).toHaveText('03 STROKES');
});
test('selection suppression is limited to the interactive table', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#mechanism')).toHaveCSS('user-select', 'none');
  await expect(page.locator('.gear-collection')).toHaveCSS('user-select', 'none');
  expect(await page.locator('h1').evaluate(el => getComputedStyle(el).userSelect)).not.toBe('none');
});
