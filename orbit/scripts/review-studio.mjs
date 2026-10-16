import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('qa/phase-02/review', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  if (!process.argv.includes('--performance-only')) {
  await page.goto('http://127.0.0.1:5174/'); await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'qa/phase-02/review/classic.png', fullPage: true });
  await page.locator('#enter-studio').click(); await page.locator('#s-art svg').waitFor(); await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'qa/phase-02/review/studio-home.png', fullPage: true });
  const artwork = [0, 2, 16, 14, 8, 3];
  const labs = ['geometry', 'ink', 'motion', 'print', 'compose', 'discover'];
  for (let i = 0; i < labs.length; i++) {
    const lab = labs[i]; await page.locator('[data-lab="home"]').click(); await page.locator(`[data-apply="${artwork[i]}"]`).click();
    await page.locator(`[data-lab="${lab}"]`).click(); await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `qa/phase-02/review/${lab}-default.png`, fullPage: true });
    if (lab === 'geometry') await page.locator('[data-action="geometry:11"]').click();
    if (lab === 'ink') await page.locator('#s-ink-preset').selectOption('7');
    if (lab === 'motion') { await page.locator('#s-motion-preset').selectOption('6'); await page.locator('#s-scrub').fill('5.3'); await page.locator('#s-scrub').dispatchEvent('change'); }
    if (lab === 'print') { await page.locator('[data-action="paper:washi"]').click(); await page.locator('input[data-key="grain"]').fill('0.65'); await page.locator('input[data-key="grain"]').dispatchEvent('change'); }
    if (lab === 'compose') { await page.getByLabel('旋轉角度', { exact: true }).fill('32'); await page.getByLabel('旋轉角度', { exact: true }).dispatchEvent('change'); }
    if (lab === 'discover') { await page.locator('#s-strength').selectOption('0.9'); await page.locator('[data-action="variations"]').click(); await page.locator('[data-apply="2"]').click(); }
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `qa/phase-02/review/${lab}-adjusted.png`, fullPage: true });
    if (lab === 'compose') await page.locator('[data-lab="home"]').click();
    await page.locator('#s-art').screenshot({ path: `qa/phase-02/review/${lab}-artwork.png` });
  }
  await page.locator('[data-lab="home"]').click(); await page.locator('[data-apply="0"]').click();
  for (const [width, height] of [[360,800],[390,844],[768,1024],[844,390]]) {
    await page.setViewportSize({ width, height }); await page.locator('[data-lab="geometry"]').click();
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `qa/phase-02/review/mobile-${width}.png`, fullPage: true });
  }
  }
  await page.close();
  const results = [];
  for (const [width, height, index] of [[1440,900,0],[390,844,0],[1440,900,16],[390,844,16]]) {
    const deviceScaleFactor = width < 500 ? 3 : 1;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5174/'); await page.locator('#enter-studio').click();
    await page.locator(`[data-apply="${index}"]`).click(); await page.locator('[data-lab="motion"]').click();
    await page.locator('#s-motion-preset').selectOption(index === 16 ? '5' : '0'); await page.locator('#s-play').click();
    const timing = await page.evaluate(() => new Promise(resolve => {
      const deltas = []; let before; let changes = 0;
      const observer = new MutationObserver(() => changes++); observer.observe(document.querySelector('#s-art'), { childList: true });
      const tick = now => { if (before) deltas.push(now - before); before = now; if (deltas.length < 120) requestAnimationFrame(tick); else { observer.disconnect(); const sorted = [...deltas].sort((a,b) => a-b); resolve({ medianMs: sorted[60], p95Ms: sorted[114], framesOver33ms: deltas.filter(d => d > 33.4).length, previewUpdates: changes, elapsedMs: deltas.reduce((a,b) => a+b, 0) }); } }; requestAnimationFrame(tick);
    }));
    results.push({ width, height, deviceScaleFactor, artwork: index, ...timing }); await page.locator('#s-play').click(); await page.close();
  }
  await writeFile('qa/phase-02/review/performance.json', JSON.stringify({ environment: 'Local headless Chromium; viewport emulation, not physical mobile hardware', results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }));
} finally { await browser.close(); }
