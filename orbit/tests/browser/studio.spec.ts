import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { ARTWORKS } from '../../src/studio/presets';

test.beforeEach(async ({ page }) => { await page.goto('/'); await page.locator('#enter-studio').click(); await expect(page.locator('#s-art svg')).toBeVisible(); });
test('Studio starts with a real artwork, all six labs preserve the document, Classic stays intact', async ({ page }) => {
  const title = await page.locator('#s-title').inputValue(); const curve = await page.locator('#s-art [data-object] path').first().getAttribute('d');
  await expect(page.locator('.s-artworks article')).toHaveCount(18);
  for (const lab of ['geometry', 'ink', 'motion', 'print', 'compose', 'discover']) {
    await page.locator(`[data-lab="${lab}"]`).click(); await expect(page.locator('#s-title')).toHaveValue(title);
    expect(await page.locator('#s-art [data-object] path').first().getAttribute('d')).toBe(curve);
  }
  await page.locator('#back-classic').click(); await expect(page.locator('#stroke-count')).toHaveText('01 STROKES');
  await page.locator('#mechanism').focus(); await page.keyboard.press('Shift+ArrowRight');
  const transform = await page.locator('#moving-gear').getAttribute('transform');
  await page.locator('#enter-studio').click(); await page.locator('#s-art').focus(); await page.keyboard.press('Control+z');
  await page.locator('#back-classic').click(); expect(await page.locator('#moving-gear').getAttribute('transform')).toBe(transform);
  await expect(page.locator('#stroke-count')).toHaveText('02 STROKES');
});
test('Classic transfer preserves partial and reversed strokes as editable composition objects', async ({ page }) => {
  await page.locator('#back-classic').click(); await page.locator('#mechanism').focus(); await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('ArrowLeft');
  await page.locator('#classic-to-studio').click(); await page.locator('[data-lab="compose"]').click();
  await expect(page.locator('.s-layer')).toHaveCount(2); await expect(page.locator('#s-art-meta')).toContainText('760 × 760');
  await page.locator('[data-action="duplicate"]').click(); await expect(page.locator('.s-layer')).toHaveCount(3);
  await page.locator('#back-classic').click(); await expect(page.locator('#stroke-count')).toHaveText('02 STROKES');
});
test('geometry family changes redraw, bad radius is rejected, undo restores exact curve', async ({ page }) => {
  await page.locator('[data-lab="geometry"]').click();
  const before = await page.locator('#s-art [data-object] path').first().getAttribute('d');
  await page.locator('[data-action="family:epi"]').click(); expect(await page.locator('#s-art [data-object] path').first().getAttribute('d')).not.toBe(before);
  await page.locator('#s-undo').click(); expect(await page.locator('#s-art [data-object] path').first().getAttribute('d')).toBe(before);
  await page.locator('summary').filter({ hasText: '深入幾何參數' }).click();
  await page.getByLabel('滾動半徑 / 齒數比例', { exact: true }).fill('120'); await page.getByLabel('滾動半徑 / 齒數比例', { exact: true }).press('Tab');
  await expect(page.locator('#s-status')).toContainText('安全範圍'); expect(await page.locator('#s-art [data-object] path').first().getAttribute('d')).toBe(before);
});
test('all six brushes and five papers draw without runtime errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.locator('[data-lab="ink"]').click();
  const fingerprints = new Set<string>();
  for (const index of [0, 3, 6, 9, 12, 15]) { await page.locator('#s-ink-preset').selectOption(String(index)); fingerprints.add(await page.locator('#s-art').innerHTML()); }
  expect(fingerprints.size).toBe(6);
  await page.locator('[data-lab="print"]').click();
  for (const kind of ['cotton', 'washi', 'riso', 'screen', 'emboss']) { await page.locator(`[data-action="paper:${kind}"]`).click(); await expect(page.locator('#s-art svg')).toBeVisible(); }
  expect(errors).toEqual([]);
});
test('motion play pause scrub restart and reduced motion are deterministic', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-lab="motion"]').click(); await page.locator('#s-motion-preset').selectOption('4');
  await expect(page.locator('#s-time')).toHaveText('0.00s'); await page.locator('#s-play').click();
  await expect(page.locator('#s-time')).not.toHaveText('0.00s'); await page.locator('#s-play').click();
  const time = await page.locator('#s-time').textContent(); await page.waitForTimeout(120); await expect(page.locator('#s-time')).toHaveText(time!);
  await page.locator('#s-scrub').fill('5'); await page.locator('#s-scrub').dispatchEvent('change'); const svg = await page.locator('#s-art').innerHTML();
  await page.locator('#s-scrub').fill('7'); await page.locator('#s-scrub').fill('5'); await page.locator('#s-scrub').dispatchEvent('change'); expect(await page.locator('#s-art').innerHTML()).toBe(svg);
  await page.locator('[data-action="restart"]').click(); await expect(page.locator('#s-time')).toHaveText('0.00s');
});
test('composition duplicate lock hide transform reorder align text and delete support undo', async ({ page }) => {
  await page.locator('[data-lab="compose"]').click(); await expect(page.locator('.s-layer')).toHaveCount(3);
  await page.locator('[data-action="duplicate"]').click(); await expect(page.locator('.s-layer')).toHaveCount(4);
  await page.getByLabel('水平位置 X', { exact: true }).fill('200'); await page.getByLabel('水平位置 X', { exact: true }).press('Tab');
  expect(await page.locator('#s-art [data-object]').last().getAttribute('transform')).toContain('translate(200');
  await page.locator('.s-layer.selected [data-layer-action="lock"]').click(); await expect(page.getByLabel('水平位置 X', { exact: true })).toBeDisabled();
  await page.locator('[data-action="delete"]').click(); await expect(page.locator('.s-layer')).toHaveCount(4);
  await page.locator('.s-layer.selected [data-layer-action="lock"]').click(); await page.locator('.s-layer.selected [data-layer-action="visible"]').click();
  await expect(page.locator('#s-art [data-object]')).toHaveCount(3);
  await page.locator('[data-action="delete"]').click(); await expect(page.locator('.s-layer')).toHaveCount(3);
  await page.locator('[data-action="text"]').click(); await page.getByLabel('文字內容', { exact: true }).fill('A new annotation'); await page.getByLabel('文字內容', { exact: true }).press('Tab');
  await expect(page.locator('#s-art text').last()).toHaveText('A new annotation');
  await page.locator('#s-undo').click(); await expect(page.locator('#s-art text').last()).not.toHaveText('A new annotation');
});
test('saved library survives reload and JSON import is validated without losing the current work', async ({ page }) => {
  await page.locator('#s-title').fill('My saved geometry'); await page.locator('#s-title').press('Tab'); await page.locator('#s-save').click();
  await page.reload(); await page.locator('#enter-studio').click(); await page.locator('[data-action="library"]').click();
  await expect(page.getByLabel('收藏名稱')).toHaveValue('My saved geometry');
  await page.locator('[data-action^="saved-open:"]').click(); await expect(page.locator('#s-title')).toHaveValue('My saved geometry');
  await page.locator('#s-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":99}') });
  await expect(page.locator('#s-status')).toContainText('原作品未變更'); await expect(page.locator('#s-title')).toHaveValue('My saved geometry');
  await page.locator('#s-file').setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(ARTWORKS[3])) });
  await expect(page.locator('#s-title')).toHaveValue(ARTWORKS[3].title);
});
test('six variation candidates reproduce by seed, preview and apply without changing source', async ({ page }) => {
  await page.locator('[data-lab="discover"]').click(); await expect(page.locator('.s-artworks article')).toHaveCount(6);
  const first = await page.locator('.s-thumbnail').first().innerHTML(); await page.locator('[data-action="variations"]').click();
  expect(await page.locator('.s-thumbnail').first().innerHTML()).toBe(first);
  await page.locator('[data-preview="1"]').click(); await expect(page.locator('#s-dialog')).toBeVisible(); await page.locator('[data-action="apply-preview"]').click();
  await expect(page.locator('#s-title')).toHaveValue(/ · /); await page.locator('[data-action="original"]').click(); await expect(page.locator('#s-title')).toHaveValue(ARTWORKS[0].title);
});
test('exported SVG embeds fonts and PNG has the selected dimensions and real pixels', async ({ page }) => {
  await page.locator('[data-action="export"]').click();
  const svgEvent = page.waitForEvent('download'); await page.locator('[data-action="svg"]').click();
  const svg = await readFile(await (await svgEvent).path(), 'utf8');
  expect(svg).toContain('data:font/ttf;base64,'); expect(svg).toContain('viewBox="0 0 1000 1200"'); expect(svg).not.toContain('data-object');
  await page.locator('#s-export-scale').selectOption('1'); const pngEvent = page.waitForEvent('download'); await page.locator('[data-action="png"]').click();
  const png = await readFile(await (await pngEvent).path()); expect(png.readUInt32BE(16)).toBe(1000); expect(png.readUInt32BE(20)).toBe(1200); expect(png.byteLength).toBeGreaterThan(20000);
});
test('desktop and mobile Studio layouts keep canvas and main controls inside viewport', async ({ page }) => {
  for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    for (const lab of ['home', 'geometry', 'compose', 'discover']) {
      await page.locator(`[data-lab="${lab}"]`).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const box = await page.locator('#s-art').boundingBox(); expect(box!.width).toBeGreaterThan(250); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
  }
});

test('library rename duplicate delete and JSON download retain valid independent artworks', async ({ page }) => {
  await page.locator('#s-save').click(); await page.locator('[data-action="library"]').click();
  await page.getByLabel('收藏名稱').fill('Library original'); await page.locator('[data-action^="saved-rename:"]').click();
  await expect(page.getByLabel('收藏名稱')).toHaveValue('Library original'); await page.locator('[data-action^="saved-copy:"]').click();
  await expect(page.locator('.s-saved')).toHaveCount(2);
  page.once('dialog', dialog => dialog.accept()); await page.locator('[data-action^="saved-remove:"]').last().click();
  await expect(page.locator('.s-saved')).toHaveCount(1);
  const downloadEvent = page.waitForEvent('download'); await page.locator('[data-action="json"]').click();
  const json = JSON.parse(await readFile(await (await downloadEvent).path(), 'utf8')); expect(json.schemaVersion).toBe(2); expect(json.objects.length).toBe(3);
});

test('keyboard range edits retain focus and mobile preview stays visible while editing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.locator('[data-lab="geometry"]').click();
  const input = page.getByLabel('筆孔偏移', { exact: true }); await input.focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(input).toHaveValue('45'); await expect(input).toBeFocused();
  await input.scrollIntoViewIfNeeded();
  const preview = await page.locator('#s-art').boundingBox(); expect(preview!.y).toBeGreaterThanOrEqual(0); expect(preview!.y + preview!.height).toBeLessThan(844);
  await page.locator('[data-lab="compose"]').click(); await page.locator('summary').filter({ hasText: '對齊與畫布' }).click();
  await page.locator('[data-action="align:center"]').click(); await expect(page.getByLabel('水平位置 X', { exact: true })).toHaveValue('500');
  await expect(page.getByLabel('垂直位置 Y', { exact: true })).toHaveValue('600');
  await page.locator('#s-board').selectOption('1000,1414'); await expect(page.locator('#s-art-meta')).toContainText('1000 × 1414');
});
