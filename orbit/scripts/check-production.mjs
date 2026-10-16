import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Serve only compiled files at the real Pages subpath, without Vite transforms
// or SPA fallbacks that could hide missing assets and absolute-path mistakes.
const prefix = '/artworks/orbit/';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(root, pathname.slice(prefix.length) || 'index.html');
    if (!pathname.startsWith(prefix) || !path.startsWith(resolve(root) + sep)) {
      response.writeHead(404).end(); return;
    }
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }).end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  const localURL = `http://127.0.0.1:${server.address().port}${prefix}`;
  const url = process.env.ORBIT_CHECK_URL || localURL;
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  assert.match(await page.title(), /ORBIT/);
  await page.locator('#paper').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => Array.from(document.fonts).some(font => font.status === 'loaded')), 'Bundled fonts load');
  assert.ok(await page.locator('#completed-canvas').evaluate(canvas => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((value, index) => index % 4 === 3 && value > 0);
  }), 'Opening artwork is painted');
  await page.locator('#speed').selectOption('20');
  await page.locator('#draw-button').click();
  await page.waitForFunction(() => document.querySelector('.progress-track').getAttribute('aria-valuenow') !== '0');
  await page.locator('#draw-button').click();
  await page.locator('#contrast-toggle').click();
  assert.equal(await page.locator('#contrast-toggle').getAttribute('aria-pressed'), 'true');
  await page.locator('#focus-toggle').click();
  assert.match(await page.locator('.atelier').getAttribute('class'), /is-focused/);
  assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).position), 'fixed');
  await page.locator('#focus-toggle').click();
  await page.locator('#enter-studio').click();
  await page.locator('#s-art svg').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.s-artworks article').count(), 18, 'Studio lazy chunk and collection load from the subpath');
  await page.locator('[data-lab="geometry"]').click();
  await page.locator('[data-action="family:epi"]').click();
  await page.locator('#back-classic').click();
  await page.locator('#paper').waitFor({ state: 'visible' });
  assert.deepEqual(errors, [], 'No runtime errors or failed resources');
  console.log(`PASS: Classic and Studio production chunks, fonts, artwork, drawing, contrast and fullscreen at ${url}`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
