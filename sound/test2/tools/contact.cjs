// 開發用：把多張截圖排成一張對照表。node contact.cjs <out.png> <cols> <width> img...
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
(async () => {
  const [out, cols, width, ...imgs] = process.argv.slice(2);
  const cells = imgs.map(f => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${f.split('/').pop()}</figcaption></figure>`).join('');
  const html = `<style>body{margin:0;background:#222;color:#ccc;font:12px sans-serif;display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:6px}figure{margin:0}img{width:100%;display:block}</style>${cells}`;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +width, height: 400 } });
  await p.setContent(html); await p.screenshot({ path: out, fullPage: true }); await b.close();
})();
