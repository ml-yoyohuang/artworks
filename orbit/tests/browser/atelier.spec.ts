import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const qa = process.env.ORBIT_QA_DIR || 'qa';
const fresh = async (page: Page) => {
  await page.locator('#new-paper').click(); await page.locator('#confirm-clear').click();
};
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => document.fonts.ready); });
test('six viewport layouts and initial composition have no overflow', async ({ page }) => {
  for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1280, 800], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('#draw-button')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const paper = await page.locator('#paper').boundingBox();
    expect(Math.abs(paper!.width - paper!.height)).toBeLessThan(1);
    await page.screenshot({ path: `${qa}/viewport-${width}.png`, fullPage: true });
  }
});
test('auto draw pause resume speed completion and layered artwork', async ({ page }) => {
  await fresh(page);
  await page.locator('[data-gear="48"]').click();
  await page.locator('#speed').selectOption('4');
  await page.locator('#draw-button').click();
  await expect(page.locator('#progress-text')).not.toHaveText('00%');
  await page.locator('#draw-button').click();
  const paused = await page.locator('#progress-text').textContent();
  await page.waitForTimeout(200); await expect(page.locator('#progress-text')).toHaveText(paused!);
  await expect(page.locator('#toast')).not.toHaveClass(/visible/);
  await page.screenshot({ path: `${qa}/desktop-drawing.png`, fullPage: true });
  await page.locator('#draw-button').click();
  await expect(page.locator('#progress-text')).toHaveText('100%', { timeout: 10000 });
  await expect(page.locator('#toast')).not.toHaveClass(/visible/);
  await page.screenshot({ path: `${qa}/desktop-complete.png`, fullPage: true });
  await page.locator('[data-gear="52"]').click();
  await page.locator('[data-ink="1"]').click();
  await page.locator('[data-hole-choice="3"]').click();
  await page.locator('#draw-button').click();
  await expect(page.locator('#progress-text')).toHaveText('100%', { timeout: 18000 });
  await expect(page.locator('#stroke-count')).toHaveText('02 STROKES');
  await page.locator('#tools-toggle').click();
  await expect(page.locator('#toast')).not.toHaveClass(/visible/);
  await page.screenshot({ path: `${qa}/desktop-layered.png`, fullPage: true });
});
test('manual drag forward/reverse and switching to auto retains position', async ({ page }) => {
  await fresh(page); await page.locator('[data-mode="manual"]').click();
  await page.locator('#mechanism').scrollIntoViewIfNeeded();
  const box = (await page.locator('#mechanism').boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, r = box.width * .30;
  await page.mouse.move(cx, cy - r); await page.mouse.down();
  for (let i = 0; i <= 36; i++) await page.mouse.move(cx + r * Math.sin(i / 36 * Math.PI), cy - r * Math.cos(i / 36 * Math.PI));
  for (let i = 36; i >= 20; i--) await page.mouse.move(cx + r * Math.sin(i / 36 * Math.PI), cy - r * Math.cos(i / 36 * Math.PI));
  await page.mouse.up();
  await expect(page.locator('#stroke-count')).toHaveText('01 STROKES');
  const before = await page.locator('#moving-gear').getAttribute('transform');
  await page.locator('[data-mode="auto"]').click();
  await expect(page.locator('#moving-gear')).toHaveAttribute('transform', before!);
  await page.locator('#draw-button').click();
  await expect(page.locator('#moving-gear')).not.toHaveAttribute('transform', before!);
});
test('unfinished undo redo, keyboard, new branch, clear confirmation', async ({ page }) => {
  await fresh(page); await page.locator('#mechanism').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowRight');
  const before = await page.locator('#moving-gear').getAttribute('transform');
  await page.keyboard.press('Control+z'); await expect(page.locator('#stroke-count')).toHaveText('00 STROKES');
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('#moving-gear')).toHaveAttribute('transform', before!);
  await page.locator('#undo').click(); await page.locator('#mechanism').focus(); await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#redo')).toBeDisabled();
  await page.locator('#clear').click(); await page.locator('#cancel-clear').click();
  await expect(page.locator('#stroke-count')).toHaveText('01 STROKES');
  await page.locator('#clear').click(); await page.locator('#confirm-clear').click();
  await expect(page.locator('#export-button')).toBeDisabled(); await expect(page.locator('#redo')).toBeDisabled();
});
test('all instrument controls, stop, hidden tools, and dialogs', async ({ page }) => {
  await page.locator('#ring-select').selectOption('144');
  for (const gear of [36, 45, 48, 52, 63, 72]) {
    await page.locator(`[data-gear="${gear}"]`).click();
    await expect(page.locator(`[data-gear="${gear}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
  for (let i = 0; i < 5; i++) await page.locator(`[data-hole-choice="${i}"]`).click();
  for (let i = 0; i < 6; i++) await page.locator(`[data-ink="${i}"]`).click();
  await expect(page.locator('#ink-name')).toHaveText('炭黑');
  await page.locator('#draw-button').click();
  await expect(page.locator('#progress-text')).not.toHaveText('00%');
  await page.locator('#stop-button').click(); await expect(page.locator('#progress-text')).toHaveText('00%');
  await page.locator('#tools-toggle').click(); await expect(page.locator('#mechanism')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('#about-button').click(); await expect(page.locator('#about-dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#about-dialog')).not.toBeVisible();
});
test('PNG has 3200px output and SVG contains vector paths without tools', async ({ page }) => {
  await page.locator('#mechanism').focus(); await page.keyboard.press('Shift+ArrowRight');
  for (const format of ['svg', 'png']) {
    await page.locator('#export-button').click(); await page.locator('#include-paper').uncheck();
    const pending = page.waitForEvent('download'); await page.locator(`#save-${format}`).click();
    const download = await pending; const file = (await download.path())!;
    expect(download.suggestedFilename()).toMatch(new RegExp(`^orbit-\\d{4}-\\d{2}-\\d{2}-\\d{3}\\.${format}$`));
    const bytes = await readFile(file);
    if (format === 'svg') {
      const svg = bytes.toString(); expect(svg).toContain('<path'); expect(svg).not.toContain('<image');
      expect(svg).not.toContain('<rect'); expect(svg).not.toContain('moving-gear');
      expect((svg.match(/<path /g) || []).length).toBe(2);
    } else { expect(bytes.readUInt32BE(16)).toBe(3200); expect(bytes.readUInt32BE(20)).toBe(3200); }
  }
});
test('touch drawing, mobile controls and reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, reducedMotion: 'reduce' });
  const page = await context.newPage(); await page.goto('/'); await fresh(page);
  await page.locator('#mechanism').scrollIntoViewIfNeeded();
  const box = (await page.locator('#mechanism').boundingBox())!;
  const client = await context.newCDPSession(page);
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, r = box.width * .28;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy - r }] });
  for (let i = 1; i <= 20; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + r * Math.sin(i / 20 * 2), y: cy - r * Math.cos(i / 20 * 2) }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#stroke-count')).toHaveText('01 STROKES');
  await expect(page.locator('#toast')).not.toHaveClass(/visible/);
  await page.screenshot({ path: `${qa}/mobile-drawing.png`, fullPage: true });
  await page.locator('[data-gear="63"]').tap(); await page.locator('[data-hole-choice="1"]').tap();
  await expect(page.locator('[data-gear="63"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#toast')).not.toHaveClass(/visible/);
  await page.screenshot({ path: `${qa}/mobile-tools.png`, fullPage: true });
  expect(await page.locator('body').evaluate(el => getComputedStyle(el).touchAction)).not.toBe('none');
  await context.close();
});
test('resize redraw, focus loss pauses, no page errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.locator('#draw-button').click(); await expect(page.locator('#progress-text')).not.toHaveText('00%');
  const before = await page.locator('#completed-canvas').evaluate((el: HTMLCanvasElement) => el.toDataURL());
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.locator('#completed-canvas').evaluate((el: HTMLCanvasElement) => el.toDataURL())).not.toBe(before);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#play-label')).toHaveText('繼續繪製'); expect(errors).toEqual([]);
});
test('direct pen holes, rapid toggles, and dialog focus', async ({ page }) => {
  await page.locator('#mechanism [data-hole="0"]').click();
  await expect(page.locator('[data-hole-choice="0"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#quick-draw').click(); await page.locator('#quick-draw').click();
  await page.locator('#quick-draw').click(); await page.locator('#quick-draw').click();
  await expect(page.locator('#play-label')).toHaveText('繼續繪製');
  await page.locator('#export-button').click();
  const dialog = await page.locator('#export-dialog').boundingBox();
  expect(dialog!.x).toBeGreaterThanOrEqual(0); expect(dialog!.y).toBeGreaterThanOrEqual(0);
  await expect(page.locator('#export-dialog .dialog-close')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#export-button')).toBeFocused();
});
