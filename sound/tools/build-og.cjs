// Standalone 1200×630 social covers; no server, external font or audio required.
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),items=JSON.parse(fs.readFileSync(path.join(__dirname,'og-manifest.json')));
const output=path.join(root,'assets/og');fs.mkdirSync(output,{recursive:true});
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thumb=slug=>'data:image/webp;base64,'+fs.readFileSync(path.join(root,'thumbs',slug+'.webp')).toString('base64');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.goto(pathToFileURL(path.join(root,'jelly-face-lab.html')).href,{waitUntil:'domcontentloaded'});
 const lab='data:image/png;base64,'+(await page.locator('.portraits').screenshot()).toString('base64');
 for(const item of items){const catalog=item.slug==='index',study=item.slug==='jelly-face-lab';
  const art=catalog?`<div class="collage">${['jelly-wave','ribbon-dance','flower-choir','bubble-scale'].map(slug=>`<img src="${thumb(slug)}" alt="">`).join('')}</div>`:`<img class="art" src="${study?lab:thumb(item.slug)}" alt="">`;
  const heading=catalog?'小小聲音<br>遊樂場':study?'果凍表情<br>工作室':escape(item.title);
  await page.setContent(`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#f6f1e7;color:#303d36;font-family:"Avenir Next","PingFang TC",sans-serif}.copy{position:absolute;left:54px;top:52px;bottom:44px;width:335px;display:flex;flex-direction:column}.kicker{font-size:12px;letter-spacing:.12em;color:${item.accent||'#d96950'}}h1{font-family:"Songti TC","Noto Serif CJK TC",serif;font-weight:500;font-size:${catalog?67:46}px;line-height:1.3;letter-spacing:.015em;margin:36px 0 18px}.en{font-size:14px;letter-spacing:.025em;opacity:.55}.description{font-size:17px;line-height:1.9;margin-top:30px}.bottom{margin-top:auto;border-top:1px solid #303d3627;padding-top:17px;font-size:12px;letter-spacing:.06em;line-height:1.8}.visual{position:absolute;left:432px;right:36px;top:56px;bottom:56px;display:flex;align-items:center}.art{width:100%;height:auto;border-radius:12px}.collage{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%}.collage img{width:100%;border-radius:9px}.number{font-size:24px;color:${item.accent||'#d96950'};margin-bottom:4px}
  </style><div class="copy"><div class="kicker">SOUND, SHAPE &amp; A LITTLE JOY</div><h1>${heading}</h1><div class="en">${escape(item.en||'Sound · Waveform · Rhythm')}</div><p class="description">${escape(item.description)}</p><div class="bottom">${item.number?`<div class="number">${String(item.number).padStart(2,'0')} / 16</div>${escape(item.group)}<br>`:''}小小聲音遊樂場 / ${catalog?'16 WORKS · 04 ROOMS':study?'FACE STUDY':'LIVE GENERATIVE ART'}</div></div><div class="visual">${art}</div></html>`);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.screenshot({path:path.join(output,item.slug+'.jpg'),type:'jpeg',quality:92});console.log('OG '+item.slug);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
